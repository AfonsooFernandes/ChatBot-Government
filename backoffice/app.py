from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import docx
import logging
from fuzzywuzzy import fuzz
import faiss
from sentence_transformers import SentenceTransformer
import numpy as np
import pickle
import os

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


INDEX_PATH = "faiss.index"
FAQ_EMBEDDINGS_PATH = "faq_embeddings.pkl"
embedding_model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

def get_faqs_from_db(chatbot_id=None):
    if chatbot_id:
        cur.execute("SELECT faq_id, pergunta, resposta, chatbot_id FROM FAQ WHERE chatbot_id = %s", (chatbot_id,))
    else:
        cur.execute("SELECT faq_id, pergunta, resposta, chatbot_id FROM FAQ")
    return cur.fetchall()

def build_faiss_index(chatbot_id=None):
    faqs = get_faqs_from_db(chatbot_id)
    perguntas = [f[1] for f in faqs]
    if not perguntas:
        emb_dim = 384
        embeddings = np.zeros((1, emb_dim), dtype=np.float32)
        index = faiss.IndexFlatL2(emb_dim)
    else:
        embeddings = embedding_model.encode(perguntas, show_progress_bar=True)
        index = faiss.IndexFlatL2(embeddings.shape[1])
        index.add(np.array(embeddings, dtype=np.float32))
    with open(FAQ_EMBEDDINGS_PATH, 'wb') as f:
        pickle.dump({'faqs': faqs, 'embeddings': embeddings}, f)
    faiss.write_index(index, INDEX_PATH)
    print(f"FAISS index built with {len(perguntas)} FAQs.")

def load_faiss_index():
    index = faiss.read_index(INDEX_PATH)
    with open(FAQ_EMBEDDINGS_PATH, 'rb') as f:
        data = pickle.load(f)
    return index, data['faqs'], data['embeddings']

if not (os.path.exists(INDEX_PATH) and os.path.exists(FAQ_EMBEDDINGS_PATH)):
    print("Building FAISS index...")
    build_faiss_index()

faiss_index, faqs_db, faq_embeddings = load_faiss_index()

def pesquisar_faiss(pergunta, chatbot_id=None, k=1):
    if chatbot_id:
        faqs = [f for f in faqs_db if f[3] == int(chatbot_id)]
        if not faqs:
            return []
        perguntas = [f[1] for f in faqs]
        embeddings = embedding_model.encode(perguntas)
        index = faiss.IndexFlatL2(embeddings.shape[1])
        index.add(np.array(embeddings, dtype=np.float32))
        query_emb = embedding_model.encode([pergunta])
        D, I = index.search(np.array(query_emb, dtype=np.float32), min(k, len(faqs)))
        results = []
        for idx in I[0]:
            faq_id, pergunta_faq, resposta_faq, chatbot_id_faq = faqs[idx]
            results.append({
                'faq_id': faq_id,
                'pergunta': pergunta_faq,
                'resposta': resposta_faq
            })
        return results
    else:
        if len(faqs_db) == 0:
            return []
        query_emb = embedding_model.encode([pergunta])
        D, I = faiss_index.search(np.array(query_emb, dtype=np.float32), min(k, len(faqs_db)))
        results = []
        for idx in I[0]:
            faq_id, pergunta_faq, resposta_faq, chatbot_id_faq = faqs_db[idx]
            results.append({
                'faq_id': faq_id,
                'pergunta': pergunta_faq,
                'resposta': resposta_faq
            })
        return results

# ---------- FUNÇÃO DE SIMILARIDADE ----------
def obter_faq_mais_semelhante(pergunta_utilizador, chatbot_id):
    cur.execute("SELECT pergunta, resposta FROM FAQ WHERE chatbot_id = %s", (chatbot_id,))
    faqs = cur.fetchall()

    pergunta_normalizada = pergunta_utilizador.strip().lower()

    melhor_pergunta = None
    melhor_resposta = None
    maior_score = 0

    for pergunta, resposta in faqs:
        pergunta_bd = pergunta.strip().lower()

        if pergunta_normalizada == pergunta_bd:
            print(f"✅ Match exato com: '{pergunta}'")
            return {"pergunta": pergunta, "resposta": resposta, "score": 100}

        score = fuzz.ratio(pergunta_normalizada, pergunta_bd)
        if score > maior_score:
            maior_score = score
            melhor_pergunta = pergunta
            melhor_resposta = resposta

    print(f"➡️ Melhor correspondência: '{melhor_pergunta}' (score: {maior_score})")

    if maior_score >= 50:
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

