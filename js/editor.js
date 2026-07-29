import { apiFetch, requireAuth, clearToken, uploadImage } from "./api.js";

requireAuth();

const params = new URLSearchParams(window.location.search);
const catalogueId = params.get("id");
if (!catalogueId) {
  window.location.href = "dashboard.html";
  throw new Error("Sem id de catálogo na URL, redirecionando.");
}

const state = {
  catalogueId,
  catalogue: null,
  selectedId: null,
};

// ---------- referências ----------
const titleDisplay = document.getElementById("catalogue-title-display");
const titleInput = document.getElementById("catalogue-title");
const widthInput = document.getElementById("page-width");
const heightInput = document.getElementById("page-height");
const bgColorInput = document.getElementById("page-bg-color");
const bgImageFileInput = document.getElementById("page-bg-image-file");
const bgPreview = document.getElementById("page-bg-preview");
const savePageBtn = document.getElementById("save-page-btn");
const exportPngBtn = document.getElementById("export-png-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const addTextBtn = document.getElementById("add-text-btn");
const addImageBtn = document.getElementById("add-image-btn");
const imageFileInput = document.getElementById("image-file-input");
const pageCanvas = document.getElementById("page-canvas");
const pageSpec = document.getElementById("page-spec");
const propsPanel = document.getElementById("element-props");
const statusLine = document.getElementById("status-line");
const formatSelect = document.getElementById("page-format");
const orientationBtns = document.querySelectorAll(".orientation-btn");
const customSizeFields = document.getElementById("custom-size-fields");

let currentOrientation = "portrait";

const PT_PER_CM = 72 / 2.54; // ≈ 28.3465

const customWidthCm = document.getElementById("custom-width-cm");
const customHeightCm = document.getElementById("custom-height-cm");

function ptToCm(pt) {
  return Math.round((pt / PT_PER_CM) * 10) / 10; // 1 casa decimal
}

function cmToPt(cm) {
  return Math.round(cm * PT_PER_CM);
}

customWidthCm.addEventListener("input", () => {
  widthInput.value = cmToPt(Number(customWidthCm.value) || 0);
});

customHeightCm.addEventListener("input", () => {
  heightInput.value = cmToPt(Number(customHeightCm.value) || 0);
});

// Tamanhos em pt (72pt = 1 polegada), sempre no sentido retrato.
const PAGE_FORMATS = {
  A4: { width: 595, height: 842 },
  A3: { width: 842, height: 1191 },
  A5: { width: 420, height: 595 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
};

function detectFormatFromSize(width, height) {
  for (const [key, dims] of Object.entries(PAGE_FORMATS)) {
    if (width === dims.width && height === dims.height) return { format: key, orientation: "portrait" };
    if (width === dims.height && height === dims.width) return { format: key, orientation: "landscape" };
  }
  return { format: "CUSTOM", orientation: width >= height ? "landscape" : "portrait" };
}

function setOrientationUI(orientation) {
  currentOrientation = orientation;
  orientationBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.orientation === orientation);
  });
}

function applyFormatToInputs() {
  const format = formatSelect.value;

  if (format === "CUSTOM") {
    customSizeFields.hidden = false;
    customWidthCm.value = ptToCm(Number(widthInput.value) || PAGE_FORMATS.A4.width);
    customHeightCm.value = ptToCm(Number(heightInput.value) || PAGE_FORMATS.A4.height);
    return;
  }

  customSizeFields.hidden = true;
  const dims = PAGE_FORMATS[format];
  const isLandscape = currentOrientation === "landscape";
  widthInput.value = isLandscape ? dims.height : dims.width;
  heightInput.value = isLandscape ? dims.width : dims.height;
}

formatSelect.addEventListener("change", applyFormatToInputs);

orientationBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    setOrientationUI(btn.dataset.orientation);
    applyFormatToInputs();
  });
});

// URL da imagem de fundo pendente (ainda não salva) — null = sem imagem.
let pendingBgImageUrl = null;

