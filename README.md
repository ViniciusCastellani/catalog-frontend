# Catalog Editor (Frontend)

A canvas-based catalog editor built with **plain HTML, CSS, and JavaScript** — no frameworks, no build step. Originally built for a family member's 3D-printed object sales business, so they can lay out product catalogs visually and export them as images or PDFs.

Talks to [`catalog-api`](https://github.com/ViniciusCastellani/catalog-api), a Spring Boot backend.

**Live:** [catalog-frontend-two.vercel.app](https://catalog-frontend-two.vercel.app)

---

## Highlights

- **Drag-and-drop canvas editor** — freely position and resize text and image elements on a page, with double-click inline text editing
- **Rich text styling** — font family, size, color, and stroke, all editable live from a properties panel
- **Image uploads** straight into the canvas, stored in Supabase Storage via the API
- **Export to PNG or PDF** with `html2canvas` + `jsPDF`, so a finished catalog page can be downloaded and shared directly
- **Full account flow** — register, login, forgot/reset password, and profile management, backed by JWT auth
- **Zero build tooling** — native ES modules served as static files, deployed as-is on Vercel

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
  : "https://catalog-api-xzbx.onrender.com";
```

- Running on `localhost` or `127.0.0.1` → connects to the local API at `http://localhost:8080`.
- Running on any other domain (e.g., Vercel) → connects to the production API at `catalog-api-xzbx.onrender.com`. Swap this URL if you deploy your own instance of `catalog-api`.

Make sure the backend's `CORS_ALLOWED_ORIGINS` environment variable is configured to allow the domain where this frontend is hosted.

## Pages

- `login.html` / `register.html` / `forgot-password.html` / `reset-password.html` — Authentication
- `dashboard.html` — List, create, and delete catalogs
- `editor.html?id=...` — Canvas editor with drag-and-drop, resizing, text editing (double-click), image support, and PNG/PDF export
- `profile.html` — Edit profile, change password, and delete account

## Authentication

The JWT is stored in `localStorage` under the key `catalog_token` and is valid for **2 hours** (configured by the backend).

When the token expires, any authenticated request receives a **401 Unauthorized** response from the API. The frontend automatically removes the token from `localStorage` and redirects the user to `login.html`.

## Related

- [`catalog-api`](https://github.com/ViniciusCastellani/catalog-api) — the Spring Boot backend this frontend talks to