@app.route("/chatbots", methods=["POST"])
def criar_chatbot():
    data = request.get_json()
    nome = data.get("nome", "").strip()
    descricao = data.get("descricao", "").strip()
    categoria_id = data.get("categoria_id")  # pode vir None

    if not nome:
        return jsonify({"success": False, "error": "Nome obrigatório."}), 400

    try:
        cur.execute("SELECT chatbot_id FROM Chatbot WHERE LOWER(nome) = LOWER(%s)", (nome,))
        if cur.fetchone():
            return jsonify({"success": False, "error": "Já existe um chatbot com esse nome."}), 409

        if categoria_id:
            cur.execute(
                "INSERT INTO Chatbot (nome, descricao, categoria_id) VALUES (%s, %s, %s) RETURNING chatbot_id",
                (nome, descricao, categoria_id)
            )
        else:
            cur.execute(
                "INSERT INTO Chatbot (nome, descricao) VALUES (%s, %s) RETURNING chatbot_id",
                (nome, descricao)
            )

        chatbot_id = cur.fetchone()[0]
        conn.commit()
        return jsonify({"success": True, "chatbot_id": chatbot_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/fonte/<int:chatbot_id>", methods=["GET"])
def obter_fonte_chatbot(chatbot_id):
    try:
        cur.execute("SELECT descricao FROM Chatbot WHERE chatbot_id = %s", (chatbot_id,))
        row = cur.fetchone()
        if row:
            fonte = row[0] if row[0] else "faq"  
            return jsonify({"success": True, "fonte": fonte})
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
        cur.execute("SELECT 1 FROM Chatbot WHERE chatbot_id = %s", (chatbot_id,))
        if not cur.fetchone():
            return jsonify({"success": False, "erro": "Chatbot não encontrado."}), 404

        cur.execute("UPDATE Chatbot SET descricao = %s WHERE chatbot_id = %s", (fonte, chatbot_id))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "erro": str(e)}), 500

