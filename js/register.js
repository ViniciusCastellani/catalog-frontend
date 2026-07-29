import { apiFetch, redirectIfAuthed } from "./api.js";

redirectIfAuthed();

const form = document.getElementById("register-form");
const msgBox = document.getElementById("msg");
const submitBtn = document.getElementById("submit-btn");

function showMessage(text, type = "error") {
  msgBox.innerHTML = `<div class="msg msg-${type}">${text}</div>`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msgBox.innerHTML = "";

  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    showMessage("A senha e a confirmação não coincidem.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Criando...";

  try {
    const email = document.getElementById("email").value.trim();

    await apiFetch("/api/auth/register", {
      method: "POST",
      auth: false,
      body: {
        name: document.getElementById("name").value.trim(),
        email,
        password,
        confirmPassword,
      },
    });

    showMessage("Conta criada! Redirecionando para o login...", "success");
    setTimeout(() => {
      window.location.href = `login.html?email=${encodeURIComponent(email)}`;
    }, 1200);
  } catch (error) {
    showMessage(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = "Criar conta";
  }
});