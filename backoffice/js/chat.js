// Adiciona uma nova mensagem ao corpo do chat
function adicionarMensagem(tipo, texto) {
  const chat = document.getElementById("chatBody");
  const div = document.createElement("div");
  div.className = `message ${tipo}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Enviar mensagem manual (input do utilizador)
function enviarPergunta() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;
  adicionarMensagem("user", texto);
  input.value = "";
  responderPergunta(texto); // Função definida em faq.js
}

// Enviar mensagem com base numa categoria (botão)
function perguntarCategoria(categoria) {
  adicionarMensagem("user", categoria);

  if (fonteSelecionada !== "faq") {
    return adicionarMensagem("bot", "⚠️ Apenas a fonte 'Baseado em Regras (FAQ)' está disponível.");
  }

  fetch(`http://localhost:5000/faq-categoria/${encodeURIComponent(categoria)}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.pergunta && data.resposta) {
        adicionarMensagem("bot", data.pergunta);
        setTimeout(() => adicionarMensagem("bot", data.resposta), 600);
      } else {
        adicionarMensagem("bot", "❌ Não foi possível obter uma FAQ dessa categoria.");
      }
    })
    .catch(() => adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor."));
}