// Fontes disponíveis pro seletor de fonte dos elementos de texto.
// Usamos famílias genéricas + fontes "web-safe" (já instaladas na maioria dos SOs),
// então não precisa carregar nada externo.
const FONT_OPTIONS = [
  { value: "serif", label: "Serifada (padrão)" },
  { value: "'Georgia', serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "sans-serif", label: "Sem serifa" },
  { value: "'Arial', sans-serif", label: "Arial" },
  { value: "'Verdana', sans-serif", label: "Verdana" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
  { value: "monospace", label: "Monoespaçada" },
  { value: "'Courier New', monospace", label: "Courier New" },
  { value: "cursive", label: "Cursiva" },
];

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "index.html";
});

function setStatus(text, type = "") {
  statusLine.textContent = text || "\u00A0";
  statusLine.className = `status-line ${type}`;
}

// Simula uma "borda" no texto empilhando vários text-shadow ao redor de cada
// letra (o -webkit-text-stroke não é bem suportado no export do html2canvas).
function buildTextStroke(color, width) {
  const w = Number(width) || 0;
  if (!color || w <= 0) return "none";
  const steps = 12;
  const shadows = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const x = (Math.cos(angle) * w).toFixed(2);
    const y = (Math.sin(angle) * w).toFixed(2);
    shadows.push(`${x}px ${y}px 0 ${color}`);
  }
  return shadows.join(", ");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---------- carregar catálogo ----------

