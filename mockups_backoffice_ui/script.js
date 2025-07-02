function mostrarFormulario() {
  const el = document.getElementById('faqContainer');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// Seleção de fonte de resposta
let fonteSelecionada = "faq";
let chatbotSelecionado = null;

function selecionarFonte(fonte) {
  fonteSelecionada = fonte;
  localStorage.setItem("fonteSelecionada", fonte);

  document.querySelectorAll(".resources .card").forEach((card, index) => {
    const fontes = ["faq", "faiss", "faq+raga"];
    card.classList.toggle("active", fontes[index] === fonte);
  });

  if (chatbotSelecionado) {
    carregarTabelaFAQs(chatbotSelecionado, true);
  }
}

// Enviar pergunta escrita
function enviarPergunta() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;
  adicionarMensagem("user", texto);
  input.value = "";
  responderPergunta(texto);
}

// Enviar pergunta por categoria
function perguntarCategoria(categoria) {
  adicionarMensagem("user", categoria);

  if (fonteSelecionada !== "faq") {
    return adicionarMensagem("bot", "⚠️ Apenas a fonte 'Baseado em Regras (FAQ)' está disponível.");
  }

  fetch(`http://localhost:5000/faq-categoria/${encodeURIComponent(categoria)}`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.pergunta && data.resposta) {
        adicionarMensagem("bot", data.pergunta);
        setTimeout(() => adicionarMensagem("bot", data.resposta), 600);
      } else {
        adicionarMensagem("bot", "❌ Não foi possível obter uma FAQ dessa categoria.");
      }
    })
    .catch(() => adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor."));
}

// Resposta manual
function responderPergunta(pergunta) {
  if (!chatbotSelecionado) return adicionarMensagem("bot", "❌ Nenhum chatbot selecionado.");

  fetch("http://localhost:5000/obter-resposta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta, chatbot_id: chatbotSelecionado })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        adicionarMensagem("bot", data.resposta);
      } else {
        adicionarMensagem("bot", "❌ Nenhuma resposta encontrada.");
      }
    })
    .catch(() => adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor."));
}

// Adicionar mensagens ao chat
function adicionarMensagem(tipo, texto) {
  const chat = document.getElementById("chatBody");
  const div = document.createElement("div");
  div.className = `message ${tipo}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Carregar chatbots no formulário
async function carregarChatbots() {
  try {
    const res = await fetch("http://localhost:5000/chatbots");
    const chatbots = await res.json();
    const select = document.querySelector('#faqForm select[name="chatbot_id"]');
    if (!select) return;

    select.innerHTML = chatbots.map(bot => `<option value="${bot.chatbot_id}">${bot.nome}</option>`).join('');
    chatbotSelecionado = parseInt(select.value);
    select.addEventListener("change", () => {
      chatbotSelecionado = parseInt(select.value);
      carregarTabelaFAQs(chatbotSelecionado, true);
    });

    carregarTabelaFAQs(chatbotSelecionado, true);
  } catch (err) {
    console.error("Erro ao carregar chatbots:", err);
  }
}

// Carregar FAQs para dropdown e para edição
async function carregarTabelaFAQs(chatbotId, paraDropdown = false) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/chatbot/${chatbotId}`);
    const faqs = await res.json();

    if (paraDropdown) {
      const container = document.getElementById("faqTabelaBot");
      if (!container) return;

      if (faqs.length === 0) {
        container.innerHTML = "<p>Sem FAQs associadas a este bot.</p>";
        return;
      }

      container.innerHTML = `
        <table class="faq-tabela">
          <thead>
            <tr><th>Categoria</th><th>Pergunta</th><th>Resposta</th></tr>
          </thead>
          <tbody>
            ${faqs.map(f => `
              <tr>
                <td>${f.categoria || '—'}</td>
                <td>${f.pergunta}</td>
                <td>${f.resposta}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      `;
    } else {
      mostrarRespostas();
    }
  } catch {
    if (paraDropdown) {
      const container = document.getElementById("faqTabelaBot");
      if (container) container.innerHTML = "<p>❌ Erro ao carregar FAQs do chatbot.</p>";
    }
  }
}

// Mostrar todas as FAQs com botão eliminar
async function mostrarRespostas() {
  const lista = document.getElementById('listaFAQs');
  if (!lista) return;

  try {
    const res = await fetch("http://localhost:5000/faqs");
    const faqs = await res.json();

    lista.innerHTML = faqs.length ? faqs.map(faq => `
      <div class="faq-item">
        <strong>${faq.designacao}</strong><br>
        <em>${faq.pergunta}</em><br>
        <p>${faq.resposta}</p>
        <button onclick="pedirConfirmacao(${faq.faq_id})">Eliminar</button>
        <hr>
      </div>
    `).join('') : "<p>Sem FAQs registadas.</p>";
  } catch {
    lista.innerHTML = "<p>❌ Erro ao carregar FAQs.</p>";
  }
}

// Eliminar FAQ com confirmação
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

async function eliminarFAQ(faq_id) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/${faq_id}`, { method: "DELETE" });
    if (res.ok) mostrarRespostas();
    else alert("❌ Erro ao eliminar FAQ.");
  } catch {
    alert("❌ Erro de comunicação com o servidor.");
  }
}

