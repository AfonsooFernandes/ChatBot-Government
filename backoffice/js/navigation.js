// Mostrar apenas a secção correspondente ao hash atual
function mostrarSecao(secao) {
  // Esconder todas as secções
  document.querySelectorAll('.secao').forEach(div => div.style.display = 'none');

  // Remover classe ativa de todos os itens do menu
  document.querySelectorAll('aside li').forEach(li => li.classList.remove("active"));

  // Construir ID da div com base na hash (ex: 'respostas' → 'secaoRespostas')
  const id = `secao${secao.charAt(0).toUpperCase() + secao.slice(1)}`;
  const div = document.getElementById(id);

  // Mostrar a secção se existir
  if (div) {
    div.style.display = 'block';

    // Ativar o item de menu correspondente
    const menu = document.getElementById(`menu${secao.charAt(0).toUpperCase() + secao.slice(1)}`);
    if (menu) menu.classList.add("active");

    // Se for a secção de respostas, atualizar lista de FAQs
    if (secao === "respostas") carregarTabelaFAQs(chatbotSelecionado);
  }
}

// Inicializar ao carregar a página
window.addEventListener("DOMContentLoaded", () => {
  carregarChatbots(); // de faq.js
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
  selecionarFonte(localStorage.getItem("fonteSelecionada") || "faq");
});

// Atualizar ao mudar o hash da URL (navegação pelo menu)
window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
});