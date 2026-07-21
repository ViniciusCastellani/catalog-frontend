import { apiFetch, requireAuth, clearToken, uploadImage } from "./api.js";

requireAuth();

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  window.location.href = "login.html";
});

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const profileMsg = document.getElementById("profile-msg");
const passwordMsg = document.getElementById("password-msg");

const userNameEl = document.getElementById("user-name");
const userAvatarEl = document.getElementById("user-avatar");

const avatarDropzone = document.getElementById("avatar-dropzone");
const avatarFileInput = document.getElementById("avatar-file-input");
const avatarPreview = document.getElementById("avatar-preview");
const avatarPlaceholder = document.getElementById("avatar-placeholder");
const avatarRemoveBtn = document.getElementById("avatar-remove-btn");

let currentPictureUrl = null;

function setAvatarPreview(url) {
  currentPictureUrl = url || null;

  if (currentPictureUrl) {
    avatarPreview.src = currentPictureUrl;
    avatarPreview.hidden = false;
    avatarPlaceholder.hidden = true;
    avatarRemoveBtn.hidden = false;
  } else {
    avatarPreview.hidden = true;
    avatarPreview.removeAttribute("src");
    avatarPlaceholder.hidden = false;
    avatarRemoveBtn.hidden = true;
  }

  // mantém o badge do header em sincronia
  if (currentPictureUrl) {
    userAvatarEl.src = currentPictureUrl;
    userAvatarEl.hidden = false;
  } else {
    userAvatarEl.hidden = true;
  }
}

async function handleAvatarFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    profileMsg.innerHTML = `<div class="msg msg-error">Escolha um arquivo de imagem válido.</div>`;
    return;
  }

  avatarPlaceholder.textContent = "Enviando...";
  try {
    const { url } = await uploadImage(file);
    setAvatarPreview(url);
    profileMsg.innerHTML = "";
  } catch (error) {
    profileMsg.innerHTML = `<div class="msg msg-error">${error.message}</div>`;
  } finally {
    avatarPlaceholder.innerHTML = "Arraste uma imagem<br />ou clique";
  }
}

avatarDropzone.addEventListener("click", () => avatarFileInput.click());
avatarDropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    avatarFileInput.click();
  }
});

avatarFileInput.addEventListener("change", () => {
  const file = avatarFileInput.files[0];
  avatarFileInput.value = ""; // permite selecionar o mesmo arquivo de novo depois
  if (file) handleAvatarFile(file);
});

avatarDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  avatarDropzone.classList.add("drag-over");
});

avatarDropzone.addEventListener("dragleave", () => {
  avatarDropzone.classList.remove("drag-over");
});

avatarDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  avatarDropzone.classList.remove("drag-over");
  const file = event.dataTransfer.files[0];
  if (file) handleAvatarFile(file);
});

avatarRemoveBtn.addEventListener("click", () => setAvatarPreview(null));

async function loadProfile() {
  try {
    const user = await apiFetch("/api/users/me");
    nameInput.value = user.name;
    emailInput.value = user.email;
    userNameEl.textContent = user.name;
    setAvatarPreview(user.profilePictureUrl || null);
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
        profilePictureUrl: currentPictureUrl,
      },
    });
    userNameEl.textContent = nameInput.value.trim();
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