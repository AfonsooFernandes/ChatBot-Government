from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import docx
import logging
from fuzzywuzzy import fuzz

# ---------- MÓDULO SIMULADO PARA FAISS/RAG ----------
def obter_resposta_rag(pergunta, modo="faiss"):
    if modo == "faiss":
        return f"🔍 Resposta FAISS para: '{pergunta}'"
    elif modo == "rag":
        return f"🧠 Resposta RAG (fallback) para: '{pergunta}'"
    return "❓ Fonte desconhecida"

# ---------- LOGGING ----------
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
CORS(app)

# ---------- CONEXÃO À BASE DE DADOS ----------
try:
    conn = psycopg2.connect(
        host="localhost",
        port="5433",
        dbname="AI4Governance",
        user="postgres",
        password="29344"
    )
    cur = conn.cursor()
except Exception as e:
    print("❌ Erro ao conectar à base de dados:", e)
    raise

# ---------- FUNÇÃO DE SIMILARIDADE ----------
def obter_faq_mais_semelhante(pergunta_utilizador):
    cur.execute("SELECT pergunta, resposta FROM FAQ")
    faqs = cur.fetchall()

    melhor_pergunta = None
    melhor_resposta = None
    maior_score = 0

    for pergunta, resposta in faqs:
        score_token = fuzz.token_sort_ratio(pergunta_utilizador.lower(), pergunta.lower())
        score_partial = fuzz.partial_ratio(pergunta_utilizador.lower(), pergunta.lower())
        score = (score_token + score_partial) / 2

        if score > maior_score:
            maior_score = score
            melhor_pergunta = pergunta
            melhor_resposta = resposta

    print(f"➡️ Melhor correspondência: '{melhor_pergunta}' (score: {maior_score})")

    if maior_score >= 55:
        return {"pergunta": melhor_pergunta, "resposta": melhor_resposta, "score": maior_score}
    else:
        return None

# ---------- ROTAS ----------
@app.route("/categorias", methods=["GET"])
def get_categorias():
    try:
        cur.execute("SELECT categoria_id, nome FROM Categoria")
        data = cur.fetchall()
        return jsonify([{"categoria_id": c[0], "nome": c[1]} for c in data])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/chatbots", methods=["GET"])
def get_chatbots():
    try:
        cur.execute("SELECT chatbot_id, nome, descricao FROM Chatbot")
        data = cur.fetchall()
        return jsonify([
            {"chatbot_id": row[0], "nome": row[1], "descricao": row[2]} for row in data
        ])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/fonte/<int:chatbot_id>", methods=["GET"])
def obter_fonte_chatbot(chatbot_id):
    try:
        cur.execute("SELECT descricao FROM Chatbot WHERE chatbot_id = %s", (chatbot_id,))
        row = cur.fetchone()
        if row:
            return jsonify({"success": True, "fonte": row[0]})
        return jsonify({"success": False, "erro": "Chatbot não encontrado."}), 404
    except Exception as e:
        return jsonify({"success": False, "erro": str(e)}), 500

@app.route("/fonte", methods=["POST"])
def definir_fonte_chatbot():
    data = request.get_json()
    chatbot_id = data.get("chatbot_id")
    fonte = data.get("fonte")

    if fonte not in ["faq", "faiss", "faq+raga"]:
        return jsonify({"success": False, "erro": "Fonte inválida."}), 400

    try:
        cur.execute("UPDATE Chatbot SET descricao = %s WHERE chatbot_id = %s", (fonte, chatbot_id))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "erro": str(e)}), 500

@app.route("/faq-categoria/<categoria>", methods=["GET"])
def obter_faq_por_categoria(categoria):
    try:
        cur.execute("""
            SELECT f.pergunta, f.resposta
            FROM FAQ f
            INNER JOIN Categoria c ON f.categoria_id = c.categoria_id
            WHERE LOWER(c.nome) = LOWER(%s)
            ORDER BY RANDOM()
            LIMIT 1
        """, (categoria,))
        resultado = cur.fetchone()

        if resultado:
            return jsonify({"success": True, "pergunta": resultado[0], "resposta": resultado[1]})
        else:
            return jsonify({"success": False, "erro": f"Nenhuma FAQ encontrada para a categoria '{categoria}'."}), 404

    except Exception as e:
        return jsonify({"success": False, "erro": str(e)}), 500

@app.route("/faqs", methods=["GET"])
def get_faqs():
    try:
        cur.execute("SELECT faq_id, chatbot_id, designacao, pergunta, resposta FROM FAQ")
        data = cur.fetchall()
        return jsonify([
            {"faq_id": f[0], "chatbot_id": f[1], "designacao": f[2], "pergunta": f[3], "resposta": f[4]} for f in data
        ])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/faqs/chatbot/<int:chatbot_id>", methods=["GET"])
def get_faqs_por_chatbot(chatbot_id):
    try:
        cur.execute("""
            SELECT c.nome, f.pergunta, f.resposta
            FROM FAQ f
            LEFT JOIN Categoria c ON f.categoria_id = c.categoria_id
            WHERE f.chatbot_id = %s
        """, (chatbot_id,))
        data = cur.fetchall()
        return jsonify([
            {"categoria": row[0], "pergunta": row[1], "resposta": row[2]} for row in data
        ])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/faqs", methods=["POST"])
