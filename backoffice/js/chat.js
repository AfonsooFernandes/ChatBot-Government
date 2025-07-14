function getIdiomaAtual() {
  return localStorage.getItem("idiomaAtivo") || "pt";
}

async function atualizarNomeChatHeader() {
  const headerNome = document.getElementById('chatHeaderNomeBot');
  let nomeBot = "...";
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));

  if (chatbotId && !isNaN(chatbotId)) {
    try {
      const res = await fetch(`http://localhost:5000/chatbot/${chatbotId}`);
      const data = await res.json();
      if (data.success && data.nome) {
        nomeBot = data.nome;
      }
    } catch (e) {
      const botsData = JSON.parse(localStorage.getItem("chatbotsData") || "[]");
      const bot = botsData.find(b => b.chatbot_id === chatbotId || b.chatbot_id === String(chatbotId));
      if (bot && bot.nome) nomeBot = bot.nome;
    }
  }

  if (headerNome) {
    headerNome.textContent = nomeBot;
  }
}

// Adiciona mensagem ao chat
function adicionarMensagem(tipo, texto, avatarUrl = null) {
  const chat = document.getElementById("chatBody");
  let wrapper;

  if (tipo === "bot" && avatarUrl) {
    wrapper = document.createElement("div");
    wrapper.className = "message-wrapper bot";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "bot-avatar-outer";
    const avatar = document.createElement("img");
    avatar.src = avatarUrl;
    avatar.alt = "Bot";
    avatar.className = "bot-avatar";
    avatarDiv.appendChild(avatar);

    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot";
    msgDiv.style.whiteSpace = "pre-line";
    msgDiv.textContent = texto;

    wrapper.appendChild(avatarDiv);
    wrapper.appendChild(msgDiv);
  } else {
    wrapper = document.createElement("div");
    wrapper.className = "message-wrapper " + tipo;
    const msgDiv = document.createElement("div");
    msgDiv.className = `message ${tipo}`;
    msgDiv.textContent = texto;
    wrapper.appendChild(msgDiv);
  }

  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

async function apresentarMensagemInicial() {
  const chatBody = document.getElementById("chatBody");
  chatBody.innerHTML = "";

  let nomeBot = "...";
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));

  if (chatbotId && !isNaN(chatbotId)) {
    try {
      const res = await fetch(`http://localhost:5000/chatbot/${chatbotId}`);
      const data = await res.json();
      if (data.success && data.nome) {
        nomeBot = data.nome;
      }
    } catch (e) {
      const botsData = JSON.parse(localStorage.getItem("chatbotsData") || "[]");
      const bot = botsData.find(b => b.chatbot_id === chatbotId || b.chatbot_id === String(chatbotId));
      if (bot && bot.nome) nomeBot = bot.nome;
    }
  }

  const msg =
`Olá!
Eu sou o ${nomeBot}, o seu assistente virtual.  
Faça uma pergunta de cada vez que eu procurarei esclarecer todas as suas dúvidas.`;

  adicionarMensagem("bot", msg, "images/chatbot-icon.png");

  atualizarNomeChatHeader();
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
    return adicionarMensagem(
      "bot",
      "⚠️ Nenhum chatbot está ativo. Por favor, selecione um chatbot ativo no menu de recursos.",
      "images/chatbot-icon.png"
    );
  }

  const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
  const idioma = getIdiomaAtual();

  fetch("http://localhost:5000/obter-resposta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta,
      chatbot_id: chatbotId,
      fonte,
      idioma
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        adicionarMensagem("bot", data.resposta, "images/chatbot-icon.png");
        obterPerguntasSemelhantes(pergunta, chatbotId, idioma);
      } else {
        adicionarMensagem(
          "bot",
          data.erro || "❌ Nenhuma resposta encontrada para a pergunta fornecida.",
          "images/chatbot-icon.png"
        );
      }
    })
    .catch(() => {
      adicionarMensagem(
        "bot",
        "❌ Erro ao comunicar com o servidor. Verifique se o servidor está ativo.",
        "images/chatbot-icon.png"
      );
    });
}

// Mostra sugestões de perguntas semelhantes
function obterPerguntasSemelhantes(perguntaOriginal, chatbotId, idioma = null) {
  if (!chatbotId || isNaN(chatbotId)) {
    console.warn("⚠️ Chatbot ID inválido para buscar perguntas semelhantes.");
    return;
  }

  if (!idioma) idioma = getIdiomaAtual();

  fetch("http://localhost:5000/perguntas-semelhantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta: perguntaOriginal,
      chatbot_id: chatbotId,
      idioma: idioma
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.sugestoes.length > 0) {
        const chat = document.getElementById("chatBody");

        const divTitulo = document.createElement("div");
        divTitulo.className = "message-wrapper bot";
        const msgDiv = document.createElement("div");
        msgDiv.className = "message bot";
        msgDiv.style.display = "block";
        msgDiv.textContent = "📌 Perguntas semelhantes:";
        divTitulo.appendChild(document.createElement("div"));
        divTitulo.appendChild(msgDiv);
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

window.setIdiomaAtivo = function(idioma) {
  localStorage.setItem("idiomaAtivo", idioma);
};
window.apresentarMensagemInicial = apresentarMensagemInicial;
window.enviarPergunta = enviarPergunta;
window.responderPergunta = responderPergunta;
window.perguntarCategoria = function(){};
window.atualizarNomeChatHeader = atualizarNomeChatHeader;