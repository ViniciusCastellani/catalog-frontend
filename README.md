# Catalog Frontend

A frontend built with plain HTML, CSS, and JavaScript (no build tools or frameworks) for the `catalog-api`.

## Running Locally

Do **not** open the files directly in your browser using `file://`. JavaScript modules and the API's CORS configuration will not work that way.

Serve the project through a local web server on port **3000** (the default origin allowed by `CORS_ALLOWED_ORIGINS` in the backend):

```bash
# Inside the catalog-frontend directory
npx serve -l 3000

# or
python3 -m http.server 3000
```

Then open:

```
http://localhost:3000
```

## Configuration

The API URL is automatically resolved in `js/api.js` based on the host where the frontend is running:

```js
const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_BASE_URL = isLocal
  ? "http://localhost:8080"
  : "https://YOUR_SERVICE.onrender.com";
```

- Running on `localhost` or `127.0.0.1` → connects to the local API at `http://localhost:8080`.
- Running on any other domain (e.g., Vercel) → connects to the production API. **Replace `YOUR_SERVICE.onrender.com` with your actual backend URL once it has been deployed to Render (or another hosting provider).**

Make sure the backend's `CORS_ALLOWED_ORIGINS` environment variable is configured to allow the domain where this frontend is hosted.

## Pages

- `login.html` / `register.html` / `forgot-password.html` / `reset-password.html` — Authentication
- `dashboard.html` — List, create, and delete catalogs
- `editor.html?id=...` — Canvas editor with drag-and-drop, resizing, text editing (double-click), and image support
- `profile.html` — Edit profile, change password, and delete account

## Authentication

The JWT is stored in `localStorage` under the key `catalog_token` and is valid for **2 hours** (configured by the backend).

When the token expires, any authenticated request receives a **401 Unauthorized** response from the API. The frontend automatically removes the token from `localStorage` and redirects the user to `login.html`.