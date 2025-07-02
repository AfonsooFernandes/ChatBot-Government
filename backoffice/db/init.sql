-- Criação da base de dados
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
    nome VARCHAR(100) NOT NULL,
    idioma VARCHAR(10) NOT NULL,
    descricao TEXT,
    categoria_id INT REFERENCES Categoria(categoria_id) ON DELETE SET NULL
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
    categoria_id INT REFERENCES Categoria(categoria_id) ON DELETE SET NULL,
    designacao VARCHAR(255),
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    UNIQUE (chatbot_id, designacao, pergunta, resposta)
);

-- Tabela: FAQ_Documento (ligação entre FAQ e Documento)
CREATE TABLE IF NOT EXISTS FAQ_Documento (
    faq_id INT REFERENCES FAQ(faq_id) ON DELETE CASCADE,
    documento_id INT REFERENCES Documento(documento_id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, documento_id)
);

-- Tabela: FAQ_Relacionadas (relacionamentos entre FAQs)
CREATE TABLE IF NOT EXISTS FAQ_Relacionadas (
    faq_id INT REFERENCES FAQ(faq_id) ON DELETE CASCADE,
    faq_relacionada_id INT REFERENCES FAQ(faq_id) ON DELETE CASCADE,
    PRIMARY KEY (faq_id, faq_relacionada_id)
);

-- Tabela: Log (perguntas feitas ao chatbot)
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

-- FonteResposta 
CREATE TABLE IF NOT EXISTS FonteResposta (
    id SERIAL PRIMARY KEY,
    chatbot_id INT REFERENCES Chatbot(chatbot_id) ON DELETE CASCADE,
    fonte TEXT NOT NULL
);

-- Inserir chatbot genérico único
INSERT INTO Chatbot (nome, idioma, descricao)
VALUES ('Assistente Municipal', 'pt', 'Chatbot para todos os serviços municipais')
ON CONFLICT (nome) DO NOTHING;