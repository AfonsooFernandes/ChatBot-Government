let botIdAEliminar = null;

window.abrirModalEliminarBot = function(chatbot_id) {
  botIdAEliminar = chatbot_id;
  const modal = document.getElementById('modalConfirmarEliminarBot');
  if (modal) modal.style.display = 'flex';
};

window.fecharModalEliminarBot = function() {
  botIdAEliminar = null;
  const modal = document.getElementById('modalConfirmarEliminarBot');
  if (modal) modal.style.display = 'none';
};

document.addEventListener("DOMContentLoaded", function () {
  const btnSim = document.getElementById('btnConfirmarEliminarBot');
  const btnNao = document.getElementById('btnCancelarEliminarBot');
  if (btnSim) {
    btnSim.onclick = async function () {
      if (botIdAEliminar !== null) {
        await eliminarChatbotConfirmado(botIdAEliminar);
      }
      window.fecharModalEliminarBot();
    };
  }
  if (btnNao) {
    btnNao.onclick = window.fecharModalEliminarBot;
  }
});

async function eliminarChatbotConfirmado(chatbot_id) {
  try {
    const res = await fetch(`http://localhost:5000/chatbots/${chatbot_id}`, { method: "DELETE" });
    if (res.ok) {
      carregarTabelaBots();
    } else {
      alert("Erro ao eliminar o chatbot!");
    }
  } catch (e) {
    alert("Erro ao comunicar com o servidor.");
  }
}

async function carregarTabelaBots() {
  const container = document.getElementById("botsTabelaContainer");
  if (!container) return;
  container.innerHTML = "<p>A carregar bots...</p>";

  try {
    const res = await fetch("http://localhost:5000/chatbots");
    let bots = await res.json();
    if (!Array.isArray(bots) || bots.length === 0) {
      container.innerHTML = "<p>Nenhum bot encontrado.</p>";
      return;
    }

    for (const bot of bots) {
      try {
        const fonteRes = await fetch(`http://localhost:5000/fonte/${bot.chatbot_id}`);
        const fonteData = await fonteRes.json();
        bot.fonte = fonteData.fonte || "faq";
      } catch {
        bot.fonte = "faq";
      }
    }

    bots = aplicarFiltrosBots(bots);

    if (!Array.isArray(bots) || bots.length === 0) {
      container.innerHTML = "<p>Nenhum bot encontrado.</p>";
      return;
    }

    container.innerHTML = `
      <table class="bots-tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Data de Criação</th>
            <th>Estado</th>
            <th>Fonte</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${bots.map(bot => `
            <tr data-chatbot-id="${bot.chatbot_id}">
              <td>${bot.nome || "-"}</td>
              <td>${bot.descricao || "-"}</td>
              <td>${formatarData(bot.data_criacao)}</td>
              <td>
                <span class="estado-indicador ${isAtivo(bot.chatbot_id) ? "ativo" : "inativo"}">
                  ${isAtivo(bot.chatbot_id) ? "Ativo" : "Não Publicado"}
                </span>
              </td>
              <td>
                <span class="fonte-indicador">${obterNomeFonte(bot.fonte)}</span>
              </td>
              <td>
                <button class="btn-ativo" onclick="tornarBotAtivo(${bot.chatbot_id}, this)">
                  ${isAtivo(bot.chatbot_id) ? "Ativo" : "Tornar Ativo"}
                </button>
                <button class="btn-editar" onclick="abrirModalAtualizar(${bot.chatbot_id})">Atualizar</button>
                <button class="btn-eliminar" onclick="abrirModalEliminarBot(${bot.chatbot_id})">Eliminar</button>
                <button class="btn-adicionar-faq" onclick="abrirModalAdicionarFAQ(${bot.chatbot_id})">Ad+</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  } catch (e) {
    container.innerHTML = `<p style="color:red;">Erro ao carregar bots: ${e.message}</p>`;
  }
}

function aplicarFiltrosBots(bots) {
  const nomeFiltro = document.getElementById("filtroNomeBot")?.value?.trim().toLowerCase() || "";
  const estadoFiltro = document.getElementById("filtroEstadoBot")?.value || "todos";
  const dataFiltro = document.getElementById("filtroDataCriacaoBot")?.value || "";

  return bots.filter(bot => {
    if (nomeFiltro && !(bot.nome || "").toLowerCase().includes(nomeFiltro)) return false;
    const ativo = isAtivo(bot.chatbot_id);
    if (estadoFiltro === "ativo" && !ativo) return false;
    if (estadoFiltro === "nao_publicado" && ativo) return false;
    if (dataFiltro) {
      const dataBot = bot.data_criacao ? new Date(bot.data_criacao) : null;
      const dataSelecionada = new Date(dataFiltro + "T00:00:00");
      if (!dataBot || dataBot < dataSelecionada) return false;
    }
    return true;
  });
}

