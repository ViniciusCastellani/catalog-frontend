const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
export const API_BASE_URL = isLocal
  ? "http://localhost:8080"
  : "https://catalog-api-xzbx.onrender.com";

const TOKEN_KEY = "catalog_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decodifica o payload do JWT e verifica se já passou do `exp`.
 * Não valida assinatura (isso é papel do backend) — só evita bater
 * na API com um token que a gente já sabe que expirou.
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch (_) {
    // token corrompido/ilegível: trata como expirado
    return true;
  }
}

/**
 * Limpa a sessão e manda pra página inicial, travando a execução
 * do resto do script (retorna uma Promise que nunca resolve) pra
 * nenhuma tela de erro chegar a aparecer no meio do caminho.
 */
function redirectToHome() {
  clearToken();
  if (!window.location.pathname.endsWith("index.html") && window.location.pathname !== "/") {
    window.location.href = "index.html";
  }
  return new Promise(() => {});
}

// Chame no topo de páginas que exigem login.
export function requireAuth() {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    clearToken();
    window.location.href = "index.html";
    // location.href só agenda a navegação; sem isso, o resto do script
    // continuaria rodando (e fazendo chamadas sem token) até a página trocar.
    throw new Error("Redirecionando para a página inicial.");
  }
}

// Chame no topo de páginas de login/registro (não faz sentido logado).
export function redirectIfAuthed() {
  const token = getToken();
  if (token && !isTokenExpired(token)) {
    window.location.href = "dashboard.html";
    throw new Error("Redirecionando para dashboard.");
  }
  if (token) clearToken(); // tinha token, mas tava expirado
}

async function parseErrorMessage(response) {
  try {
    const data = await response.json();
    if (data.error) return data.error;
    const messages = Object.values(data).filter((v) => typeof v === "string");
    if (messages.length) return messages.join(" ");
  } catch (_) {
    // corpo não era JSON, ignora
  }
  return `Erro inesperado (${response.status}).`;
}

/**
 * Envia um arquivo de imagem pra API (multipart/form-data) e devolve { url }.
 */
export async function uploadImage(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // Não define Content-Type manualmente: o navegador define o boundary do multipart sozinho.
      body: formData,
    });
  } catch (networkError) {
    throw new Error("Não consegui enviar a imagem. Confira a conexão com o servidor.");
  }

  if (response.status === 401) {
    return redirectToHome();
  }

  if (!response.ok) {
    let message = `Erro ao enviar imagem (${response.status}).`;
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch (_) {}
    throw new Error(message);
  }

  return response.json();
}

/**
 * Wrapper de fetch já com base URL, JWT e tratamento de erro padronizado.
 * @param {string} path - ex: "/api/catalogues"
 * @param {{method?: string, body?: any, auth?: boolean}} options
 */
export async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    throw new Error(
      "Não consegui falar com o servidor. Confira se a API está rodando em " + API_BASE_URL
    );
  }

  if (response.status === 401) {
    return redirectToHome();
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}