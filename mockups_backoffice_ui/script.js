function adicionarFaq() {
  const categoria = document.getElementById('categoria').value;
  const pergunta = document.getElementById('pergunta').value.trim();
  const resposta = document.getElementById('resposta').value.trim();

  if (pergunta && resposta) {
    const div = document.createElement('div');
    div.classList.add('faq-item');
    div.innerHTML = `<strong>Categoria:</strong> ${categoria}<br><strong>P:</strong> ${pergunta}<br><strong>R:</strong> ${resposta}`;
    document.getElementById('faq-list').appendChild(div);

    document.getElementById('pergunta').value = '';
    document.getElementById('resposta').value = '';
  } else {
    alert("Preencha todos os campos!");
  }
}