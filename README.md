
# Assistente Inteligente com FAISS e Embeddings

Este projeto implementa um chatbot inteligente que responde a perguntas usando **matching semântico com FAISS** e **Sentence Transformers**. O sistema organiza perguntas/respostas por categorias e suporta multilinguagem (PT/EN).

## Como executar

### 1. Instalar dependências

```bash
pip install -r requirements.txt
```

### 2. Construir os índices FAISS

Coloca os ficheiros `faq_*.txt` na pasta `faq/`, seguindo este formato:

```
P: Como matricular o meu filho?
R: Deve dirigir-se à escola com os documentos necessários.

P: Que apoios sociais existem?
R: Pode consultar a linha de apoio à ação social.
```

Depois corre:

```bash
python Faiss_index.py
```

Isso irá gerar os ficheiros `.index` e `*_qa.txt` na pasta `faiss_indexes/`.

### 3. Executar o chatbot com FAISS

```bash
python FAISgrouped.py
```

### 4. Ou usar a versão sem embeddings

```bash
python chatbot.py
```

> Esta versão usa correspondência por palavras-chave e ficheiros como `bots/nomebot/cultura_qa_pt.txt`.

## Exemplo de pergunta

```
Você: Onde posso inscrever meu filho na escola?
Bot (categoria: educacao):
  (distância 0.3982) → Deve dirigir-se à escola com os documentos necessários.
```
## Imagens do sistema

### 1. Interface do chatbot (PT)
<img src="images/1.png" width="200"/>

### 2. Interface do chatbot (EN)
<img src="images/2.png" width="200"/>

### 3. Dashboard de métricas
<img src="images/3.png" width="300"/>

### 4. Backoffice do bot
<img src="images/4.png" width="300"/>

### 5. Fluxo de funcionamento - parte 1
<img src="images/5.png" width="200"/>

### 6. Fluxo de funcionamento - parte 2
<img src="images/6.png" width="200"/>

## Notas

- Os ficheiros `*_qa.txt` devem ter o formato `pergunta\tresposta` (tabulação).
- Os ficheiros FAQ devem seguir o padrão `P:` e `R:`.