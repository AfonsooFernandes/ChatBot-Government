// Mostrar apenas a secção correspondente ao hash atual
function mostrarSecao(secao) {
  document.querySelectorAll('.secao').forEach(div => div.style.display = 'none');

  document.querySelectorAll('aside li').forEach(li => li.classList.remove("active"));

  const id = `secao${secao.charAt(0).toUpperCase() + secao.slice(1)}`;
  const div = document.getElementById(id);

  if (div) {
    div.style.display = 'block';

    const menu = document.getElementById(`menu${secao.charAt(0).toUpperCase() + secao.slice(1)}`);
    if (menu) menu.classList.add("active");

    if (secao === "respostas") {
      mostrarRespostas();
    }
  }
}

// Inicializar ao carregar a página
window.addEventListener("DOMContentLoaded", () => {
  carregarChatbots(); 

  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);

  const chatbotId = localStorage.getItem("chatbotSelecionado");
  if (chatbotId) {
    chatbotSelecionado = parseInt(chatbotId);

    const fonteSalva = localStorage.getItem(`fonteSelecionada_bot${chatbotSelecionado}`) || "faq";

    const dropdown = document.querySelector(`.bot-item[data-chatbot-id="${chatbotSelecionado}"]`)
                     ?.parentElement?.querySelector(".bot-dropdown");

    if (dropdown) {
      selecionarFonte(fonteSalva, dropdown);
    } else {
      console.warn("⚠️ Nenhum dropdown encontrado para o bot selecionado ao iniciar.");
    }
  }
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
});