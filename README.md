# Catalog Frontend

Frontend em HTML/CSS/JS puro (sem build, sem framework) pro `catalog-api`.

## Como rodar local

Não abre os arquivos direto no navegador (`file://`) — os módulos JS e o CORS da API não funcionam assim. Sirva por um servidor local, na porta 3000 (é o que está liberado em `CORS_ALLOWED_ORIGINS` no backend):

```bash
# dentro da pasta catalog-frontend
npx serve -l 3000
# ou
python3 -m http.server 3000
```

Depois abre `http://localhost:3000`.

## Antes de usar: aceitar o certificado da API

A API roda em HTTPS com certificado autoassinado (`https://localhost:8080`). Antes de usar o frontend, abre `https://localhost:8080` direto no navegador uma vez, clica em "Avançado" → "Continuar mesmo assim" (ou equivalente). Sem isso, todo `fetch` do frontend pro backend falha silenciosamente por causa do certificado não confiável.

## Configuração

A URL da API está em `js/api.js`:

```js
export const API_BASE_URL = "https://localhost:8080";
```

Troca esse valor quando for hospedar o backend em outro lugar.

## Páginas

- `login.html` / `register.html` / `forgot-password.html` / `reset-password.html` — autenticação
- `dashboard.html` — lista, cria e exclui catálogos
- `editor.html?id=...` — editor com canvas: arrastar, redimensionar, editar texto (duplo clique) e imagem
- `profile.html` — editar perfil, trocar senha, excluir conta

O token JWT fica em `localStorage` (`catalog_token`).
