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

    requestAnimationFrame(() => carregarChatbots());

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

  window.chatbotSelecionado = chatbotId;
  localStorage.setItem("chatbotSelecionado", chatbotId);
  localStorage.setItem("chatbotAtivo", chatbotId);

  document.querySelectorAll(".bot-ativo-btn").forEach(btn => btn.classList.remove("ativo"));
  event.currentTarget.classList.add("ativo");

  const statusEl = document.getElementById("botAtivoStatus");
  if (statusEl) statusEl.style.display = "inline-block";

  const mensagem = document.getElementById("botAtivoMensagem");
  if (mensagem) {
    mensagem.innerText = `Chatbot Ativo: Bot ${chatbotId} (mesmo com menu fechado)`;
    mensagem.style.display = "block";
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
}

document.addEventListener("DOMContentLoaded", () => {
  const publicarBtn = document.getElementById("publicarBtn");
  if (!publicarBtn) return;

  publicarBtn.addEventListener("click", () => {
    const botItem = document.querySelector(".bot-item");
    if (!botItem) return;

    const statusSpan = botItem.querySelector(".status");
    const dataAtual = new Date().toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    statusSpan.textContent = `Estado: Publicado - Município • ${dataAtual}`;
    botItem.classList.remove("nao-publicado");
  });
});

function mostrarSecao(secao) {
  document.querySelectorAll('.secao').forEach(div => div.style.display = 'none');
  document.querySelectorAll('aside li').forEach(li => li.classList.remove("active"));

  const id = `secao${secao.charAt(0).toUpperCase() + secao.slice(1)}`;
  const div = document.getElementById(id);

  if (div) {
    div.style.display = 'block';
    const menu = document.getElementById(`menu${secao.charAt(0).toUpperCase() + secao.slice(1)}`);
    if (menu) menu.classList.add("active");

    if (secao === "respostas" && window.chatbotSelecionado) {
      carregarTabelaFAQs(window.chatbotSelecionado, true);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const chatbotId = localStorage.getItem("chatbotSelecionado");
  const chatbotAtivo = localStorage.getItem("chatbotAtivo");

  if (chatbotId) {
    window.chatbotSelecionado = parseInt(chatbotId);
    const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
    window.fonteSelecionada = fonte;

    const botAtivoBtn = document.querySelector(`.bot-ativo-btn[onclick*="${chatbotId}"]`);
    if (botAtivoBtn) botAtivoBtn.classList.add("ativo");

    const statusEl = document.getElementById("botAtivoStatus");
    if (statusEl) statusEl.style.display = "inline-block";
  } else {
    window.chatbotSelecionado = null;
    window.fonteSelecionada = "faq";
  }

  if (chatbotAtivo) {
    const msgEl = document.getElementById("botAtivoMensagem");
    if (msgEl) {
      msgEl.innerText = `Chatbot Ativo: Bot ${chatbotAtivo} (mesmo com menu fechado)`;
      msgEl.style.display = "block";
    }

    document.querySelectorAll(".ativo-label").forEach(el => el.style.display = "none");
    const ativoLabel = document.querySelector(`.bot-item[data-chatbot-id="${chatbotAtivo}"] .ativo-label`);
    if (ativoLabel) ativoLabel.style.display = "inline";
  }

  carregarChatbots();

  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);

  const dropdown = document.querySelector(`.bot-item[data-chatbot-id="${window.chatbotSelecionado}"]`)
    ?.parentElement?.querySelector(".bot-dropdown");
  if (dropdown) {
    selecionarFonte(window.fonteSelecionada, dropdown);
  } else {
    console.warn("⚠️ Nenhum dropdown encontrado para o bot selecionado ao iniciar.");
  }
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
});