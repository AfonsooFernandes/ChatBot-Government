function adicionarMensagem(tipo, texto) {
  const chat = document.getElementById("chatBody");
  if (!chat) return;
  const div = document.createElement("div");
  div.className = `message ${tipo}`;
  div.textContent = texto;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function carregarChatbots() {
  try {
    const res = await fetch("http://localhost:5000/chatbots");
    const chatbots = await res.json();

    const selects = document.querySelectorAll('select[name="chatbot_id"]');
    if (!selects.length) return;
    const chatbotIdSelecionado = localStorage.getItem("chatbotSelecionado");

    selects.forEach(select => {
      select.innerHTML = '<option value="">Selecione o Chatbot</option>' +
        '<option value="todos">Todos os Chatbots</option>' +
        chatbots.map(bot => `<option value="${String(bot.chatbot_id)}">${bot.nome}</option>`).join('');

      const estaEmFormulario = !!select.closest("form");

      if (!estaEmFormulario && chatbotIdSelecionado && !isNaN(parseInt(chatbotIdSelecionado))) {
        select.value = chatbotIdSelecionado;
      }

      select.addEventListener("change", () => {
        const val = select.value;
        window.chatbotSelecionado = val === "todos" ? null : parseInt(val);
        if (val !== "todos") carregarTabelaFAQs(window.chatbotSelecionado, true);
      });
    });

    if (chatbotIdSelecionado && !isNaN(parseInt(chatbotIdSelecionado))) {
      window.chatbotSelecionado = parseInt(chatbotIdSelecionado);
      carregarTabelaFAQs(window.chatbotSelecionado, true);
    }

  } catch (err) {
    console.error("❌ Erro ao carregar chatbots:", err);
  }
}

async function carregarTabelaFAQs(chatbotId, paraDropdown = false) {
  if (!chatbotId) {
    const container = document.getElementById(`faqTabelaBot-${chatbotId}`);
    if (container) container.innerHTML = "<p>⚠️ Nenhum chatbot selecionado ou ativo.</p>";
    return;
  }
  try {
    const res = await fetch(`http://localhost:5000/faqs/chatbot/${chatbotId}`);
    let faqs = await res.json();
    faqs.sort((a, b) => a.faq_id - b.faq_id);

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
  if (!lista) {
    console.error("Elemento listaFAQs não encontrado.");
    return;
  }

  lista.innerHTML = "<p>A carregar faqs...</p>";

  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo")) || window.chatbotSelecionado;
  if (!chatbotId) {
    lista.innerHTML = "<p>⚠️ Nenhum chatbot ativo ou selecionado. Vá a Recursos para selecionar um.</p>";
    return;
  }

  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const faqs = await res.json();
        return faqs;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  try {
    const faqs = await fetchWithRetry(`http://localhost:5000/faqs/chatbot/${chatbotId}`);

    if (!faqs.length) {
      lista.innerHTML = "<p>Sem FAQs registadas para este chatbot.</p>";
      return;
    }

    lista.innerHTML = `
      <input type="text" id="pesquisaFAQ" placeholder="🔍 Procurar pergunta..." style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 6px;">
      <div id="faqResultados"></div>
    `;

    const resultados = document.getElementById("faqResultados");

    function renderizarFAQs(filtradas) {
      resultados.innerHTML = filtradas.map(faq => `
        <div class="faq-item">
          <strong>${faq.pergunta || 'Sem pergunta'}</strong><br>
          <p>${faq.resposta || 'Sem resposta'}</p>
          <button onclick="pedirConfirmacao(${faq.faq_id})">Eliminar</button>
          <hr>
        </div>
      `).join('');
    }

    renderizarFAQs(faqs);

    const input = document.getElementById("pesquisaFAQ");
    input.addEventListener("input", () => {
      const termo = input.value.toLowerCase().trim();
      const filtradas = faqs.filter(faq =>
        faq.pergunta.toLowerCase().includes(termo) ||
        (faq.resposta && faq.resposta.toLowerCase().includes(termo))
      );
      renderizarFAQs(filtradas);
    });

  } catch (error) {
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
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));
  if (!chatbotId || isNaN(chatbotId)) {
    adicionarMensagem("bot", "⚠️ Nenhum chatbot ativo. Por favor, selecione um chatbot ativo no menu de recursos.");
    return;
  }

  const fonte = localStorage.getItem(`fonteSelecionada_bot${chatbotId}`) || "faq";
  fetch("http://localhost:5000/obter-resposta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta, chatbot_id: chatbotId, fonte })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        adicionarMensagem("bot", data.resposta);
        obterPerguntasSemelhantes(pergunta, chatbotId);
      } else {
        adicionarMensagem("bot", data.erro || "❌ Nenhuma resposta encontrada.");
      }
    })
    .catch(() => adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor."));
}