// Submeter nova FAQ manualmente
document.getElementById('faqForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const msg = document.getElementById('mensagemFAQ');
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
      msg.textContent = "⚠️ Esta FAQ já foi inserida.";
      msg.style.color = "orange";
    } else if (result.success) {
      msg.textContent = "✅ FAQ adicionada com sucesso!";
      msg.style.color = "green";
      this.reset();
      carregarTabelaFAQs(chatbotSelecionado);
    } else {
      msg.textContent = "❌ Erro ao adicionar FAQ.";
      msg.style.color = "red";
    }
  } catch {
    msg.textContent = "❌ Erro ao comunicar com o servidor.";
    msg.style.color = "red";
  }

  setTimeout(() => msg.textContent = '', 4000);
});

// Upload de ficheiro .docx com FAQs
document.getElementById('uploadForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const uploadStatus = document.getElementById('uploadStatus');
  const fileInput = this.querySelector('input[name="file"]');
  if (!fileInput.files.length) {
    uploadStatus.textContent = "⚠️ Nenhum ficheiro selecionado.";
    uploadStatus.style.color = "orange";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await fetch("http://localhost:5000/upload-faq-docx", {
      method: "POST",
      body: formData
    });
    const result = await res.json();

    if (res.status === 409) {
      uploadStatus.textContent = "⚠️ Esta FAQ já foi carregada anteriormente.";
      uploadStatus.style.color = "orange";
    } else if (result.success) {
      uploadStatus.textContent = "✅ Documento carregado com sucesso!";
      uploadStatus.style.color = "green";
      fileInput.value = '';
      carregarTabelaFAQs(chatbotSelecionado);
    } else {
      uploadStatus.textContent = "❌ Erro ao processar o ficheiro.";
      uploadStatus.style.color = "red";
    }
  } catch {
    uploadStatus.textContent = "❌ Erro de comunicação com o servidor.";
    uploadStatus.style.color = "red";
  }

  setTimeout(() => uploadStatus.textContent = '', 4000);
});

window.addEventListener("DOMContentLoaded", () => {
  carregarChatbots();
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
  selecionarFonte(localStorage.getItem("fonteSelecionada") || "faq");
});

window.addEventListener("hashchange", () => {
  const hash = window.location.hash.replace('#', '') || 'recursos';
  mostrarSecao(hash);
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
    if (secao === "respostas") carregarTabelaFAQs(chatbotSelecionado);
  }
}

function toggleBotDropdown(botItem) {
  const dropdown = botItem.parentElement.querySelector(".bot-dropdown");
  const expanded = botItem.classList.toggle("expanded");
  dropdown.style.display = expanded ? "block" : "none";
}

document.getElementById("publicarBtn").addEventListener("click", () => {
  const botItem = document.querySelector(".bot-item");
  if (!botItem) return;

  const statusSpan = botItem.querySelector(".status");
  const dataAtual = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });

  statusSpan.textContent = `Estado: Publicado - Município • ${dataAtual}`;
  botItem.classList.remove("nao-publicado");
});