import { apiFetch, redirectIfAuthed } from "./api.js";

redirectIfAuthed();

const form = document.getElementById("reset-form");
const msgBox = document.getElementById("msg");
const submitBtn = document.getElementById("submit-btn");

// O token vem só da URL do e-mail (?token=...), não é digitado pelo usuário.
const params = new URLSearchParams(window.location.search);
const token = params.get("token");

if (!token) {
  msgBox.innerHTML = `<div class="msg msg-error">Link inválido ou incompleto. Solicite a recuperação de senha novamente.</div>`;
  submitBtn.disabled = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msgBox.innerHTML = "";

  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;

  if (newPassword !== confirmNewPassword) {
    msgBox.innerHTML = `<div class="msg msg-error">A nova senha e a confirmação não coincidem.</div>`;
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Redefinindo...";

  try {
    await apiFetch("/api/auth/reset-password", {
      method: "POST",
      auth: false,
      body: {
        token,
        newPassword,
        confirmNewPassword,
      },
    });

    msgBox.innerHTML = `<div class="msg msg-success">Senha redefinida! Redirecionando para o login...</div>`;
    setTimeout(() => (window.location.href = "login.html"), 1200);
  } catch (error) {
    msgBox.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
    submitBtn.disabled = false;
    submitBtn.textContent = "Redefinir senha";
  }
});