def add_faq():
    data = request.get_json()
    try:
        cur.execute("""
            SELECT faq_id FROM FAQ
            WHERE chatbot_id = %s AND designacao = %s AND pergunta = %s AND resposta = %s
        """, (data["chatbot_id"], data["designacao"], data["pergunta"], data["resposta"]))
        if cur.fetchone():
            return jsonify({"success": False, "error": "Esta FAQ já está inserida."}), 409

        cur.execute("""
            INSERT INTO FAQ (chatbot_id, categoria_id, designacao, pergunta, resposta)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING faq_id
        """, (data["chatbot_id"], data["categoria_id"], data["designacao"], data["pergunta"], data["resposta"]))
        faq_id = cur.fetchone()[0]

        if "documentos" in data and data["documentos"].strip():
            for doc_id in data["documentos"].split(','):
                cur.execute("INSERT INTO FAQ_Documento (faq_id, documento_id) VALUES (%s, %s)", (faq_id, int(doc_id.strip())))

        if "relacionadas" in data and data["relacionadas"].strip():
            for rel_id in data["relacionadas"].split(','):
                cur.execute("INSERT INTO FAQ_Relacionadas (faq_id, faq_relacionada_id) VALUES (%s, %s)", (faq_id, int(rel_id.strip())))

        conn.commit()
        return jsonify({"success": True, "faq_id": faq_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/faqs/<int:faq_id>", methods=["DELETE"])
def delete_faq(faq_id):
    try:
        cur.execute("DELETE FROM FAQ WHERE faq_id = %s", (faq_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/upload-faq-docx", methods=["POST"])
def upload_faq_docx():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Ficheiro não enviado."}), 400

    file = request.files['file']
    try:
        doc = docx.Document(file)
        dados = {}

        for table in doc.tables:
            for row in table.rows:
                if len(row.cells) >= 2:
                    chave_raw = row.cells[0].text.strip().lower().replace("’", "'")
                    valor = row.cells[1].text.strip()
                    chave = chave_raw.replace(":", "").strip()
                    if chave and valor:
                        dados[chave] = valor

        if not dados.get("designação da faq") or not dados.get("questão") or not dados.get("resposta"):
            raise Exception("Faltam campos obrigatórios: designação, questão ou resposta.")

        cur.execute("SELECT chatbot_id FROM Chatbot WHERE nome = %s", ('Assistente Municipal',))
        result = cur.fetchone()
        chatbot_id = result[0] if result else None

        if not chatbot_id:
            cur.execute("INSERT INTO Chatbot (nome, idioma, descricao) VALUES (%s, %s, %s) RETURNING chatbot_id",
                        ('Assistente Municipal', 'pt', 'faq'))
            chatbot_id = cur.fetchone()[0]

        designacao = dados.get("designação da faq")
        pergunta = dados.get("questão")
        resposta = dados.get("resposta")

        cur.execute("""
            SELECT faq_id FROM FAQ
            WHERE chatbot_id = %s AND designacao = %s AND pergunta = %s AND resposta = %s
        """, (chatbot_id, designacao, pergunta, resposta))
        if cur.fetchone():
            return jsonify({"success": False, "error": "Esta FAQ já foi carregada."}), 409

        cur.execute("""
            INSERT INTO FAQ (chatbot_id, designacao, pergunta, resposta)
            VALUES (%s, %s, %s, %s)
            RETURNING faq_id
        """, (chatbot_id, designacao, pergunta, resposta))
        faq_id = cur.fetchone()[0]

        categoria = dados.get("categoria")
        if categoria:
            cur.execute("SELECT categoria_id FROM Categoria WHERE nome ILIKE %s", (categoria,))
            result = cur.fetchone()
            if result:
                cur.execute("UPDATE FAQ SET categoria_id = %s WHERE faq_id = %s", (result[0], faq_id))

        conn.commit()
        return jsonify({"success": True, "faq_id": faq_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/obter-resposta", methods=["POST"])
def obter_resposta():
    dados = request.get_json()
    pergunta = dados.get("pergunta", "").strip()
    chatbot_id = dados.get("chatbot_id")

    if not pergunta or not chatbot_id:
        return jsonify({"success": False, "erro": "Pergunta ou chatbot_id não fornecido."}), 400

    try:
        cur.execute("SELECT descricao FROM Chatbot WHERE chatbot_id = %s", (chatbot_id,))
        row = cur.fetchone()
        fonte = row[0] if row else "faq"

        def obter_faq_por_pergunta(pergunta):
            resultado = obter_faq_mais_semelhante(pergunta)
            return (resultado["resposta"],) if resultado else None

        if fonte == "faq":
            resultado = obter_faq_por_pergunta(pergunta)
            if resultado:
                return jsonify({"success": True, "fonte": "FAQ", "resposta": resultado[0]})
            return jsonify({"success": False, "erro": "Pergunta não encontrada nas FAQs."})

        elif fonte == "faiss":
            resposta = obter_resposta_rag(pergunta, modo="faiss")
            return jsonify({"success": True, "fonte": "FAISS", "resposta": resposta})

        elif fonte == "faq+raga":
            resultado = obter_faq_por_pergunta(pergunta)
            if resultado:
                return jsonify({"success": True, "fonte": "FAQ", "resposta": resultado[0]})
            resposta = obter_resposta_rag(pergunta, modo="rag")
            return jsonify({"success": True, "fonte": "RAG", "resposta": resposta})

        else:
            return jsonify({"success": False, "erro": "Fonte inválida."}), 400

    except Exception as e:
        return jsonify({"success": False, "erro": str(e)}), 500

# ---------- INICIAR SERVIDOR ----------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)