async function loadCatalogue() {
  setStatus("Carregando catálogo...");
  try {
    const data = await apiFetch(`/api/catalogues/${state.catalogueId}`);
    state.catalogue = data;
    applyCatalogueToForm();
    renderPageFrame();
    renderElements();
    setStatus("");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function applyCatalogueToForm() {
  const { title, pageSettings } = state.catalogue;
  titleDisplay.textContent = title;
  titleInput.value = title;
  widthInput.value = pageSettings.width;
  heightInput.value = pageSettings.height;
  bgColorInput.value = pageSettings.backgroundColor || "#ffffff";
  pendingBgImageUrl = pageSettings.backgroundImageUrl || null;
  renderBgPreview();

  const { format, orientation } = detectFormatFromSize(pageSettings.width, pageSettings.height);
  formatSelect.value = format;
  setOrientationUI(orientation);
  customSizeFields.hidden = format !== "CUSTOM";
  if (format === "CUSTOM") {
    customWidthCm.value = ptToCm(pageSettings.width);
    customHeightCm.value = ptToCm(pageSettings.height);
  }
}

function renderBgPreview() {
  if (pendingBgImageUrl) {
    bgPreview.innerHTML = `
      <div style="margin-top:0.5rem; display:flex; align-items:center; gap:0.5rem;">
        <img src="${pendingBgImageUrl}" style="width:48px; height:48px; object-fit:cover; border-radius:3px;" />
        <button type="button" id="remove-bg-btn" class="btn-secondary" style="font-size:0.68rem; padding:0.3rem 0.5rem;">Remover</button>
      </div>`;
    document.getElementById("remove-bg-btn").addEventListener("click", () => {
      // Importante: mandamos string vazia, não null. O backend só atualiza o
      // campo quando o valor recebido não é null — mandando null ele ignora
      // e mantém a imagem antiga (era por isso que "não deixava" remover).
      pendingBgImageUrl = "";
      bgImageFileInput.value = "";
      renderBgPreview();
      setStatus('Imagem de fundo removida. Clique em "Salvar página" pra aplicar.');
    });
  } else {
    bgPreview.innerHTML = "";
  }
}

bgImageFileInput.addEventListener("change", async () => {
  const file = bgImageFileInput.files[0];
  if (!file) return;

  setStatus("Enviando imagem de fundo...", "saving");
  try {
    const { url } = await uploadImage(file);
    pendingBgImageUrl = url;
    renderBgPreview();
    setStatus("Imagem enviada. Clique em \"Salvar página\" pra aplicar.");
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    bgImageFileInput.value = "";
  }
});

function renderPageFrame() {
  const { width, height, backgroundColor, backgroundImageUrl } = state.catalogue.pageSettings;
  pageCanvas.style.width = `${width}px`;
  pageCanvas.style.height = `${height}px`;
  pageCanvas.style.backgroundColor = backgroundColor || "#ffffff";
  pageCanvas.style.backgroundImage = backgroundImageUrl ? `url("${backgroundImageUrl}")` : "none";
  pageCanvas.style.backgroundSize = "cover";
  pageCanvas.style.backgroundPosition = "center";

  const { format, orientation } = detectFormatFromSize(width, height);
  const formatLabel = format === "CUSTOM" ? "personalizado" : `${format} ${orientation === "landscape" ? "paisagem" : "retrato"}`;
  pageSpec.textContent = `${ptToCm(width)} × ${ptToCm(height)} cm · ${formatLabel}`;
}

// ---------- salvar página / título ----------

savePageBtn.addEventListener("click", async () => {
  setStatus("Salvando página...", "saving");
  try {
    const updated = await apiFetch(`/api/catalogues/${state.catalogueId}`, {
      method: "PUT",
      body: {
        title: titleInput.value.trim() || "Sem título",
        pageSettings: {
          width: Number(widthInput.value) || 1,
          height: Number(heightInput.value) || 1,
          backgroundColor: bgColorInput.value,
          backgroundImageUrl: pendingBgImageUrl,
        },
      },
    });
    state.catalogue = updated;
    applyCatalogueToForm();
    renderPageFrame();
    setStatus("Página salva.");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

// ---------- elementos: render ----------

function renderElements() {
  pageCanvas.innerHTML = "";
  const elements = state.catalogue.catalogElements || {};

  if (state.selectedId && !elements[state.selectedId]) {
    state.selectedId = null;
  }

  Object.entries(elements).forEach(([id, el]) => {
    pageCanvas.appendChild(buildElementNode(id, el));
  });

  renderPropsPanel();
}

function buildElementNode(id, el) {
  const node = document.createElement("div");
  node.className = `el ${el.type === "image" ? "el-image" : "el-text"}`;
  node.dataset.id = id;
  node.style.left = `${el.posX}px`;
  node.style.top = `${el.posY}px`;
  node.style.width = `${el.width}px`;
  node.style.height = `${el.height}px`;

  if (el.type === "image") {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = el.content || "";
    img.alt = "";
    node.appendChild(img);
  } else {
    const contentEl = document.createElement("div");
    contentEl.className = "el-content";
    contentEl.contentEditable = "false";
    contentEl.textContent = el.content || "";
    contentEl.style.color = el.textColor || "#000000";
    contentEl.style.fontFamily = el.fontFamily || "serif";
    contentEl.style.fontSize = `${el.fontSize || 16}px`;
    contentEl.style.textShadow = buildTextStroke(el.textStrokeColor, el.textStrokeWidth);
    node.appendChild(contentEl);

    contentEl.addEventListener("dblclick", (event) => {
      event.stopPropagation();
      contentEl.contentEditable = "true";
      node.dataset.editing = "true";
      contentEl.focus();
    });

    // Enter deve quebrar linha dentro do texto, não "confirmar" e sair da edição.
    contentEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.execCommand("insertText", false, "\n");
      }
    });

    contentEl.addEventListener("blur", () => {
      contentEl.contentEditable = "false";
      node.dataset.editing = "false";
      // innerText (não textContent) preserva as quebras de linha digitadas.
      const newContent = contentEl.innerText;
      if (newContent !== (el.content || "")) {
        persistElement(id, { content: newContent });
      }
    });
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "el-delete";
  deleteBtn.type = "button";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!confirm("Excluir este elemento?")) return;
    setStatus("Excluindo elemento...", "saving");
    try {
      const updated = await apiFetch(`/api/catalogues/${state.catalogueId}/elements/${id}`, {
        method: "DELETE",
      });
      state.catalogue = updated;
      if (state.selectedId === id) state.selectedId = null;
      renderElements();
      setStatus("Elemento excluído.");
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
  node.appendChild(deleteBtn);

  const resizeHandle = document.createElement("div");
  resizeHandle.className = "el-resize";
  node.appendChild(resizeHandle);

  node.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".el-delete") || event.target.closest(".el-resize")) return;
    if (node.dataset.editing === "true") return;

    selectElement(id);
    startDrag(event, node, id);
  });

  resizeHandle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    selectElement(id);
    startResize(event, node, id);
  });

  if (id === state.selectedId) node.classList.add("selected");

  return node;
}

