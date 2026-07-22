import { apiFetch, requireAuth, clearToken } from "./api.js";

requireAuth();

const grid = document.getElementById("grid");
const msgBox = document.getElementById("msg");
const userNameEl = document.getElementById("user-name");
const userAvatarEl = document.getElementById("user-avatar");

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "index.html";
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

async function loadUser() {
  try {
    const user = await apiFetch("/api/users/me");
    userNameEl.textContent = user.name;

    if (user.profilePictureUrl) {
      userAvatarEl.src = user.profilePictureUrl;
      userAvatarEl.hidden = false;
    } else {
      userAvatarEl.hidden = true;
    }
  } catch (_) {
    // se falhar, o interceptor de 401 já redireciona; qualquer outro erro é silencioso aqui
  }
}

async function loadCatalogues() {
  grid.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Carregando...</p>`;

  try {
    const catalogues = await apiFetch("/api/catalogues");
    renderGrid(catalogues);
  } catch (error) {
    msgBox.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
    grid.innerHTML = "";
  }
}

function renderGrid(catalogues) {
  if (catalogues.length === 0) {
    grid.innerHTML = "";
    grid.insertAdjacentHTML(
      "beforebegin",
      `<div class="empty-state">
        <h2>Nenhum catálogo ainda</h2>
        <p>Crie o primeiro pra começar a montar suas páginas.</p>
        <br />
        <button class="btn-primary" id="empty-create-btn">Criar catálogo</button>
      </div>`
    );
    document.getElementById("empty-create-btn").addEventListener("click", createCatalogue);
    return;
  }

  const cards = catalogues
    .map(
      (c) => `
      <div class="catalogue-card" data-id="${c.id}">
        <a href="editor.html?id=${c.id}" style="text-decoration:none; color:inherit;">
          <h3>${escapeHtml(c.title)}</h3>
          <p class="meta">Atualizado em ${formatDate(c.updatedAt)}</p>
        </a>
        <div class="card-actions">
          <button class="btn-danger delete-btn" data-id="${c.id}">Excluir</button>
        </div>
      </div>`
    )
    .join("");

  grid.innerHTML = cards + `<button class="new-catalogue-card" id="new-card-btn">+ Novo catálogo</button>`;

  document.getElementById("new-card-btn").addEventListener("click", createCatalogue);

  grid.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm("Excluir este catálogo? Essa ação não pode ser desfeita.")) return;

      try {
        await apiFetch(`/api/catalogues/${id}`, { method: "DELETE" });
        loadCatalogues();
      } catch (error) {
        msgBox.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
      }
    });
  });
}

async function createCatalogue() {
  const title = prompt("Título do novo catálogo:", "Novo catálogo");
  if (!title || !title.trim()) return;

  try {
    const catalogue = await apiFetch("/api/catalogues", {
      method: "POST",
      body: {
        title: title.trim(),
        pageSettings: { width: 595, height: 842, backgroundColor: "#FFFFFF" },
      },
    });
    window.location.href = `editor.html?id=${catalogue.id}`;
  } catch (error) {
    msgBox.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  }
}

loadUser();
loadCatalogues();