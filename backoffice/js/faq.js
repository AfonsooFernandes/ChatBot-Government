async function carregarChatbots() {
  try {
    const res = await fetch("http://localhost:5000/chatbots");
    const chatbots = await res.json();

    const select = document.querySelector('#faqForm select[name="chatbot_id"]');
    if (!select) return;

    select.innerHTML = chatbots.map(bot =>
      `<option value="${bot.chatbot_id}">${bot.nome}</option>`
    ).join('');

    const chatbotId = localStorage.getItem("chatbotSelecionado");
    if (chatbotId && !isNaN(parseInt(chatbotId))) {
      window.chatbotSelecionado = parseInt(chatbotId);
      select.value = chatbotId;
    } else {
      window.chatbotSelecionado = parseInt(select.value);
    }

    select.addEventListener("change", () => {
      window.chatbotSelecionado = parseInt(select.value);
      carregarTabelaFAQs(window.chatbotSelecionado, true);
    });

    if (!isNaN(window.chatbotSelecionado)) {
      carregarTabelaFAQs(window.chatbotSelecionado, true);
    }

  } catch (err) {
    console.error("Erro ao carregar chatbots:", err);
  }
}

async function carregarTabelaFAQs(chatbotId, paraDropdown = false) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/chatbot/${chatbotId}`);
    const faqs = await res.json();

    if (paraDropdown) {
      const container = document.getElementById(`faqTabelaBot-${chatbotId}`);
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
      const container = document.getElementById(`faqTabelaBot-${chatbotId}`);
      if (container) container.innerHTML = "<p>❌ Erro ao carregar FAQs do chatbot.</p>";
    }
  }
}

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

function pedirConfirmacao(faq_id) {
  if (confirm("Tens a certeza que queres eliminar esta FAQ?")) {
    eliminarFAQ(faq_id);
  }
}

async function eliminarFAQ(faq_id) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/${faq_id}`, { method: "DELETE" });
    if (res.ok) mostrarRespostas();
    else alert("❌ Erro ao eliminar FAQ.");
  } catch {
    alert("❌ Erro de comunicação com o servidor.");
  }
}

function responderPergunta(pergunta) {
  if (!window.chatbotSelecionado) {
    adicionarMensagem("bot", "❌ Nenhum chatbot selecionado.");
    return;
  }

  const fonte = window.fonteSelecionada || "faq";
  fetch("http://localhost:5000/obter-resposta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pergunta: pergunta,
      chatbot_id: window.chatbotSelecionado,
      fonte: fonte
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        adicionarMensagem("bot", data.resposta);
        obterPerguntasSemelhantes(pergunta);
      } else {
        adicionarMensagem("bot", data.erro || "❌ Nenhuma resposta encontrada.");
      }
    })
    .catch(() => adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor."));
}

function obterPerguntasSemelhantes(perguntaOriginal) {
  fetch("http://localhost:5000/perguntas-semelhantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta: perguntaOriginal, chatbot_id: window.chatbotSelecionado })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.sugestoes.length > 0) {
        const chat = document.getElementById("chatBody");

        const divTitulo = document.createElement("div");
        divTitulo.className = "message bot";
        divTitulo.textContent = "🔎 Também lhe pode interessar:";
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

async function responderComCategoria(categoria) {
  if (!window.chatbotSelecionado) {
    adicionarMensagem("bot", "❌ Nenhum chatbot selecionado.");
    return;
  }

  try {
    const res = await fetch(`http://localhost:5000/faq-categoria/${categoria}?chatbot_id=${window.chatbotSelecionado}`);
    const data = await res.json();

    if (data.success) {
      adicionarMensagem("user", `📂 Categoria: ${categoria}`);
      adicionarMensagem("bot", data.resposta);

      if (data.pergunta) {
        obterPerguntasSemelhantes(data.pergunta);
      }
    } else {
      adicionarMensagem("bot", data.erro || "❌ Nenhuma FAQ encontrada para esta categoria.");
    }
  } catch (err) {
    console.error("Erro ao obter resposta por categoria:", err);
    adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor.");
  }
}

// Mensagem discreta após adicionar FAQ manualmente
const faqForm = document.getElementById("faqForm");
if (faqForm) {
  let statusDiv = document.createElement("div");
  statusDiv.id = "faqStatus";
  statusDiv.style.marginTop = "10px";
  faqForm.appendChild(statusDiv);

  faqForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.target;
    const data = {
      chatbot_id: parseInt(form.chatbot_id.value),
      categoria_id: parseInt(form.categoria_id.value) || null,
      designacao: form.designacao.value.trim(),
      pergunta: form.pergunta.value.trim(),
      resposta: form.resposta.value.trim(),
      documentos: form.documentos.value.trim(),
      relacionadas: form.relacionadas.value.trim()
    };

    try {
      const res = await fetch("http://localhost:5000/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const resultado = await res.json();

      if (res.ok && resultado.success) {
        statusDiv.innerHTML = "✅ FAQ adicionada com sucesso!";
        statusDiv.style.color = "green";
        form.reset();
        carregarTabelaFAQs(window.chatbotSelecionado, true);
        mostrarRespostas();
      } else {
        statusDiv.innerHTML = `❌ Erro: ${resultado.error || resultado.erro || "Erro desconhecido."}`;
        statusDiv.style.color = "red";
      }
    } catch (err) {
      statusDiv.innerHTML = "❌ Erro de comunicação com o servidor.";
      statusDiv.style.color = "red";
      console.error(err);
    }
  });
}

// Upload DOCX sem refresh
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const uploadStatus = document.getElementById("uploadStatus");
    const formData = new FormData(uploadForm);

    try {
      const res = await fetch("http://localhost:5000/upload-faq-docx", {
        method: "POST",
        body: formData
      });

      const resultado = await res.json();

      if (resultado.success) {
        uploadStatus.innerHTML = "✅ Documento carregado com sucesso!";
        uploadStatus.style.color = "green";
        mostrarRespostas();
        uploadForm.reset();
      } else {
        uploadStatus.innerHTML = `❌ Erro: ${resultado.error || "Erro ao carregar o documento."}`;
        uploadStatus.style.color = "red";
      }
    } catch (err) {
      uploadStatus.innerHTML = "❌ Erro de comunicação com o servidor.";
      uploadStatus.style.color = "red";
      console.error("Erro no upload:", err);
    }
  });
}

// Exportar para uso global
window.carregarChatbots = carregarChatbots;
window.carregarTabelaFAQs = carregarTabelaFAQs;
window.mostrarRespostas = mostrarRespostas;
window.eliminarFAQ = eliminarFAQ;
window.responderPergunta = responderPergunta;
window.obterPerguntasSemelhantes = obterPerguntasSemelhantes;
window.pedirConfirmacao = pedirConfirmacao;
window.responderComCategoria = responderComCategoria;