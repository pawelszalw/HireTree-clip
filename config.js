const CONFIG = {
  // ── Docker mode (default) ─────────────────────────────────────────────────
  // Frontend + backend served via nginx on port 80. nginx proxies /api/*.
  APP_URL: 'http://localhost',
  API_URL: 'http://localhost',

  // ── Dev mode (Vite dev server + uvicorn) ──────────────────────────────────
  // Uncomment these two lines and comment out the ones above.
  // APP_URL: 'http://localhost:5173',
  // API_URL: 'http://localhost:8000',
}
