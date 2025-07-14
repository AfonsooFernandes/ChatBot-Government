function shadeColor(color, percent) {
  let R = parseInt(color.substring(1,3),16);
  let G = parseInt(color.substring(3,5),16);
  let B = parseInt(color.substring(5,7),16);
  R = Math.round(R * (100 + percent) / 100);
  G = Math.round(G * (100 + percent) / 100);
  B = Math.round(B * (100 + percent) / 100);
  R = (R < 255) ? R : 255; G = (G < 255) ? G : 255; B = (B < 255) ? B : 255;
  let RR = ((R.toString(16).length==1)?"0":"") + R.toString(16);
  let GG = ((G.toString(16).length==1)?"0":"") + G.toString(16);
  let BB = ((B.toString(16).length==1)?"0":"") + B.toString(16);
  return "#" + RR + GG + BB;
}

function getIdiomaAtual() {
  return localStorage.getItem("idiomaAtivo") || "pt";
}

function formatarDataMensagem(date) {
  const meses = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  const horas = String(date.getHours()).padStart(2, '0');
  const minutos = String(date.getMinutes()).padStart(2, '0');
  return `${dia} de ${mes} de ${ano} ${horas}:${minutos}`;
}

function gerarDataHoraFormatada() {
  const agora = new Date();
  return agora.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }) +
    " " +
    agora.toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit"
    });
}

async function atualizarNomeChatHeader() {
  const headerNome = document.getElementById('chatHeaderNomeBot');
  let nomeBot = "...";
  let corBot = "#d4af37";
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));

  if (chatbotId && !isNaN(chatbotId)) {
    try {
      const res = await fetch(`http://localhost:5000/chatbot/${chatbotId}`);
      const data = await res.json();
      if (data.success && data.nome) {
        nomeBot = data.nome;
        localStorage.setItem("nomeBot", nomeBot);
      }
      if (data.success && data.cor) {
        corBot = data.cor;
        localStorage.setItem("corChatbot", corBot);
      }
    } catch (e) {
      const botsData = JSON.parse(localStorage.getItem("chatbotsData") || "[]");
      const bot = botsData.find(b => b.chatbot_id === chatbotId || b.chatbot_id === String(chatbotId));
      if (bot && bot.nome) {
        nomeBot = bot.nome;
        localStorage.setItem("nomeBot", nomeBot);
      }
      if (bot && bot.cor) {
        corBot = bot.cor;
        localStorage.setItem("corChatbot", corBot);
      }
    }
  }
  if (headerNome) {
    headerNome.textContent = nomeBot;
  }
  const chatHeader = document.querySelector('.chat-header');
  if (chatHeader) {
    chatHeader.style.background = corBot;
  }
  atualizarFonteBadge();
}

function atualizarFonteBadge() {
  const badgeDiv = document.getElementById("chatFonteBadge");
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));
  if (!badgeDiv) return;
  if (!chatbotId || isNaN(chatbotId)) {
    badgeDiv.innerHTML = "";
    return;
  }
  const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
  let badgeHTML = "";

  if (fonte === "faq" || fonte === "faiss") {
    badgeHTML = `
      <span style="display:inline-flex;align-items:center;gap:7px;font-weight:500;font-size:14px;color:#fff;border-radius:7px;padding:3px 7px 3px 2px;margin-top:4px;margin-left: 0px;">
        <img src="images/imediato.png" alt="Imediato" style="width:18px;height:18px;object-fit:contain;">
        Respostas imediatas.
      </span>
    `;
  } else if (fonte === "faq+raga") {
    badgeHTML = `
      <span style="display:inline-flex;align-items:center;gap:7px;font-weight:500;font-size:14px;color:#fff;border-radius:7px;padding:3px 7px 3px 2px;margin-top:4px;margin-left:20px;">
        <img src="images/ia.png" alt="IA" style="width:18px;height:18px;object-fit:contain;">
        Baseado em IA.
      </span>
    `;
  }
  badgeDiv.innerHTML = badgeHTML;
}