@app.route("/faq-categoria/<categoria>", methods=["GET"])
def obter_faq_por_categoria(categoria):
    try:
        chatbot_id = request.args.get("chatbot_id")
        if not chatbot_id:
            return jsonify({"success": False, "erro": "chatbot_id não fornecido."}), 400

        cur.execute("""
            SELECT f.faq_id, f.pergunta, f.resposta
            FROM FAQ f
            INNER JOIN Categoria c ON f.categoria_id = c.categoria_id
            WHERE LOWER(c.nome) = LOWER(%s) AND f.chatbot_id = %s
            ORDER BY RANDOM()
            LIMIT 1
        """, (categoria, chatbot_id))
        resultado = cur.fetchone()

        if resultado:
            return jsonify({
                "success": True,
                "faq_id": resultado[0],
                "pergunta": resultado[1],
                "resposta": resultado[2]
            })
        else:
            return jsonify({
                "success": False,
                "erro": f"Nenhuma FAQ encontrada para a categoria '{categoria}'."
            }), 404

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
            SELECT f.faq_id, c.nome, f.pergunta, f.resposta
            FROM FAQ f
            LEFT JOIN Categoria c ON f.categoria_id = c.categoria_id
            WHERE f.chatbot_id = %s
        """, (chatbot_id,))
        data = cur.fetchall()
        return jsonify([
            {
                "faq_id": row[0],
                "categoria": row[1],
                "pergunta": row[2],
                "resposta": row[3]
            }
            for row in data
        ])
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/faqs", methods=["POST"])
def add_faq():
    global faiss_index, faqs_db, faq_embeddings   
    data = request.get_json()
    try:
        if str(data["chatbot_id"]) == "todos":
            cur.execute("SELECT chatbot_id FROM Chatbot")
            todos_chatbots = [row[0] for row in cur.fetchall()]
            inseridos = 0
            ja_existiam = 0
            for bot_id in todos_chatbots:
                cur.execute("""
                    SELECT faq_id FROM FAQ
                    WHERE chatbot_id = %s AND designacao = %s AND pergunta = %s AND resposta = %s
                """, (bot_id, data["designacao"], data["pergunta"], data["resposta"]))
                if cur.fetchone():
                    ja_existiam += 1
                    continue
                cur.execute("""
                    INSERT INTO FAQ (chatbot_id, categoria_id, designacao, pergunta, resposta)
                    VALUES (%s, %s, %s, %s, %s)
                """, (bot_id, data["categoria_id"], data["designacao"], data["pergunta"], data["resposta"]))
                inseridos += 1
            conn.commit()
            build_faiss_index()  
            faiss_index, faqs_db, faq_embeddings = load_faiss_index()
            return jsonify({"success": True, "inseridos": inseridos, "ja_existiam": ja_existiam})
        else:
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
            build_faiss_index()
            faiss_index, faqs_db, faq_embeddings = load_faiss_index()
            return jsonify({"success": True, "faq_id": faq_id})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/faqs/<int:faq_id>", methods=["DELETE"])
def delete_faq(faq_id):
    try:
        cur.execute("DELETE FROM FAQ WHERE faq_id = %s", (faq_id,))
        conn.commit()
        build_faiss_index()
        global faiss_index, faqs_db, faq_embeddings
        faiss_index, faqs_db, faq_embeddings = load_faiss_index()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/upload-faq-docx", methods=["POST"])
def upload_faq_docx():
    if 'file' not in request.files:
        return jsonify({"success": False, "error": "Ficheiro não enviado."}), 400

    file = request.files['file']
    chatbot_id_raw = request.form.get("chatbot_id")

    if not chatbot_id_raw:
        return jsonify({"success": False, "error": "Chatbot ID não fornecido."}), 400

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

        designacao = dados.get("designação da faq")
        pergunta = dados.get("questão")
        resposta = dados.get("resposta")
        categoria = dados.get("categoria")

        chatbot_ids = []

        if chatbot_id_raw == "todos":
            cur.execute("SELECT chatbot_id FROM Chatbot")
            chatbot_ids = [row[0] for row in cur.fetchall()]
        else:
            chatbot_ids = [int(chatbot_id_raw)]

        for chatbot_id in chatbot_ids:
            cur.execute("""
                SELECT faq_id FROM FAQ
                WHERE chatbot_id = %s AND designacao = %s AND pergunta = %s AND resposta = %s
            """, (chatbot_id, designacao, pergunta, resposta))
            if cur.fetchone():
                continue  

            cur.execute("""
                INSERT INTO FAQ (chatbot_id, designacao, pergunta, resposta)
                VALUES (%s, %s, %s, %s)
                RETURNING faq_id
            """, (chatbot_id, designacao, pergunta, resposta))
            faq_id = cur.fetchone()[0]

            if categoria:
                cur.execute("SELECT categoria_id FROM Categoria WHERE nome ILIKE %s", (categoria,))
                result = cur.fetchone()
                if result:
                    cur.execute("UPDATE FAQ SET categoria_id = %s WHERE faq_id = %s", (result[0], faq_id))

        conn.commit()
        build_faiss_index()
        global faiss_index, faqs_db, faq_embeddings
        faiss_index, faqs_db, faq_embeddings = load_faiss_index()
        return jsonify({"success": True, "message": "FAQ inserida com sucesso."})

    except Exception as e:
        conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/obter-resposta", methods=["POST"])
def obter_resposta():
    dados = request.get_json()
    pergunta = dados.get("pergunta", "").strip()
    chatbot_id = dados.get("chatbot_id")
    fonte = dados.get("fonte", "faq")

    if not pergunta or not chatbot_id:
        return jsonify({"success": False, "erro": "Pergunta ou chatbot_id não fornecido."}), 400

    try:
        if fonte == "faq":
            resultado = obter_faq_mais_semelhante(pergunta, chatbot_id)
            if resultado:
                cur.execute("""
                    SELECT faq_id, categoria_id FROM FAQ
                    WHERE LOWER(pergunta) = LOWER(%s) AND chatbot_id = %s
                """, (resultado["pergunta"], chatbot_id))
                row = cur.fetchone()
                faq_id, categoria_id = row if row else (None, None)

                return jsonify({
                    "success": True,
                    "fonte": "FAQ",
                    "resposta": resultado["resposta"],
                    "faq_id": faq_id,
                    "categoria_id": categoria_id
                })

            return jsonify({"success": False, "erro": "Pergunta não encontrada nas FAQs."})

        elif fonte == "faiss":
            faiss_resultados = pesquisar_faiss(pergunta, chatbot_id=chatbot_id, k=1)
            if faiss_resultados:
                return jsonify({
                    "success": True,
                    "fonte": "FAISS",
                    "resposta": faiss_resultados[0]['resposta'],
                    "faq_id": faiss_resultados[0]['faq_id']
                })
            else:
                return jsonify({"success": False, "erro": "Nenhuma resposta FAISS encontrada."})

        elif fonte == "faq+raga":
            resultado = obter_faq_mais_semelhante(pergunta, chatbot_id)
            if resultado:
                cur.execute("""
                    SELECT faq_id, categoria_id FROM FAQ
                    WHERE LOWER(pergunta) = LOWER(%s) AND chatbot_id = %s
                """, (resultado["pergunta"], chatbot_id))
                row = cur.fetchone()
                faq_id, categoria_id = row if row else (None, None)

                return jsonify({
                    "success": True,
                    "fonte": "FAQ",
                    "resposta": resultado["resposta"],
                    "faq_id": faq_id,
                    "categoria_id": categoria_id
                })
            else:
                faiss_resultados = pesquisar_faiss(pergunta, chatbot_id=chatbot_id, k=1)
                if faiss_resultados:
                    return jsonify({
                        "success": True,
                        "fonte": "RAG",
                        "resposta": faiss_resultados[0]['resposta'],
                        "faq_id": faiss_resultados[0]['faq_id']
                    })
                else:
                    return jsonify({"success": False, "erro": "Nenhuma resposta encontrada (RAG/FAISS)."})

        else:
            return jsonify({"success": False, "erro": "Fonte inválida."}), 400

    except Exception as e:
        return jsonify({"success": False, "erro": str(e)}), 500

@app.route("/perguntas-semelhantes", methods=["POST"])
def perguntas_semelhantes():
    dados = request.get_json()
    pergunta_atual = dados.get("pergunta", "")
    chatbot_id = dados.get("chatbot_id")

    try:
        cur.execute("""
            SELECT f.categoria_id
            FROM FAQ f
            WHERE LOWER(f.pergunta) = LOWER(%s) AND f.chatbot_id = %s
        """, (pergunta_atual.strip().lower(), chatbot_id))
        categoria_row = cur.fetchone()

        if not categoria_row:
            return jsonify({"success": True, "sugestoes": []})

        categoria_id = categoria_row[0]

        cur.execute("""
            SELECT pergunta
            FROM FAQ
            WHERE categoria_id = %s AND LOWER(pergunta) != LOWER(%s) AND chatbot_id = %s
            ORDER BY RANDOM()
            LIMIT 2
        """, (categoria_id, pergunta_atual.strip().lower(), chatbot_id))
        sugestoes = [row[0] for row in cur.fetchall()]

        return jsonify({"success": True, "sugestoes": sugestoes})
    except Exception as e:
        return jsonify({"success": False, "erro": str(e)}), 500    

# ----------- ENDPOINT PARA REBUILD FAISS (Opcional) -----------
@app.route("/rebuild-faiss", methods=["POST"])
def rebuild_faiss():
    build_faiss_index()
    global faiss_index, faqs_db, faq_embeddings
    faiss_index, faqs_db, faq_embeddings = load_faiss_index()
    return jsonify({"success": True, "msg": "FAISS index rebuilt."})

# ---------- INICIAR SERVIDOR ----------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)