-- Criação da base de dados (executar fora deste ficheiro se necessário)
-- CREATE DATABASE AI4Governance;

-- Tabela: Categoria
CREATE TABLE IF NOT EXISTS Categoria (
    categoria_id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

-- Inserir categorias iniciais
INSERT INTO Categoria (nome) VALUES
    ('Educação'),
    ('Ação Social'),
    ('Habitação'),
    ('Cultura'),
    ('Desporto'),
    ('Ambiente')
ON CONFLICT (nome) DO NOTHING;

-- Tabela: Chatbot
CREATE TABLE IF NOT EXISTS Chatbot (
    chatbot_id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES Categoria(categoria_id) ON DELETE SET NULL,
    nome VARCHAR(100) NOT NULL,
    idioma VARCHAR(10) NOT NULL,
    descricao TEXT
);

-- Tabela: Documento
CREATE TABLE IF NOT EXISTS Documento (
    documento_id SERIAL PRIMARY KEY,
    chatbot_id INT REFERENCES Chatbot(chatbot_id) ON DELETE CASCADE,
    titulo VARCHAR(255),
    ficheiro_path TEXT
);

-- Tabela: FAQ
CREATE TABLE IF NOT EXISTS FAQ (
    faq_id SERIAL PRIMARY KEY,
    chatbot_id INT REFERENCES Chatbot(chatbot_id) ON DELETE CASCADE,
    designacao VARCHAR(255),
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    UNIQUE (chatbot_id, designacao, pergunta, resposta)
);

-- Tabela: FAQ_Documento
CREATE TABLE IF NOT EXISTS FAQ_Documento (
    faq_id INT REFERENCES FAQ(faq_id) ON DELETE CASCADE,
    documento_id INT REFERENCES Documento(documento_id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, documento_id)
);

-- Tabela: FAQ_Relacionadas
CREATE TABLE IF NOT EXISTS FAQ_Relacionadas (
    faq_id INT REFERENCES FAQ(faq_id) ON DELETE CASCADE,
    faq_relacionada_id INT REFERENCES FAQ(faq_id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, faq_relacionada_id)
);

-- Tabela: Log
CREATE TABLE IF NOT EXISTS Log (
    log_id SERIAL PRIMARY KEY,
    chatbot_id INT REFERENCES Chatbot(chatbot_id) ON DELETE CASCADE,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pergunta_utilizador TEXT,
    respondido BOOLEAN
);

-- Tabela: Administrador
CREATE TABLE IF NOT EXISTS Administrador (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir Chatbots (um para cada categoria)
INSERT INTO Chatbot (categoria_id, nome, idioma, descricao)
SELECT categoria_id, nome, 'pt', 
       'Assistente virtual para a área de ' || nome
FROM Categoria
ON CONFLICT DO NOTHING;