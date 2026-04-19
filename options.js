// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------
document.querySelectorAll('.side-nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    const tab = link.dataset.tab
    document.querySelectorAll('.side-nav a').forEach(a => a.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    link.classList.add('active')
    document.getElementById(`tab-${tab}`)?.classList.add('active')
  })
})

// ---------------------------------------------------------------------------
// Toggle helper
// ---------------------------------------------------------------------------
const TOGGLE_DEFAULTS = {
  autoRefresh: true,
  showMatch:   true,
  'portal-justjoin':    true,
  'portal-nofluff':     true,
  'portal-linkedin':    true,
  'portal-pracuj':      false,
  'portal-theprotocol': true,
  'portal-bulldogjob':  true,
  'portal-fallback':    true,
}

async function loadToggles() {
  const stored = await chrome.storage.sync.get(Object.keys(TOGGLE_DEFAULTS)).catch(() => ({}))
  for (const [key, def] of Object.entries(TOGGLE_DEFAULTS)) {
    const val = stored[key] !== undefined ? stored[key] : def
    const el  = document.getElementById(`toggle-${key}`)
    if (el) el.classList.toggle('off', !val)
  }
}

function wireToggles() {
  for (const key of Object.keys(TOGGLE_DEFAULTS)) {
    const el = document.getElementById(`toggle-${key}`)
    if (!el) continue
    el.addEventListener('click', async () => {
      const isOn = !el.classList.contains('off')
      el.classList.toggle('off', isOn)
      await chrome.storage.sync.set({ [key]: !isOn }).catch(() => {})
    })
  }
}

// ---------------------------------------------------------------------------
// Language setting
// ---------------------------------------------------------------------------
async function initLang() {
  const { lang } = await chrome.storage.local.get('lang').catch(() => ({}))
  const current = lang || 'pl'
  document.getElementById('lang-pl').classList.toggle('active', current === 'pl')
  document.getElementById('lang-en').classList.toggle('active', current === 'en')
}

window.setLang = async (l) => {
  await chrome.storage.local.set({ lang: l }).catch(() => {})
  document.getElementById('lang-pl').classList.toggle('active', l === 'pl')
  document.getElementById('lang-en').classList.toggle('active', l === 'en')
}

// ---------------------------------------------------------------------------
// User info
// ---------------------------------------------------------------------------
async function loadUser() {
  const stored = await chrome.storage.local.get('lang').catch(() => ({}))
  const token  = await getAuthToken()
  if (!token) {
    document.getElementById('userName').textContent    = 'Nie zalogowano'
    document.getElementById('userEmail').textContent   = '—'
    document.getElementById('userAvatar').textContent  = '?'
    document.getElementById('connBadge').textContent   = 'Brak połączenia'
    document.getElementById('connBadge').style.color   = '#c84040'
    document.getElementById('connBadge').style.borderColor = '#e0b5b5'
    document.getElementById('connBadge').style.background  = '#fce8e8'
    document.getElementById('connBadge').style.setProperty('--before-bg', '#f87171')
    return
  }
  try {
    const res  = await fetch(`${CONFIG.API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error()
    const user = await res.json()
    document.getElementById('userName').textContent   = user.email.split('@')[0]
    document.getElementById('userEmail').textContent  = user.email
    document.getElementById('userAvatar').textContent = user.email[0].toUpperCase()
  } catch {
    document.getElementById('userName').textContent  = 'Sesja wygasła'
    document.getElementById('userEmail').textContent = 'Zaloguj się ponownie'
  }
}

async function getAuthToken() {
  if (CONFIG.API_URL.includes('localhost:5173')) return 'mock-dev-token'
  if (!chrome.cookies) return null
  return new Promise(resolve => {
    chrome.cookies.get({ url: CONFIG.API_URL, name: 'access_token' }, c => resolve(c?.value ?? null))
  })
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const token = await getAuthToken()
  if (token) {
    fetch(`${CONFIG.API_URL}/api/auth/logout`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
  if (chrome.cookies) chrome.cookies.remove({ url: CONFIG.API_URL, name: 'access_token' }, () => {})
  chrome.tabs.create({ url: `${CONFIG.APP_URL}/login` })
})

// ---------------------------------------------------------------------------
// Keyboard shortcut display
// ---------------------------------------------------------------------------
async function loadShortcut() {
  const commands = await chrome.commands.getAll()
  const cmd = commands.find(c => c.name === 'clip-page')
  document.getElementById('shortcutClip').textContent = cmd?.shortcut || 'Nie ustawiony'
}

document.getElementById('changeShortcutLink').addEventListener('click', e => {
  e.preventDefault()
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })
})

// ---------------------------------------------------------------------------
// About / version
// ---------------------------------------------------------------------------
function loadVersion() {
  const v = chrome.runtime.getManifest().version
  document.getElementById('extVersion').textContent  = v
  document.getElementById('footVersion').textContent = v
  document.getElementById('backendUrl').textContent  = CONFIG.API_URL
}

document.getElementById('reportBugLink').addEventListener('click', e => {
  e.preventDefault()
  chrome.tabs.create({ url: 'https://github.com/pszal/HireTree/issues' })
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
loadUser()
loadToggles()
wireToggles()
initLang()
loadShortcut()
loadVersion()
