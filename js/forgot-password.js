import { apiFetch, redirectIfAuthed } from "./api.js";

redirectIfAuthed();

const form = document.getElementById("forgot-form");
const msgBox = document.getElementById("msg");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msgBox.innerHTML = "";
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  const email = document.getElementById("email").value.trim();

  try {
    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      auth: false,
      body: { email },
    });

    let html = `<div class="msg msg-success">${response.message}</div>`;

    // Em dev, sem SMTP configurado, a API devolve o token direto aqui.
    if (response.devToken) {
      const resetUrl = `reset-password.html?token=${encodeURIComponent(response.devToken)}`;
      html += `
        <div class="token-reveal">
          <strong>Sem SMTP configurado — modo dev</strong>
          Token: ${response.devToken}<br /><br />
          <a href="${resetUrl}">Ir para redefinir senha →</a>
        </div>`;
    }

    msgBox.innerHTML = html;
    form.reset();
  } catch (error) {
    msgBox.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar instruções";
  }
});