function obterPerguntasSemelhantes(perguntaOriginal, chatbotId) {
  if (!chatbotId || isNaN(chatbotId)) {
    console.warn("⚠️ Chatbot ID inválido para buscar perguntas semelhantes.");
    return;
  }
  fetch("http://localhost:5000/perguntas-semelhantes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pergunta: perguntaOriginal, chatbot_id: chatbotId })
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
  const chatbotId = parseInt(localStorage.getItem("chatbotAtivo"));
  if (!chatbotId || isNaN(chatbotId)) {
    adicionarMensagem("bot", "⚠️ Nenhum chatbot ativo. Por favor, selecione um chatbot ativo no menu de recursos.");
    return;
  }
  try {
    const res = await fetch(`http://localhost:5000/faq-categoria/${encodeURIComponent(categoria)}?chatbot_id=${chatbotId}`);
    const data = await res.json();

    if (data.success) {
      adicionarMensagem("user", `📂 Categoria: ${categoria}`);
      adicionarMensagem("bot", data.resposta);
      if (data.pergunta) obterPerguntasSemelhantes(data.pergunta, chatbotId);
    } else {
      adicionarMensagem("bot", data.erro || `❌ Nenhuma FAQ encontrada para a categoria '${categoria}' no Bot ${chatbotId}.`);
    }
  } catch (err) {
    adicionarMensagem("bot", "❌ Erro ao comunicar com o servidor. Verifique se o servidor está ativo.");
  }
}

document.querySelectorAll(".faqForm").forEach(faqForm => {
  const statusDiv = document.createElement("div");
  statusDiv.className = "faqStatus";
  statusDiv.style.marginTop = "10px";
  faqForm.appendChild(statusDiv);

  faqForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const form = e.target;
    const chatbotIdRaw = form.querySelector('select[name="chatbot_id"]').value;

    const dadosBase = {
      categoria_id: parseInt(form.categoria_id.value) || null,
      designacao: form.designacao.value.trim(),
      pergunta: form.pergunta.value.trim(),
      resposta: form.resposta.value.trim(),
      documentos: form.documentos.value.trim(),
      relacionadas: form.relacionadas.value.trim()
    };

    try {
      if (chatbotIdRaw === "todos") {
        const resBots = await fetch("http://localhost:5000/chatbots");
        const chatbots = await resBots.json();

        for (const bot of chatbots) {
          const data = { ...dadosBase, chatbot_id: bot.chatbot_id };
          await fetch("http://localhost:5000/faqs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
          });
        }

        statusDiv.innerHTML = "✅ FAQ adicionada a todos os chatbots!";
        statusDiv.style.color = "green";
        form.reset();
        mostrarRespostas();
      } else {
        const data = { chatbot_id: parseInt(chatbotIdRaw), ...dadosBase };
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
          carregarTabelaFAQs(parseInt(chatbotIdRaw), true);
          mostrarRespostas();
        } else {
          statusDiv.innerHTML = `❌ Erro: ${resultado.error || resultado.erro || "Erro desconhecido."}`;
          statusDiv.style.color = "red";
        }
      }
    } catch (err) {
      statusDiv.innerHTML = "❌ Erro de comunicação com o servidor.";
      statusDiv.style.color = "red";
      console.error(err);
    }
  });
});

document.querySelectorAll(".uploadForm").forEach(uploadForm => {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const uploadStatus = uploadForm.querySelector(".uploadStatus") || document.getElementById("uploadStatus");
    const formData = new FormData(uploadForm);

    const container = uploadForm.closest(".bot-dropdown");
    const selectChatbot = container?.querySelector('select[name="chatbot_id"]');
    const chatbotIdSelecionado = selectChatbot?.value;

    if (!chatbotIdSelecionado) {
      uploadStatus.innerHTML = "❌ Selecione um chatbot antes de enviar.";
      uploadStatus.style.color = "red";
      return;
    }

    formData.append("chatbot_id", chatbotIdSelecionado);

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

        if (chatbotIdSelecionado !== "todos") {
          carregarTabelaFAQs(parseInt(chatbotIdSelecionado), true);
        }

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
});

window.carregarChatbots = carregarChatbots;
window.carregarTabelaFAQs = carregarTabelaFAQs;
window.mostrarRespostas = mostrarRespostas;
window.eliminarFAQ = eliminarFAQ;
window.responderPergunta = responderPergunta;
window.obterPerguntasSemelhantes = obterPerguntasSemelhantes;
window.pedirConfirmacao = pedirConfirmacao;
window.responderComCategoria = responderComCategoria;