function formatarData(dataStr) {
  if (!dataStr) return "-";
  const data = new Date(dataStr);
  if (isNaN(data.getTime())) return "-";
  return data.toLocaleDateString('pt-PT');
}

function obterNomeFonte(fonte) {
  if (fonte === "faq") return "Baseado em Regras (FAQ)";
  if (fonte === "faiss") return "Só FAISS";
  if (fonte === "faq+raga") return "FAQ + fallback RAG";
  return fonte;
}

function isAtivo(chatbot_id) {
  return String(localStorage.getItem("chatbotAtivo")) === String(chatbot_id);
}

window.tornarBotAtivo = function(chatbot_id, btn) {
  localStorage.setItem("chatbotAtivo", chatbot_id);
  carregarTabelaBots();
};

window.abrirModalAtualizar = async function(chatbot_id) {
  try {
    const res = await fetch(`http://localhost:5000/chatbots`);
    const bots = await res.json();
    const bot = bots.find(b => String(b.chatbot_id) === String(chatbot_id));
    if (!bot) {
      alert("Chatbot não encontrado!");
      return;
    }

    document.getElementById("editarNomeChatbot").value = bot.nome || "";
    document.getElementById("editarDescricaoChatbot").value = bot.descricao || "";
    document.getElementById("editarDataCriacao").value = bot.data_criacao ? new Date(bot.data_criacao).toLocaleDateString('pt-PT') : "";
    document.getElementById("editarFonteResposta").value = bot.fonte || "faq";
    document.getElementById("editarChatbotForm").setAttribute("data-edit-id", chatbot_id);

    const botCategorias = Array.isArray(bot.categorias) ? bot.categorias.map(c => String(c)) : [];
    const catDiv = document.getElementById("editarCategoriasChatbot");
    catDiv.innerHTML = "<span style='color:#888'>A carregar categorias...</span>";
    const resCat = await fetch("http://localhost:5000/categorias");
    const categorias = await resCat.json();

    catDiv.innerHTML = categorias.map(cat =>
      `<label style="display:flex; align-items:center; gap:4px;">
        <input type="checkbox" name="categoria" value="${cat.categoria_id}" ${botCategorias.includes(String(cat.categoria_id)) ? "checked" : ""}>
        ${cat.nome}
      </label>`
    ).join("");

    document.getElementById("modalEditarChatbot").style.display = "flex";
  } catch (e) {
    alert("Erro ao carregar dados do chatbot.");
  }
};

window.addEventListener("DOMContentLoaded", function() {
  carregarTabelaBots();

  ["filtroNomeBot", "filtroEstadoBot", "filtroDataCriacaoBot"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", carregarTabelaBots);
      el.addEventListener("change", carregarTabelaBots);
    }
  });
});

window.abrirModalAdicionarFAQ = async function(chatbot_id) {
  document.getElementById('faqChatbotId').value = chatbot_id;
  document.getElementById('docxChatbotId').value = chatbot_id;

  const select = document.getElementById("faqCategoriaSelect");
  select.innerHTML = '<option value="">Escolha a categoria</option>';
  try {
    const resCat = await fetch("http://localhost:5000/categorias");
    const categorias = await resCat.json();
    for (const cat of categorias) {
      const opt = document.createElement("option");
      opt.value = cat.categoria_id;
      opt.innerText = cat.nome;
      select.appendChild(opt);
    }
  } catch {}

  document.getElementById("modalAdicionarFAQ").style.display = "flex";
  if (document.getElementById("mensagemAdicionarFAQ"))
    document.getElementById("mensagemAdicionarFAQ").innerHTML = "";
  if (window.adicionarListenersFormulariosFAQ) window.adicionarListenersFormulariosFAQ();
  if (window.adicionarListenersUploadDocx) window.adicionarListenersUploadDocx();
};

window.fecharModalAdicionarFAQ = function() {
  document.getElementById("modalAdicionarFAQ").style.display = "none";
};

window.fecharModalEditarChatbot = function() {
  document.getElementById("modalEditarChatbot").style.display = "none";
};