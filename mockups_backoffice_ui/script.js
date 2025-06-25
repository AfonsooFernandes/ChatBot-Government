// Mostrar ou ocultar o formulário de FAQ
function mostrarFormulario() {
  const faqContainer = document.getElementById('faqContainer');
  faqContainer.style.display = faqContainer.style.display === 'none' ? 'block' : 'none';
}

// Carregar lista de chatbots no dropdown
async function carregarChatbots() {
  try {
    const res = await fetch("http://localhost:5000/chatbots");
    const chatbots = await res.json();

    const chatbotSelect = document.querySelector('#faqForm select[name="chatbot_id"]') || document.getElementById("chatbot_id");
    if (chatbotSelect) {
      chatbotSelect.innerHTML = "";
      chatbots.forEach(bot => {
        const option = document.createElement("option");
        option.value = bot.chatbot_id;
        option.textContent = `${bot.nome} (${bot.categoria})`;
        chatbotSelect.appendChild(option);
      });
    }
  } catch (err) {
    console.error("Erro ao carregar chatbots:", err);
  }
}

// Mostrar lista de FAQs
async function mostrarRespostas() {
  const lista = document.getElementById('listaFAQs');
  if (!lista) return;

  try {
    const res = await fetch("http://localhost:5000/faqs");
    const faqs = await res.json();

    lista.innerHTML = "";
    if (faqs.length === 0) {
      lista.innerHTML = "<p>Sem FAQs registadas.</p>";
      return;
    }

    faqs.forEach(faq => {
      const div = document.createElement("div");
      div.className = "faq-item";
      div.innerHTML = `
        <strong>${faq.designacao}</strong><br>
        <em>${faq.pergunta}</em><br>
        <p>${faq.resposta}</p>
        <button onclick="pedirConfirmacao(${faq.faq_id})">Eliminar</button>
        <hr>
      `;
      lista.appendChild(div);
    });
  } catch (err) {
    lista.innerHTML = "<p>❌ Erro ao carregar FAQs.</p>";
  }
}

// Modal de confirmação personalizado
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

// Eliminar FAQ
async function eliminarFAQ(faq_id) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/${faq_id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      mostrarRespostas();
    } else {
      alert("❌ Erro ao eliminar FAQ.");
    }
  } catch (err) {
    alert("❌ Erro de comunicação com o servidor.");
  }
}

// Submissão do formulário de FAQ manual
document.getElementById('faqForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const mensagemFAQ = document.getElementById('mensagemFAQ');

  const formData = new FormData(this);
  const data = {
    chatbot_id: parseInt(formData.get("chatbot_id")),
    designacao: formData.get("designacao"),
    pergunta: formData.get("pergunta"),
    resposta: formData.get("resposta"),
    categoria_id: parseInt(formData.get("categoria_id")),
    documentos: formData.get("documentos"),
    relacionadas: formData.get("relacionadas")
  };

  try {
    const res = await fetch("http://localhost:5000/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.status === 409) {
      mensagemFAQ.textContent = '⚠️ Esta FAQ já foi inserida.';
      mensagemFAQ.style.color = 'orange';
    } else if (result.success) {
      mensagemFAQ.textContent = '✅ FAQ adicionada com sucesso!';
      mensagemFAQ.style.color = 'green';
      this.reset();
      mostrarRespostas();
    } else {
      mensagemFAQ.textContent = '❌ Erro ao adicionar FAQ.';
      mensagemFAQ.style.color = 'red';
    }
  } catch (err) {
    mensagemFAQ.textContent = '❌ Erro ao comunicar com o servidor.';
    mensagemFAQ.style.color = 'red';
  }

  setTimeout(() => mensagemFAQ.textContent = '', 4000);
});

// Submissão do upload de ficheiro .docx
document.getElementById('uploadForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const formData = new FormData();
  const fileInput = document.querySelector('#uploadForm input[name="file"]');
  const files = fileInput.files;
  const uploadStatus = document.getElementById('uploadStatus');

  if (files.length === 0) {
    uploadStatus.textContent = '⚠️ Nenhum ficheiro selecionado.';
    uploadStatus.style.color = 'orange';
    return;
  }

  formData.append('file', files[0]);

  try {
    const res = await fetch("http://localhost:5000/upload-faq-docx", {
      method: "POST",
      body: formData
    });

    const result = await res.json();
    if (res.status === 409) {
      uploadStatus.textContent = '⚠️ Esta FAQ já foi carregada anteriormente.';
      uploadStatus.style.color = 'orange';
    } else if (result.success) {
      uploadStatus.textContent = '✅ Documento carregado com sucesso!';
      uploadStatus.style.color = 'green';
      fileInput.value = '';
      mostrarRespostas();
    } else {
      uploadStatus.textContent = '❌ Erro ao processar o ficheiro.';
      uploadStatus.style.color = 'red';
    }
  } catch (error) {
    uploadStatus.textContent = '❌ Erro de comunicação com o servidor.';
    uploadStatus.style.color = 'red';
  }

  setTimeout(() => uploadStatus.textContent = '', 4000);
});

// Ao abrir a página: carregar secção com base no hash
window.addEventListener("DOMContentLoaded", () => {
  carregarChatbots();
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
});

// Reagir a mudanças no hash da URL (sem F5)
window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
});

// Função que mostra/esconde secções dinamicamente
function mostrarSecao(secao) {
  document.querySelectorAll('.secao').forEach(div => div.style.display = 'none');
  document.querySelectorAll('aside li').forEach(li => li.classList.remove("active"));

  const idSecao = `secao${secao.charAt(0).toUpperCase() + secao.slice(1)}`;
  const secaoDiv = document.getElementById(idSecao);
  if (secaoDiv) {
    secaoDiv.style.display = 'block';
    const menu = document.getElementById(`menu${secao.charAt(0).toUpperCase() + secao.slice(1)}`);
    if (menu) menu.classList.add("active");
    if (secao === "respostas") mostrarRespostas();
  }
}