function updateSelectionVisual() {
  pageCanvas.querySelectorAll(".el").forEach((node) => {
    node.classList.toggle("selected", node.dataset.id === state.selectedId);
  });
}

function selectElement(id) {
  state.selectedId = id;
  updateSelectionVisual();
  renderPropsPanel();
}

// ---------- arrastar ----------

function startDrag(event, node, id) {
  const el = state.catalogue.catalogElements[id];
  const startPointerX = event.clientX;
  const startPointerY = event.clientY;
  const startLeft = el.posX;
  const startTop = el.posY;

  node.classList.add("dragging");

  function onMove(e) {
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    const newLeft = Math.max(0, Math.round(startLeft + dx));
    const newTop = Math.max(0, Math.round(startTop + dy));
    node.style.left = `${newLeft}px`;
    node.style.top = `${newTop}px`;
    node.dataset.pendingX = newLeft;
    node.dataset.pendingY = newTop;
  }

  function onUp() {
    node.classList.remove("dragging");
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);

    const newX = Number(node.dataset.pendingX ?? startLeft);
    const newY = Number(node.dataset.pendingY ?? startTop);
    if (newX !== startLeft || newY !== startTop) {
      persistElement(id, { posX: newX, posY: newY });
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// ---------- redimensionar ----------

function startResize(event, node, id) {
  const el = state.catalogue.catalogElements[id];
  const startPointerX = event.clientX;
  const startPointerY = event.clientY;
  const startWidth = el.width;
  const startHeight = el.height;

  function onMove(e) {
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    const newWidth = Math.max(20, Math.round(startWidth + dx));
    const newHeight = Math.max(20, Math.round(startHeight + dy));
    node.style.width = `${newWidth}px`;
    node.style.height = `${newHeight}px`;
    node.dataset.pendingWidth = newWidth;
    node.dataset.pendingHeight = newHeight;
  }

  function onUp() {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);

    const newWidth = Number(node.dataset.pendingWidth ?? startWidth);
    const newHeight = Number(node.dataset.pendingHeight ?? startHeight);
    if (newWidth !== startWidth || newHeight !== startHeight) {
      persistElement(id, { width: newWidth, height: newHeight });
    }
  }

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
}

// ---------- persistir elemento (merge + PUT) ----------

async function persistElement(id, partialUpdate) {
  const current = state.catalogue.catalogElements[id];
  if (!current) return;

  const payload = {
    type: current.type,
    content: current.content,
    posX: current.posX,
    posY: current.posY,
    width: current.width,
    height: current.height,
    textColor: current.textColor,
    fontFamily: current.fontFamily,
    fontSize: current.fontSize,
    textStrokeColor: current.textStrokeColor,
    textStrokeWidth: current.textStrokeWidth,
    ...partialUpdate,
  };

  setStatus("Salvando...", "saving");
  try {
    const updated = await apiFetch(`/api/catalogues/${state.catalogueId}/elements/${id}`, {
      method: "PUT",
      body: payload,
    });
    state.catalogue = updated;
    renderElements();
    setStatus("Salvo.");
  } catch (error) {
    setStatus(error.message, "error");
    renderElements(); // reverte visual pro último estado confirmado
  }
}

// ---------- painel de propriedades (lado direito) ----------

function renderPropsPanel() {
  const id = state.selectedId;
  if (!id || !state.catalogue.catalogElements[id]) {
    propsPanel.innerHTML = `<p style="color: var(--text-muted); font-size: 0.8rem;">Clique em um elemento no canvas para editar.</p>`;
    return;
  }

  const el = state.catalogue.catalogElements[id];

  propsPanel.innerHTML = `
    <p style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${el.type}</p>

    ${
      el.type === "image"
        ? `<div class="field">
            <label>Imagem atual</label>
            <img src="${escapeHtml(el.content || "")}" style="width:100%; border-radius:3px; margin-bottom:0.5rem; display:block;" />
            <input type="file" id="prop-image-file" accept="image/*" />
          </div>`
        : `<div class="field">
            <label for="prop-content">Texto</label>
            <textarea id="prop-content" rows="3">${escapeHtml(el.content || "")}</textarea>
            <p style="font-size:0.68rem; color: var(--text-muted); margin-top:0.3rem;">Dica: dê um duplo clique no elemento no canvas pra editar direto ali, com Enter quebrando linha normalmente.</p>
          </div>
          <div class="field-inline">
            <div>
              <label for="prop-text-color">Cor do texto</label>
              <input type="color" id="prop-text-color" value="${el.textColor || "#000000"}" />
            </div>
            <div>
              <label for="prop-font-size">Tamanho da fonte</label>
              <input type="number" id="prop-font-size" min="6" max="300" value="${el.fontSize || 16}" />
            </div>
          </div>
          <div class="field">
            <label for="prop-font-family">Fonte</label>
            <select id="prop-font-family">
              ${FONT_OPTIONS.map(
                (f) =>
                  `<option value="${f.value}" ${f.value === (el.fontFamily || "serif") ? "selected" : ""}>${f.label}</option>`
              ).join("")}
            </select>
          </div>
          <div class="field-inline">
            <div>
              <label for="prop-text-stroke-color">Cor da borda do texto</label>
              <input type="color" id="prop-text-stroke-color" value="${el.textStrokeColor || "#000000"}" />
            </div>
            <div>
              <label for="prop-text-stroke-width">Espessura da borda</label>
              <input type="number" id="prop-text-stroke-width" min="0" max="10" step="0.5" value="${el.textStrokeWidth || 0}" />
            </div>
          </div>`
    }

    <div class="dim-row" style="margin-bottom: 0.7rem;">
      <div>
        <label for="prop-x">X</label>
        <input type="number" id="prop-x" value="${el.posX}" min="0" />
      </div>
      <div>
        <label for="prop-y">Y</label>
        <input type="number" id="prop-y" value="${el.posY}" min="0" />
      </div>
    </div>
    <div class="dim-row">
      <div>
        <label for="prop-w">Largura</label>
        <input type="number" id="prop-w" value="${el.width}" min="1" />
      </div>
      <div>
        <label for="prop-h">Altura</label>
        <input type="number" id="prop-h" value="${el.height}" min="1" />
      </div>
    </div>

    <hr class="rule" />
    <button class="btn-primary btn-block" id="prop-save-btn">Aplicar</button>
  `;

  document.getElementById("prop-save-btn").addEventListener("click", async () => {
    const posX = Number(document.getElementById("prop-x").value) || 0;
    const posY = Number(document.getElementById("prop-y").value) || 0;
    const width = Math.max(1, Number(document.getElementById("prop-w").value) || 1);
    const height = Math.max(1, Number(document.getElementById("prop-h").value) || 1);

    if (el.type === "image") {
      const fileInput = document.getElementById("prop-image-file");
      const file = fileInput.files[0];
      let content = el.content;

      if (file) {
        setStatus("Enviando imagem...", "saving");
        try {
          const result = await uploadImage(file);
          content = result.url;
        } catch (error) {
          setStatus(error.message, "error");
          return;
        }
      }

      persistElement(id, { content, posX, posY, width, height });
    } else {
      persistElement(id, {
        content: document.getElementById("prop-content").value,
        textColor: document.getElementById("prop-text-color").value,
        fontFamily: document.getElementById("prop-font-family").value,
        fontSize: Number(document.getElementById("prop-font-size").value) || 16,
        textStrokeColor: document.getElementById("prop-text-stroke-color").value,
        textStrokeWidth: Number(document.getElementById("prop-text-stroke-width").value) || 0,
        posX,
        posY,
        width,
        height,
      });
    }
  });
}

// ---------- adicionar elementos ----------

async function addElement(defaults) {
  const previousIds = new Set(Object.keys(state.catalogue.catalogElements || {}));
  setStatus("Adicionando elemento...", "saving");
  try {
    const updated = await apiFetch(`/api/catalogues/${state.catalogueId}/elements`, {
      method: "POST",
      body: defaults,
    });
    state.catalogue = updated;
    const newId = Object.keys(updated.catalogElements).find((k) => !previousIds.has(k));
    state.selectedId = newId || null;
    renderElements();
    setStatus("Elemento adicionado.");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

addTextBtn.addEventListener("click", () => {
  addElement({
    type: "text",
    content: "Novo texto",
    posX: 20,
    posY: 20,
    width: 160,
    height: 50,
    textColor: "#000000",
    fontSize: 16,
  });
});

addImageBtn.addEventListener("click", () => imageFileInput.click());

imageFileInput.addEventListener("change", async () => {
  const file = imageFileInput.files[0];
  imageFileInput.value = ""; // permite selecionar o mesmo arquivo de novo depois
  if (!file) return;

  setStatus("Enviando imagem...", "saving");
  try {
    const { url } = await uploadImage(file);
    await addElement({ type: "image", content: url, posX: 20, posY: 20, width: 160, height: 120 });
  } catch (error) {
    setStatus(error.message, "error");
  }
});

// ---------- arrastar imagem do computador direto pro canvas ----------

let dragDepth = 0;

pageCanvas.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth++;
  pageCanvas.classList.add("drag-over");
});

pageCanvas.addEventListener("dragover", (event) => {
  // precisa do preventDefault aqui também, senão o navegador recusa o drop
  event.preventDefault();
});

pageCanvas.addEventListener("dragleave", () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) {
    pageCanvas.classList.remove("drag-over");
  }
});

