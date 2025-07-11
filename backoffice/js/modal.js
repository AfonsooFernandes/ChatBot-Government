let faqIdAEliminar = null;

function pedirConfirmacao(id) {
  faqIdAEliminar = id;
  document.getElementById("modalConfirmacao").style.display = "flex";
}

document.getElementById("confirmarEliminacao").addEventListener("click", () => {
  eliminarFAQ(faqIdAEliminar); 
  document.getElementById("modalConfirmacao").style.display = "none";
});

document.getElementById("cancelarEliminacao").addEventListener("click", () => {
  document.getElementById("modalConfirmacao").style.display = "none";
});