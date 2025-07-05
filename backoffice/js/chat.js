// Adiciona mensagem ao chat
function adicionarMensagem(tipo, texto) {
  const chat = document.getElementById("chatBody");
  const div = document.createElement("div");
  div.className = `message ${tipo}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Envia a pergunta do utilizador
function enviarPergunta() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;

  adicionarMensagem("user", texto);
  input.value = "";

  responderPergunta(texto); // Envia pergunta com fonte e chatbot
}

// Envia a pergunta ao backend e processa a resposta
function responderPergunta(pergunta) {
  if (!window.chatbotSelecionado || isNaN(window.chatbotSelecionado)) {
    return adicionarMensagem("bot", "❌ Nenhum chatbot selecionado.");
  }

  const fonte = window.fonteSelecionada || "faq";

  console.log("Pergunta:", pergunta);
  console.log("Chatbot ID:", window.chatbotSelecionado);
  console.log("Fonte:", fonte);

  fetch("http://localhost:5000/obter-resposta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta,
      chatbot_id: window.chatbotSelecionado,
      fonte: fonte
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        adicionarMensagem("bot", data.resposta);
        obterPerguntasSemelhantes(pergunta);
      } else {
        adicionarMensagem("bot", data.erro || "❌ Nenhuma resposta encontrada.");
      }
    })
    .catch(() => {
      adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor.");
    });
}

// Envia uma pergunta baseada numa categoria
function perguntarCategoria(categoria) {
  if (!window.chatbotSelecionado || isNaN(window.chatbotSelecionado)) {
    return adicionarMensagem("bot", "⚠️ Selecione um chatbot antes de fazer uma pergunta.");
  }

  adicionarMensagem("user", categoria);

  const fonte = window.fonteSelecionada || "faq";
  if (fonte !== "faq") {
    return adicionarMensagem("bot", "⚠️ Apenas a fonte 'Baseado em Regras (FAQ)' suporta categorias.");
  }

  fetch(`http://localhost:5000/faq-categoria/${encodeURIComponent(categoria)}?chatbot_id=${window.chatbotSelecionado}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.pergunta && data.resposta) {
        adicionarMensagem("bot", data.pergunta);
        setTimeout(() => adicionarMensagem("bot", data.resposta), 600);
      } else {
        adicionarMensagem("bot", `❌ Não foi possível obter uma FAQ para a categoria '${categoria}'.`);
      }
    })
    .catch(() => {
      adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor.");
    });
}

// Mostra sugestões de perguntas semelhantes
function obterPerguntasSemelhantes(perguntaOriginal) {
  fetch("http://localhost:5000/perguntas-semelhantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta: perguntaOriginal,
      chatbot_id: window.chatbotSelecionado
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.sugestoes.length > 0) {
        const chat = document.getElementById("chatBody");

        const divTitulo = document.createElement("div");
        divTitulo.className = "message bot";
        divTitulo.textContent = "📌 Perguntas semelhantes:";
        chat.appendChild(divTitulo);

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";
        btnContainer.style.marginTop = "6px";
        btnContainer.style.flexWrap = "wrap";

        data.sugestoes.forEach(pergunta => {
          const btn = document.createElement("button");
          btn.className = "btn-similar";
          btn.textContent = pergunta;
          btn.onclick = () => {
            adicionarMensagem("user", pergunta);
            responderPergunta(pergunta);
          };
          btnContainer.appendChild(btn);
        });

        chat.appendChild(btnContainer);
        chat.scrollTop = chat.scrollHeight;
      }
    })
    .catch(() => {
      console.warn("Erro ao buscar perguntas semelhantes");
    });
}

window.perguntarCategoria = perguntarCategoria;
window.enviarPergunta = enviarPergunta;
window.responderPergunta = responderPergunta;