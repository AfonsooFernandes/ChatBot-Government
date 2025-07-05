// Função para selecionar a fonte do bot
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

// Função para mostrar/esconder o formulário de inserção de FAQ
function mostrarFormulario() {
  const el = document.getElementById('faqContainer');
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

// Função para expandir ou fechar dropdown do bot
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

    window.chatbotSelecionado = chatbotId;
    localStorage.setItem("chatbotSelecionado", chatbotId);

    const fonteSalva = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
    selecionarFonte(fonteSalva, dropdown);

    if (typeof carregarTabelaFAQs === "function") {
      carregarTabelaFAQs(chatbotId, true);
    } else {
      console.warn("⚠️ Função carregarTabelaFAQs não está definida.");
    }
  }
}

// Botão "Publicar"
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
  if (chatbotId) {
    window.chatbotSelecionado = parseInt(chatbotId);
    const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
    window.fonteSelecionada = fonte;
  } else {
    window.chatbotSelecionado = null;
    window.fonteSelecionada = "faq";
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