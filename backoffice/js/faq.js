// Carregar todos os chatbots no <select>
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

// Carrega as FAQs associadas a um chatbot
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
            <tr><th>ID</th><th>Categoria</th><th>Pergunta</th><th>Resposta</th></tr>
          </thead>
          <tbody>
            ${faqs.map(f => `
              <tr>
                <td>${f.faq_id}</td>
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

// Mostra todas as FAQs existentes no sistema
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

// Elimina uma FAQ pelo ID
async function eliminarFAQ(faq_id) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/${faq_id}`, { method: "DELETE" });
    if (res.ok) mostrarRespostas();
    else alert("❌ Erro ao eliminar FAQ.");
  } catch {
    alert("❌ Erro de comunicação com o servidor.");
  }
}

// Envia uma pergunta escrita e obtém resposta
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
        obterPerguntasSemelhantes(pergunta);
      } else {
        adicionarMensagem("bot", "❌ Nenhuma resposta encontrada.");
      }
    })
    .catch(() => adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor."));
}

// Obter perguntas semelhantes da mesma categoria
function obterPerguntasSemelhantes(perguntaOriginal) {
  fetch("http://localhost:5000/perguntas-semelhantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta: perguntaOriginal, chatbot_id: chatbotSelecionado })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.sugestoes.length > 0) {
        const chat = document.getElementById("chatBody");

        const divTitulo = document.createElement("div");
        divTitulo.className = "message bot";
        divTitulo.textContent = "📌 Perguntas semelhantes:";
        chat.appendChild(divTitulo);

        const btnContainer = document.createElement("div");
        btnContainer.style.display = "flex";
        btnContainer.style.gap = "10px";
        btnContainer.style.marginTop = "6px";
        btnContainer.style.flexWrap = "wrap";

        data.sugestoes.forEach(pergunta => {
          const btn = document.createElement("button");
          btn.className = "btn-similar";
          btn.textContent = pergunta;
          btn.onclick = () => {
            adicionarMensagem("user", pergunta);
            responderPergunta(pergunta);
          };
          btnContainer.appendChild(btn);
        });

        chat.appendChild(btnContainer);
        chat.scrollTop = chat.scrollHeight;
      }
    });
}

// Evento: Submeter nova FAQ manualmente
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

// Evento: Upload de ficheiro .docx com FAQs
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