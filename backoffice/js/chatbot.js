async function carregarBots() {
  const container = document.getElementById("botItemContainer");
  if (!container) return;
  container.innerHTML = "<p>A carregar bots...</p>";
  try {
    const res = await fetch("http://localhost:5000/chatbots");
    const bots = await res.json();
    if (!Array.isArray(bots) || bots.length === 0) {
      container.innerHTML = "<p>Nenhum bot encontrado.</p>";
      return;
    }
    container.innerHTML = bots.map(bot => criarBotHTML(bot)).join('');
  } catch (e) {
    container.innerHTML = `<p style="color:red;">Erro ao carregar bots: ${e.message}</p>`;
  }
}

function criarBotHTML(bot) {
  const dataAtual = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return `
    <div class="bot-wrapper">
      <div class="bot-item nao-publicado" data-chatbot-id="${bot.chatbot_id}" onclick="toggleBotDropdown(this)">
        <div>
          ${bot.nome}
          <span class="status">
            Estado: Não Publicado - Município • ${dataAtual}
          </span>
          <span class="ativo-label" style="display: none; margin-left: 10px; color: #3c763d; font-weight: bold;">
            • Chatbot Ativo
          </span>
        </div>
        <span class="dropdown-icon">▼</span>
      </div>
      <div class="bot-dropdown" style="display: none;">
        <button class="bot-ativo-btn" onclick="definirAtivo(event, ${bot.chatbot_id})">Ficar Ativo</button>
        <h3>Escolha a fonte para as respostas do chatbot</h3>
        <div class="resources">
          <div class="card" data-fonte="faq" onclick="selecionarFonte('faq', this.closest('.bot-dropdown'))">
            <h4>Baseado em Regras (FAQ)</h4>
            <p>Responde com base nas perguntas frequentes registadas.</p>
          </div>
          <div class="card" data-fonte="faiss" onclick="selecionarFonte('faiss', this.closest('.bot-dropdown'))">
            <h4>Só FAISS</h4>
            <p>Respostas aproximadas com base vetorial (não implementado).</p>
          </div>
          <div class="card" data-fonte="faq+raga" onclick="selecionarFonte('faq+raga', this.closest('.bot-dropdown'))">
            <h4>FAQ + fallback RAG</h4>
            <p>Tenta responder com regras e usa RAG se falhar (não implementado).</p>
          </div>
        </div>
        <hr class="linha-separadora">
        <h3>Gestão de FAQs</h3>
        <button id="faqAddBtn-${bot.chatbot_id}" onclick="mostrarFormulario()">Adicionar FAQ</button>
        <div id="faqContainer" style="display: none; margin-top: 10px;">
          <form id="faqForm-${bot.chatbot_id}" class="faqForm">
            <select name="chatbot_id" required>
              <option value="${bot.chatbot_id}" selected>${bot.nome}</option>
            </select>
            <input type="text" name="designacao" placeholder="Designação" required>
            <input type="text" name="pergunta" placeholder="Pergunta" required>
            <textarea name="resposta" placeholder="Resposta" required></textarea>
            <select name="categoria_id" required>
              <option value="">Escolha a categoria</option>
              <option value="1" selected>Educação</option>
              <option value="2">Ação Social</option>
              <option value="3">Habitação</option>
              <option value="4">Cultura</option>
              <option value="5">Desporto</option>
              <option value="6">Ambiente</option>
            </select>
            <input type="text" name="documentos" placeholder="IDs de Documentos (separados por vírgula)">
            <input type="text" name="relacionadas" placeholder="IDs de FAQs relacionadas (separados por vírgula)">
            <button type="submit">Adicionar FAQ</button>
            <div id="mensagemFAQ"></div>
          </form>
          <div>
            <label>Ou carregar ficheiro .docx</label>
            <form id="uploadForm-${bot.chatbot_id}" class="uploadForm" enctype="multipart/form-data">
              <input type="file" name="file" accept=".docx" required>
              <button type="submit">Adicionar Documento</button>
              <div class="uploadStatus"></div>
            </form>
          </div>
        </div>
        <h3>FAQs Associadas</h3>
        <div id="faqTabelaBot-${bot.chatbot_id}"></div>
      </div>
    </div>
  `;
}


async function carregarFAQsDoBotSelecionado() {
  const tituloFAQ = document.getElementById("tituloFAQ");
  const listaFAQs = document.getElementById("listaFAQs");
  if (!listaFAQs) return;

  const chatbotId = localStorage.getItem("chatbotAtivo") || localStorage.getItem("chatbotSelecionado");
  if (!chatbotId) {
    if (tituloFAQ) tituloFAQ.textContent = "Selecione um bot para ver as FAQs.";
    listaFAQs.innerHTML = "";
    return;
  }

  let botName = "...";
  if (tituloFAQ) tituloFAQ.textContent = "A carregar FAQ do bot selecionado...";
  try {
    const res = await fetch("http://localhost:5000/chatbots");
    const bots = await res.json();
    const bot = bots.find(b => String(b.chatbot_id) === String(chatbotId));
    if (bot && tituloFAQ) {
      botName = bot.nome;
      tituloFAQ.textContent = `A carregar FAQ do bot: "${botName}"`;
    }
  } catch {}

  listaFAQs.innerHTML = "";
  try {
    const res = await fetch(`http://localhost:5000/faqs/chatbot/${chatbotId}`);
    const faqs = await res.json();

    if (tituloFAQ) tituloFAQ.textContent = "";

    if (!Array.isArray(faqs) || faqs.length === 0) {
      listaFAQs.innerHTML = `<p style="margin-top:10px;">Nenhuma FAQ registada para este bot.</p>`;
      return;
    }

    listaFAQs.innerHTML = faqs.map(faq =>
      `<div style="border-bottom:1px solid #ddd; margin-bottom:20px; padding-bottom:12px;">
        <strong>${faq.pergunta}</strong>
        <div style="margin:6px 0 8px 0; color:#444;">${faq.resposta}</div>
        <button class="faq-eliminar-btn" onclick="eliminarFAQ(${faq.faq_id})">Eliminar</button>
      </div>`
    ).join('');

  } catch (e) {
    if (tituloFAQ) tituloFAQ.textContent = "";
    listaFAQs.innerHTML = `<p style="color:red;">Erro ao carregar FAQs: ${e.message}</p>`;
  }
}