function adicionarMensagem(tipo, texto, avatarUrl = null, autor = null, timestamp = null) {
  const chat = document.getElementById("chatBody");
  let wrapper = document.createElement("div");
  wrapper.className = "message-wrapper " + tipo;

  const authorDiv = document.createElement("div");
  authorDiv.className = "chat-author " + tipo;
  authorDiv.textContent = tipo === "user" ? "Eu" : (autor || "Assistente Municipal");
  wrapper.appendChild(authorDiv);

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";

  if (tipo === "bot" && avatarUrl) {
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "bot-avatar-outer";
    const avatar = document.createElement("img");
    avatar.src = avatarUrl;
    avatar.alt = "Bot";
    avatar.className = "bot-avatar";
    avatarDiv.appendChild(avatar);
    messageContent.appendChild(avatarDiv);
  }

  const bubbleCol = document.createElement("div");
  bubbleCol.style.display = "flex";
  bubbleCol.style.flexDirection = "column";
  bubbleCol.style.alignItems = tipo === "user" ? "flex-end" : "flex-start";

  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${tipo}`;
  msgDiv.style.whiteSpace = "pre-line";
  msgDiv.textContent = texto;

  let corBot = localStorage.getItem("corChatbot") || "#d4af37";
  if (tipo === "bot") {
    msgDiv.style.backgroundColor = corBot;
    msgDiv.style.color = "#fff";
  }
  if (tipo === "user") {
    msgDiv.style.backgroundColor = shadeColor(corBot, -18);
    msgDiv.style.color = "#fff";
  }

  bubbleCol.appendChild(msgDiv);

  if (!timestamp) timestamp = gerarDataHoraFormatada();
  const timestampDiv = document.createElement("div");
  timestampDiv.className = "chat-timestamp";
  timestampDiv.textContent = timestamp;
  bubbleCol.appendChild(timestampDiv);

  messageContent.appendChild(bubbleCol);
  wrapper.appendChild(messageContent);
  chat.appendChild(wrapper);
  chat.scrollTop = chat.scrollHeight;
}

let autoMensagemTimeout = null;
let autoFecharTimeout = null;
let initialMessageShown = false;

function iniciarTimerAutoMensagem() {
  limparTimersAutoChat();
  autoMensagemTimeout = setTimeout(() => {
    enviarMensagemAutomatica();
  }, 30000);
}

function enviarMensagemAutomatica() {
  adicionarMensagem(
    "bot",
    "Se precisar de ajuda, basta escrever a sua pergunta!",
    "images/chatbot-icon.png",
    localStorage.getItem("nomeBot") || "Assistente Municipal"
  );
  autoFecharTimeout = setTimeout(() => {
    fecharChat();
  }, 15000);
}

function limparTimersAutoChat() {
  if (autoMensagemTimeout) {
    clearTimeout(autoMensagemTimeout);
    autoMensagemTimeout = null;
  }
  if (autoFecharTimeout) {
    clearTimeout(autoFecharTimeout);
    autoFecharTimeout = null;
  }
}

function abrirChat() {
  document.getElementById('chatSidebar').style.display = 'flex';
  apresentarMensagemInicial();
  iniciarTimerAutoMensagem();
}

window.fecharChat = function() {
  document.getElementById('chatSidebar').style.display = 'none';
  limparTimersAutoChat();
  initialMessageShown = false;
};

async function apresentarMensagemInicial() {
  const chatBody = document.getElementById("chatBody");
  if (initialMessageShown) return;

  let nomeBot = "...";
  let corBot = "#d4af37";
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));

  if (chatbotId && !isNaN(chatbotId)) {
    try {
      const res = await fetch(`http://localhost:5000/chatbot/${chatbotId}`);
      const data = await res.json();
      if (data.success && data.nome) {
        nomeBot = data.nome;
        localStorage.setItem("nomeBot", nomeBot);
      }
      if (data.success && data.cor) {
        corBot = data.cor;
        localStorage.setItem("corChatbot", corBot);
      }
    } catch (e) {
      const botsData = JSON.parse(localStorage.getItem("chatbotsData") || "[]");
      const bot = botsData.find(b => b.chatbot_id === chatbotId || b.chatbot_id === String(chatbotId));
      if (bot && bot.nome) {
        nomeBot = bot.nome;
        localStorage.setItem("nomeBot", nomeBot);
      }
      if (bot && bot.cor) {
        corBot = bot.cor;
        localStorage.setItem("corChatbot", corBot);
      }
    }
  } else {
    localStorage.setItem("nomeBot", "Assistente Municipal");
    localStorage.setItem("corChatbot", "#d4af37");
  }

  const msg =
