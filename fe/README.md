# CRM Frontend

React + Vite frontend for the CRM MVP. This project is JavaScript/JSX only and connects to the backend through `VITE_API_BASE_URL`.

## Requirements

- Node.js 22+
- npm

## Install dependencies

```bash
npm install
```

## Run the development server

```bash
npm run dev
```

The app will usually be available at `http://localhost:5173`.

## Run tests

```bash
npm test
```

## Run linting

```bash
npm run lint
```

## Build for production

```bash
npm run build
```

The production output is written to `dist/`.

## Preview the production build

```bash
npm run build
npm run preview
```

## Environment variables

Use Vite environment variables for API configuration and branding.

`.env.example`
`.env.production.example`

Supported variables:

- `VITE_API_BASE_URL`
- `VITE_APP_NAME`

Example:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=CRM
```

## Backend API base URL configuration

The frontend reads the backend base URL from `VITE_API_BASE_URL`. API URLs are not hardcoded inside components.

Current usage is centralized in:

- `src/api/httpClient.js`
- `src/shared/mocks/handlers.js`

For production builds, set `VITE_API_BASE_URL` before running `npm run build`, or pass it as a Docker build argument.

Example:

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

Windows PowerShell example:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
npm run build
```

## Docker build

This repository includes a multi-stage `Dockerfile`:

1. Build the Vite app with Node.
2. Serve the static files with Nginx.

Build the image:

```bash
docker build -t crm-frontend .
```

Set the API URL at build time:

```bash
docker build -t crm-frontend --build-arg VITE_API_BASE_URL=https://api.example.com .
```

Run the container:

```bash
docker run --rm -p 8080:80 crm-frontend
```

Then open `http://localhost:8080`.

## Nginx SPA routing

`nginx.conf` uses:

```nginx
try_files $uri $uri/ /index.html;
```

This ensures client-side routes such as:

- `/dashboard`
- `/pipeline`
- `/leads/123`
- `/landing`
- `/lead-capture-success`

continue to work when served by Nginx.

## Notes

- The public landing page route `/landing` is included in the production build and supported by the Nginx SPA fallback.
- Swagger or backend URLs are not hardcoded in the UI layer.
