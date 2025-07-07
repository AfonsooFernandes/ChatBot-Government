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

  responderPergunta(texto);
}

// Envia a pergunta ao backend e processa a resposta
function responderPergunta(pergunta) {
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));
  if (!chatbotId || isNaN(chatbotId)) {
    return adicionarMensagem("bot", "⚠️ Nenhum chatbot está ativo. Por favor, selecione um chatbot ativo no menu de recursos.");
  }

  const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";

  console.log(" Enviando pergunta:", pergunta);
  console.log(" Chatbot Ativo:", chatbotId);
  console.log(" Fonte:", fonte);

  fetch("http://localhost:5000/obter-resposta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta,
      chatbot_id: chatbotId,
      fonte
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        adicionarMensagem("bot", data.resposta);
        obterPerguntasSemelhantes(pergunta, chatbotId);
      } else {
        adicionarMensagem("bot", data.erro || "❌ Nenhuma resposta encontrada para a pergunta fornecida.");
      }
    })
    .catch(() => {
      adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor. Verifique se o servidor está ativo.");
    });
}

// Envia uma pergunta baseada numa categoria
function perguntarCategoria(categoria) {
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));
  if (!chatbotId || isNaN(chatbotId)) {
    return adicionarMensagem("bot", "⚠️ Nenhum chatbot está ativo. Por favor, selecione um chatbot ativo no menu de recursos.");
  }

  adicionarMensagem("user", categoria);

  const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";

  if (fonte !== "faq") {
    return adicionarMensagem("bot", "⚠️ Apenas a fonte 'Baseado em Regras (FAQ)' suporta categorias.");
  }

  fetch(`http://localhost:5000/faq-categoria/${encodeURIComponent(categoria)}?chatbot_id=${chatbotId}`)
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
      adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor. Verifique se o servidor está ativo.");
    });
}

// Mostra sugestões de perguntas semelhantes
function obterPerguntasSemelhantes(perguntaOriginal, chatbotId) {
  if (!chatbotId || isNaN(chatbotId)) {
    console.warn("⚠️ Chatbot ID inválido para buscar perguntas semelhantes.");
    return;
  }

  fetch("http://localhost:5000/perguntas-semelhantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta: perguntaOriginal,
      chatbot_id: chatbotId
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
      console.warn("⚠️ Erro ao buscar perguntas semelhantes");
    });
}

window.perguntarCategoria = perguntarCategoria;
window.enviarPergunta = enviarPergunta;
window.responderPergunta = responderPergunta;