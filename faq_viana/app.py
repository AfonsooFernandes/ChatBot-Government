from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import docx
import logging

# Logging
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

# ---------- ROTAS ----------

@app.route("/categorias", methods=["GET"])
def get_categorias():
    try:
        cur.execute("SELECT categoria_id, nome FROM Categoria")
        data = cur.fetchall()
        return jsonify([{"categoria_id": c[0], "nome": c[1]} for c in data])
    except Exception as e:
        print("❌ Erro ao buscar categorias:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/chatbots", methods=["GET"])
def get_chatbots():
    try:
        cur.execute("""
            SELECT c.chatbot_id, c.nome, c.descricao, cat.nome 
            FROM Chatbot c
            LEFT JOIN Categoria cat ON c.categoria_id = cat.categoria_id
        """)
        data = cur.fetchall()
        return jsonify([
            {
                "chatbot_id": row[0],
                "nome": row[1],
                "descricao": row[2],
                "categoria": row[3]
            } for row in data
        ])
    except Exception as e:
        print("❌ Erro ao buscar chatbots:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/faqs", methods=["GET"])
def get_faqs():
    try:
        cur.execute("SELECT faq_id, chatbot_id, designacao, pergunta, resposta FROM FAQ")
        data = cur.fetchall()
        return jsonify([
            {
                "faq_id": f[0],
                "chatbot_id": f[1],
                "designacao": f[2],
                "pergunta": f[3],
                "resposta": f[4]
            } for f in data
        ])
    except Exception as e:
        print("❌ Erro ao buscar FAQs:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/faqs", methods=["POST"])
def add_faq():
    data = request.get_json()
    try:
        cur.execute("""
            SELECT faq_id FROM FAQ
            WHERE chatbot_id = %s AND designacao = %s AND pergunta = %s AND resposta = %s
        """, (
            data["chatbot_id"], data["designacao"], data["pergunta"], data["resposta"]
        ))
        if cur.fetchone():
            return jsonify({"success": False, "error": "Esta FAQ já está inserida."}), 409

        cur.execute("""
            INSERT INTO FAQ (chatbot_id, designacao, pergunta, resposta)
            VALUES (%s, %s, %s, %s)
            RETURNING faq_id
        """, (
            data["chatbot_id"], data["designacao"], data["pergunta"], data["resposta"]
        ))
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
        print("❌ Erro ao adicionar FAQ:", e)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/faqs/<int:faq_id>", methods=["DELETE"])
def delete_faq(faq_id):
    try:
        cur.execute("DELETE FROM FAQ WHERE faq_id = %s", (faq_id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        print("❌ Erro ao eliminar FAQ:", e)
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

        print("📄 Dados extraídos da tabela:")
        for k, v in dados.items():
            print(f"  {k}: {v}")

        if not dados.get("designação da faq") or not dados.get("questão") or not dados.get("resposta"):
            raise Exception("Faltam campos obrigatórios: designação, questão ou resposta.")

        chatbot_id = 1
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
                cur.execute("UPDATE Chatbot SET categoria_id = %s WHERE chatbot_id = %s", (result[0], chatbot_id))

        conn.commit()
        return jsonify({"success": True, "faq_id": faq_id})
    except Exception as e:
        conn.rollback()
        print("❌ Erro ao processar ficheiro:", e)
        return jsonify({"success": False, "error": str(e)}), 500


# ----------- INICIAR SERVIDOR -----------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)