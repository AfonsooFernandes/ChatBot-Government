// ID da FAQ a eliminar
let faqIdAEliminar = null;

// Função chamada ao clicar no botão "Eliminar"
function pedirConfirmacao(id) {
  faqIdAEliminar = id;
  document.getElementById("modalConfirmacao").style.display = "flex";
}

// Evento: Confirmar eliminação
document.getElementById("confirmarEliminacao").addEventListener("click", () => {
  eliminarFAQ(faqIdAEliminar); // definida em faq.js
  document.getElementById("modalConfirmacao").style.display = "none";
});

// Evento: Cancelar eliminação
document.getElementById("cancelarEliminacao").addEventListener("click", () => {
  document.getElementById("modalConfirmacao").style.display = "none";
});