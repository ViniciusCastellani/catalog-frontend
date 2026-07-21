import { apiFetch, redirectIfAuthed } from "./api.js";

redirectIfAuthed();

const form = document.getElementById("reset-form");
const msgBox = document.getElementById("msg");
const submitBtn = document.getElementById("submit-btn");
const tokenInput = document.getElementById("token");

// Se veio de forgot-password.html com ?token=..., já preenche.
const params = new URLSearchParams(window.location.search);
if (params.get("token")) {
  tokenInput.value = params.get("token");
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
        token: tokenInput.value.trim(),
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