pageCanvas.addEventListener("drop", async (event) => {
  event.preventDefault();
  dragDepth = 0;
  pageCanvas.classList.remove("drag-over");

  const file = event.dataTransfer.files[0];
  if (!file || !file.type.startsWith("image/")) return;

  const rect = pageCanvas.getBoundingClientRect();
  const dropX = Math.max(0, Math.round(event.clientX - rect.left));
  const dropY = Math.max(0, Math.round(event.clientY - rect.top));

  setStatus("Enviando imagem...", "saving");
  try {
    const { url } = await uploadImage(file);
    await addElement({ type: "image", content: url, posX: dropX, posY: dropY, width: 160, height: 120 });
  } catch (error) {
    setStatus(error.message, "error");
  }
});

// ---------- exportar (PNG / PDF) ----------

function slugifyFilename(title) {
  return (title || "catalogo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase() || "catalogo";
}

async function captureCanvas() {
  pageCanvas.classList.add("exporting");
  const previousSelected = state.selectedId;
  state.selectedId = null;
  updateSelectionVisual();
  try {
    return await html2canvas(pageCanvas, {
      useCORS: true,
      backgroundColor: pageCanvas.style.backgroundColor || "#ffffff",
      scale: 2,
    });
  } finally {
    pageCanvas.classList.remove("exporting");
    state.selectedId = previousSelected;
    updateSelectionVisual();
  }
}

exportPngBtn.addEventListener("click", async () => {
  setStatus("Gerando imagem...", "saving");
  try {
    const canvas = await captureCanvas();
    const link = document.createElement("a");
    link.download = `${slugifyFilename(state.catalogue?.title)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setStatus("Imagem exportada.");
  } catch (error) {
    setStatus("Erro ao exportar imagem: " + error.message, "error");
  }
});

exportPdfBtn.addEventListener("click", async () => {
  setStatus("Gerando PDF...", "saving");
  try {
    const { width, height } = state.catalogue.pageSettings;
    const canvas = await captureCanvas();
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: width >= height ? "landscape" : "portrait",
      unit: "pt",
      format: [width, height],
    });
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`${slugifyFilename(state.catalogue?.title)}.pdf`);
    setStatus("PDF exportado.");
  } catch (error) {
    setStatus("Erro ao exportar PDF: " + error.message, "error");
  }
});

// ---------- deletar elemento selecionado com o teclado ----------

document.addEventListener("keydown", async (event) => {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  if (!state.selectedId) return;

  const active = document.activeElement;
  const isTyping =
    active &&
    (active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.tagName === "SELECT" ||
      active.isContentEditable);
  if (isTyping) return;

  const id = state.selectedId;
  if (!confirm("Excluir este elemento?")) return;

  setStatus("Excluindo elemento...", "saving");
  try {
    const updated = await apiFetch(`/api/catalogues/${state.catalogueId}/elements/${id}`, {
      method: "DELETE",
    });
    state.catalogue = updated;
    state.selectedId = null;
    renderElements();
    setStatus("Elemento excluído.");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

loadCatalogue();