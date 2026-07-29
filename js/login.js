import { apiFetch, setToken, redirectIfAuthed } from "./api.js";

redirectIfAuthed();

const form = document.getElementById("login-form");
const msgBox = document.getElementById("msg");
const submitBtn = document.getElementById("submit-btn");

// Se veio do cadastro com ?email=..., já preenche o campo e manda o foco pra senha.
const params = new URLSearchParams(window.location.search);
const prefilledEmail = params.get("email");
if (prefilledEmail) {
  const emailInput = document.getElementById("email");
  emailInput.value = prefilledEmail;
  document.getElementById("password").focus();
}

function showMessage(text, type = "error") {
  msgBox.innerHTML = `<div class="msg msg-${type}">${text}</div>`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msgBox.innerHTML = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });

    setToken(response.token);
    window.location.href = "dashboard.html";
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});