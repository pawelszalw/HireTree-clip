const CONFIG = {
  // ── Mock mode (Vite dev server, no real backend) ──────────────────────────
  // Both URLs point to the Vite dev server. The mock API handles all requests.
  APP_URL: 'http://localhost:5173',
  API_URL: 'http://localhost:8000',

  // ── Real backend mode ─────────────────────────────────────────────────────
  // Uncomment these two lines and comment out the ones above.
  // APP_URL: 'http://localhost:5173',
  // API_URL: 'http://localhost:8000',
}
