import { apiFetch, requireAuth, clearToken } from "./api.js";

requireAuth();

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const pictureInput = document.getElementById("profilePictureUrl");
const profileMsg = document.getElementById("profile-msg");
const passwordMsg = document.getElementById("password-msg");

async function loadProfile() {
  try {
    const user = await apiFetch("/api/users/me");
    nameInput.value = user.name;
    emailInput.value = user.email;
    pictureInput.value = user.profilePictureUrl || "";
  } catch (error) {
    profileMsg.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  }
}

document.getElementById("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  profileMsg.innerHTML = "";

  try {
    await apiFetch("/api/users/profile", {
      method: "PUT",
      body: {
        name: nameInput.value.trim(),
        profilePictureUrl: pictureInput.value.trim() || null,
      },
    });
    profileMsg.innerHTML = `<div class="msg msg-success">Perfil atualizado.</div>`;
  } catch (error) {
    profileMsg.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  }
});

document.getElementById("password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  passwordMsg.innerHTML = "";

  const newPassword = document.getElementById("newPassword").value;
  const confirmNewPassword = document.getElementById("confirmNewPassword").value;

  if (newPassword !== confirmNewPassword) {
    passwordMsg.innerHTML = `<div class="msg msg-error">A nova senha e a confirmação não coincidem.</div>`;
    return;
  }

  try {
    await apiFetch("/api/users/update-password", {
      method: "PUT",
      body: {
        currentPassword: document.getElementById("currentPassword").value,
        newPassword,
        confirmNewPassword,
      },
    });
    passwordMsg.innerHTML = `<div class="msg msg-success">Senha atualizada.</div>`;
    event.target.reset();
  } catch (error) {
    passwordMsg.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  }
});

document.getElementById("delete-account-btn").addEventListener("click", async () => {
  if (!confirm("Tem certeza que quer excluir sua conta? Essa ação não pode ser desfeita.")) return;

  try {
    await apiFetch("/api/users/delete-account", { method: "DELETE" });
    clearToken();
    window.location.href = "login.html";
  } catch (error) {
    profileMsg.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  }
});

loadProfile();