async function eliminarFAQ(faqId) {
  if (!confirm("Tem a certeza que pretende eliminar esta FAQ?")) return;
  try {
    await fetch(`http://localhost:5000/faqs/${faqId}`, { method: 'DELETE' });
    carregarFAQsDoBotSelecionado();
  } catch {
    alert("Erro ao eliminar FAQ.");
  }
}


window.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("botItemContainer")) {
    carregarBots();
  }
  if (document.getElementById("listaFAQs")) {
    carregarFAQsDoBotSelecionado();
  }
});


function selecionarFonte(fonte, dropdown = null) { 
  window.fonteSelecionada = fonte;
  if (window.chatbotSelecionado) {
    localStorage.setItem(`fonteSelecionada_bot${window.chatbotSelecionado}`, fonte);
  }
  if (!dropdown) {
    dropdown = document.querySelector(`.bot-item[data-chatbot-id="${window.chatbotSelecionado}"]`)
      ?.parentElement?.querySelector(".bot-dropdown");
  }
  if (!dropdown) {
    console.warn("Dropdown não definido em selecionarFonte()");
    return;
  }
  dropdown.querySelectorAll(".card").forEach(card => {
    card.classList.toggle("active", card.dataset.fonte === fonte);
  });
}

function mostrarFormulario() {
  const dropdownVisivel = document.querySelector(".bot-dropdown[style*='block']");
  if (!dropdownVisivel) return;
  const container = dropdownVisivel.querySelector("#faqContainer");
  if (container) {
    container.style.display = container.style.display === "none" ? "block" : "none";
  }
}

function toggleBotDropdown(botItem) {
  const chatbotId = parseInt(botItem.getAttribute("data-chatbot-id"));
  const dropdown = botItem.parentElement.querySelector(".bot-dropdown");
  const isCurrentlyOpen = botItem.classList.contains("expanded");

  document.querySelectorAll(".bot-dropdown").forEach(el => el.style.display = "none");
  document.querySelectorAll(".bot-item").forEach(el => el.classList.remove("expanded"));

  if (isCurrentlyOpen) {
    window.chatbotSelecionado = null;
    localStorage.removeItem("chatbotSelecionado");
  } else {
    botItem.classList.add("expanded");
    dropdown.style.display = "block";

    requestAnimationFrame(() => {
      if (typeof carregarChatbots === "function") {
        carregarChatbots();
      }
    });

    window.chatbotSelecionado = chatbotId;
    localStorage.setItem("chatbotSelecionado", chatbotId);

    const selectEl = dropdown.querySelector("select[name='chatbot_id']");
    if (selectEl) {
      selectEl.value = chatbotId;
    }

    const fonteSalva = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
    selecionarFonte(fonteSalva, dropdown);

    if (typeof carregarTabelaFAQs === "function") {
      carregarTabelaFAQs(chatbotId, true);
    }

    const botWrapper = botItem.closest(".bot-wrapper");
    const ativoBtn = botWrapper.querySelector(".bot-ativo-btn");
    if (ativoBtn) ativoBtn.style.display = "inline-block";
  }
}

function definirAtivo(event, chatbotId) {
  event.stopPropagation();

  localStorage.setItem("chatbotAtivo", chatbotId);
  window.chatbotAtivo = chatbotId;
  document.querySelectorAll(".bot-ativo-btn").forEach(btn => {
    btn.classList.remove("ativo");
    btn.textContent = "Ficar Ativo"; 
  });
  const botAtivoBtn = event.target.closest(".bot-dropdown").querySelector(".bot-ativo-btn");
  if (botAtivoBtn) {
    botAtivoBtn.classList.add("ativo");
    botAtivoBtn.textContent = "Ativo"; 
  }
  const indicador = document.getElementById("indicadorAtivo");
  if (indicador) {
    indicador.style.display = "block";
    indicador.textContent = "";
  }
  document.querySelectorAll(".ativo-label").forEach(el => el.style.display = "none");
  const label = document.querySelector(`.bot-item[data-chatbot-id="${chatbotId}"] .ativo-label`);
  if (label) label.style.display = "inline";
  const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
  window.fonteSelecionada = fonte;
  const dropdown = document.querySelector(`.bot-item[data-chatbot-id="${chatbotId}"]`)
    ?.parentElement?.querySelector(".bot-dropdown");
  if (dropdown) {
    selecionarFonte(fonte, dropdown);
  }
  if (typeof carregarTabelaFAQs === "function") {
    carregarTabelaFAQs(chatbotId, true);
  }
  if (document.getElementById("listaFAQs")) {
    carregarFAQsDoBotSelecionado();
  }
}