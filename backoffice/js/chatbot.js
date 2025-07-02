// Variáveis globais relacionadas com o bot e fonte
let fonteSelecionada = "faq";
let chatbotSelecionado = null;

// Mostrar ou esconder o formulário de inserção de FAQ
function mostrarFormulario() {
  const el = document.getElementById('faqContainer');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Selecionar a fonte de resposta do chatbot
function selecionarFonte(fonte) {
  fonteSelecionada = fonte;
  localStorage.setItem("fonteSelecionada", fonte);

  document.querySelectorAll(".resources .card").forEach((card, index) => {
    const fontes = ["faq", "faiss", "faq+raga"];
    card.classList.toggle("active", fontes[index] === fonte);
  });

  if (chatbotSelecionado) {
    carregarTabelaFAQs(chatbotSelecionado, true); // função de faq.js
  }
}

// Mostrar ou esconder o dropdown de configurações do bot
function toggleBotDropdown(botItem) {
  const dropdown = botItem.parentElement.querySelector(".bot-dropdown");
  const expanded = botItem.classList.toggle("expanded");
  dropdown.style.display = expanded ? "block" : "none";
}

// Botão "Publicar" – altera o estado do bot visualmente
document.getElementById("publicarBtn").addEventListener("click", () => {
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