`Olá!
Eu sou o ${nomeBot}, o seu assistente virtual.  
Faça uma pergunta de cada vez que eu procurarei esclarecer todas as suas dúvidas.`;

  adicionarMensagem("bot", msg, "images/chatbot-icon.png", nomeBot);
  initialMessageShown = true;

  await atualizarNomeChatHeader();
}

function enviarPergunta() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;

  adicionarMensagem("user", texto);
  input.value = "";
  limparTimersAutoChat();
  iniciarTimerAutoMensagem();

  responderPergunta(texto);
}

function responderPergunta(pergunta) {
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));
  if (!chatbotId || isNaN(chatbotId)) {
    return adicionarMensagem(
      "bot",
      "⚠️ Nenhum chatbot está ativo. Por favor, selecione um chatbot ativo no menu de recursos.",
      "images/chatbot-icon.png",
      localStorage.getItem("nomeBot") || "Assistente Municipal"
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
        adicionarMensagem("bot", data.resposta, "images/chatbot-icon.png", localStorage.getItem("nomeBot"));
        obterPerguntasSemelhantes(pergunta, chatbotId, idioma);
      } else {
        adicionarMensagem(
          "bot",
          data.erro || "❌ Nenhuma resposta encontrada para a pergunta fornecida.",
          "images/chatbot-icon.png",
          localStorage.getItem("nomeBot")
        );
      }
    })
    .catch(() => {
      adicionarMensagem(
        "bot",
        "❌ Erro ao comunicar com o servidor. Verifique se o servidor está ativo.",
        "images/chatbot-icon.png",
        localStorage.getItem("nomeBot")
      );
    });
}

function obterPerguntasSemelhantes(perguntaOriginal, chatbotId, idioma = null) {
  if (!chatbotId || isNaN(chatbotId)) return;

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
        const authorDiv = document.createElement("div");
        authorDiv.className = "chat-author";
        authorDiv.textContent = localStorage.getItem("nomeBot") || "Assistente Municipal";
        divTitulo.appendChild(authorDiv);

        const msgDiv = document.createElement("div");
        msgDiv.className = "message bot";
        msgDiv.style.display = "block";
        msgDiv.textContent = "📌 Perguntas semelhantes:";
        divTitulo.appendChild(document.createElement("div"));
        divTitulo.appendChild(msgDiv);

        const dataDiv = document.createElement("div");
        dataDiv.className = "chat-timestamp";
        dataDiv.textContent = formatarDataMensagem(new Date());
        divTitulo.appendChild(dataDiv);

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
    .catch(() => {});
}

window.setIdiomaAtivo = function(idioma) {
  localStorage.setItem("idiomaAtivo", idioma);
};
window.apresentarMensagemInicial = apresentarMensagemInicial;
window.enviarPergunta = enviarPergunta;
window.responderPergunta = responderPergunta;
window.perguntarCategoria = function(){};
window.atualizarNomeChatHeader = atualizarNomeChatHeader;
window.atualizarFonteBadge = atualizarFonteBadge;