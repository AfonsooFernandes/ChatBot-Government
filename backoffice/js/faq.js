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
    if (selects.length) {
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
    }

    const filtro = document.getElementById("filtroChatbot");
    if (filtro) {
      filtro.innerHTML = `<option value="">Todos os Chatbots</option>` +
        chatbots.map(bot => `<option value="${String(bot.chatbot_id)}">${bot.nome}</option>`).join('');
    }
  } catch (err) {
    console.error("❌ Erro ao carregar chatbots:", err);
  }
}

async function carregarTabelaFAQsBackoffice() {
  const lista = document.getElementById("listaFAQs");
  if (!lista) return;
  lista.innerHTML = "<p>A carregar FAQs...</p>";

  const textoPesquisa = (document.getElementById("pesquisaFAQ")?.value || "").toLowerCase();
  const filtroChatbot = document.getElementById("filtroChatbot")?.value || "";
  const filtroIdioma = document.getElementById("filtroIdioma")?.value || "";

  try {
    const [faqs, chatbots, categorias] = await Promise.all([
      fetch("http://localhost:5000/faqs/detalhes").then(r => r.json()),
      fetch("http://localhost:5000/chatbots").then(r => r.json()),
      fetch("http://localhost:5000/categorias").then(r => r.json())
    ]);

    const chatbotsMap = {};
    chatbots.forEach(bot => chatbotsMap[bot.chatbot_id] = bot.nome);

    const categoriasMap = {};
    categorias.forEach(cat => categoriasMap[cat.categoria_id] = cat.nome);

    let faqsFiltradas = faqs.filter(faq => {
      let matchPesquisa = true;
      if (textoPesquisa) {
        const target =
          (faq.designacao || "") + " " +
          (faq.pergunta || "") + " " +
          (faq.resposta || "");
        matchPesquisa = target.toLowerCase().includes(textoPesquisa);
      }
      let matchChatbot = true;
      if (filtroChatbot) matchChatbot = String(faq.chatbot_id) === filtroChatbot;
      let matchIdioma = true;
      if (filtroIdioma) matchIdioma = (faq.idioma || "").toLowerCase() === filtroIdioma.toLowerCase();

      return matchPesquisa && matchChatbot && matchIdioma;
    });

    lista.innerHTML = `
      <table class="faq-tabela-backoffice">
        <thead>
          <tr>
            <th>Chatbot</th>
            <th>Descrição</th>
            <th>Pergunta</th>
            <th>Documento</th>
            <th>Idioma</th>
            <th>Categorias da FAQ</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${faqsFiltradas.map(faq => {
            let docLinks = "";
            if (faq.links_documentos && faq.links_documentos.trim()) {
              docLinks = faq.links_documentos.split(",").map(link => {
                link = link.trim();
                if (!link) return "";
                return `<a href="${link}" target="_blank">${link.length > 35 ? link.slice(0, 32) + "..." : link}</a>`;
              }).join("<br>");
            }
            let flag = (faq.idioma === "pt" || faq.idioma === "Português") ?
              '<img src="images/pt.jpg" style="height:20px" title="Português">' : (faq.idioma || "-");
            return `
              <tr>
                <td>${chatbotsMap[faq.chatbot_id] || "-"}</td>
                <td>${faq.designacao || "-"}</td>
                <td>${faq.pergunta || "-"}</td>
                <td>${docLinks || "-"}</td>
                <td>${flag}</td>
                <td>${faq.categoria_nome || categoriasMap[faq.categoria_id] || "-"}</td>
                <td>
                  <button class="btn-remover" onclick="pedirConfirmacao(${faq.faq_id})">Remover</button>
                  <button class="btn-editar" onclick="editarFAQ(${faq.faq_id})">Editar</button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  } catch (err) {
    lista.innerHTML = "<p style='color:red;'>Erro ao carregar FAQs.</p>";
  }
}

async function carregarTabelaFAQs(chatbotId, paraDropdown = false) {
  if (paraDropdown) {
    const container = document.getElementById(`faqTabelaBot-${chatbotId}`);
    if (container) container.innerHTML = "";
    return;
  }
  carregarTabelaFAQsBackoffice();
}

async function mostrarRespostas() {
  carregarTabelaFAQsBackoffice();
}

function pedirConfirmacao(faq_id) {
  if (confirm("Tens a certeza que queres eliminar esta FAQ?")) {
    eliminarFAQ(faq_id);
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

async function eliminarFAQ(faq_id) {
  try {
    const res = await fetch(`http://localhost:5000/faqs/${faq_id}`, { method: "DELETE" });
    if (res.ok) mostrarRespostas();
    else alert("❌ Erro ao eliminar FAQ.");
  } catch {
    alert("❌ Erro de comunicação com o servidor.");
  }
}

window.carregarChatbots = carregarChatbots;
window.carregarTabelaFAQs = carregarTabelaFAQs;
window.carregarTabelaFAQsBackoffice = carregarTabelaFAQsBackoffice;
window.mostrarRespostas = mostrarRespostas;
window.eliminarFAQ = eliminarFAQ;
window.responderPergunta = responderPergunta;
window.obterPerguntasSemelhantes = obterPerguntasSemelhantes;
window.pedirConfirmacao = pedirConfirmacao;
window.responderComCategoria = responderComCategoria;

document.addEventListener("DOMContentLoaded", () => {
  carregarChatbots();
  carregarTabelaFAQsBackoffice();

  const pesquisaInput = document.getElementById("pesquisaFAQ");
  const filtroChatbot = document.getElementById("filtroChatbot");
  const filtroIdioma = document.getElementById("filtroIdioma");

  if (pesquisaInput) {
    pesquisaInput.addEventListener("input", carregarTabelaFAQsBackoffice);
  }
  if (filtroChatbot) {
    filtroChatbot.addEventListener("change", carregarTabelaFAQsBackoffice);
  }
  if (filtroIdioma) {
    filtroIdioma.addEventListener("change", carregarTabelaFAQsBackoffice);
  }
});