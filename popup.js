// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------
const I18N = {
  pl: {
    'auth.title':       'Zaloguj się aby clipować',
    'auth.desc':        'Darmowe konto HireTree. Konfiguracja zajmuje 2 minuty.',
    'auth.login':       'Zaloguj się →',
    'auth.register':    'Utwórz darmowe konto',
    'clip.btn':         '📎 Dodaj do HireTree',
    'unsupp.status':    'Strona nierozpoznana',
    'unsupp.warn':      'Nie mogę automatycznie odczytać pól oferty. Wyślę pełny tekst strony — AI spróbuje sparsować dane.',
    'unsupp.list':      'Obsługiwane portale:',
    'unsupp.btn':       '📎 Wyślij tekst strony',
    'calc.title':       'Zapisano!',
    'calc.desc':        'Trwa obliczanie Twojego match score…',
    'match.open':       'Otwórz w HireTree →',
    'match.simulate':   '▶ Symuluj rozmowę',
    'match.of':         'z',
    'match.skills':     'umiejętności',
    'match.missing':    'Brakuje:',
    'err.conn':         'Brak połączenia z HireTree',
    'err.title':        'Błąd sieci',
    'err.default':      'Sprawdź połączenie z internetem i spróbuj ponownie.',
    'err.retry':        '↺ Spróbuj ponownie',
    'err.open':         'Otwórz HireTree',
    'foot.logout':      'Wyloguj',
    'foot.notloggedin': 'Nie zalogowano',
    'foot.open':        'Otwórz HireTree',
    'ready.user':       'Zalogowany jako',
    'ready.unrecog':    'Strona nierozpoznana',
    'ready.detected':   ' ✓',
    'shortcut.hint':    'Ctrl + Shift + H',
  },
  en: {
    'auth.title':       'Sign in to clip',
    'auth.desc':        'Free HireTree account. Setup takes 2 minutes.',
    'auth.login':       'Sign in →',
    'auth.register':    'Create free account',
    'clip.btn':         '📎 Add to HireTree',
    'unsupp.status':    'Site not recognized',
    'unsupp.warn':      "Can't auto-detect offer fields. Sending the full page text — AI will try to parse it.",
    'unsupp.list':      'Supported portals:',
    'unsupp.btn':       '📎 Send page text',
    'calc.title':       'Saved!',
    'calc.desc':        'Calculating your match score…',
    'match.open':       'Open in HireTree →',
    'match.simulate':   '▶ Simulate interview',
    'match.of':         'of',
    'match.skills':     'skills',
    'match.missing':    'Missing:',
    'err.conn':         'Cannot connect to HireTree',
    'err.title':        'Network error',
    'err.default':      'Check your internet connection and try again.',
    'err.retry':        '↺ Try again',
    'err.open':         'Open HireTree',
    'foot.logout':      'Sign out',
    'foot.notloggedin': 'Not signed in',
    'foot.open':        'Open HireTree',
    'ready.user':       'Signed in as',
    'ready.unrecog':    'Site not recognized',
    'ready.detected':   ' ✓',
    'shortcut.hint':    'Ctrl + Shift + H',
  },
}

let lang = 'pl'
const t = key => I18N[lang]?.[key] ?? I18N.pl[key] ?? key

function applyI18n() {
  document.getElementById('langToggle').textContent  = lang === 'pl' ? 'EN' : 'PL'
  document.getElementById('authTitle').textContent   = t('auth.title')
  document.getElementById('authDesc').textContent    = t('auth.desc')
  document.getElementById('loginBtn').textContent    = t('auth.login')
  document.getElementById('registerLink').textContent= t('auth.register')
  document.getElementById('clipBtn').textContent     = t('clip.btn')
  document.getElementById('unsuppStatus').textContent= t('unsupp.status')
  document.getElementById('unsuppWarn').textContent  = t('unsupp.warn')
  document.getElementById('unsuppListLabel').textContent = t('unsupp.list')
  document.getElementById('clipUnsuppBtn').textContent   = t('unsupp.btn')
  document.getElementById('calcTitle').textContent   = t('calc.title')
  document.getElementById('calcDesc').textContent    = t('calc.desc')
  document.getElementById('openJobBtn').textContent  = t('match.open')
  document.getElementById('simulateBtn').textContent = t('match.simulate')
  document.getElementById('errConn').textContent     = t('err.conn')
  document.getElementById('errTitle').textContent    = t('err.title')
  document.getElementById('retryBtn').textContent    = t('err.retry')
  document.getElementById('errOpenApp').textContent  = t('err.open')
  document.getElementById('shortcutHint').textContent= t('shortcut.hint')
}

// ---------------------------------------------------------------------------
// Supported job boards
// ---------------------------------------------------------------------------
const SITES = [
  { match: 'justjoin.it',     name: 'JustJoinIT',  selector: 'main',               supported: true, applyAppend: '/apply'                                      },
  { match: 'nofluffjobs.com', name: 'NoFluffJobs', selector: 'main',               supported: true, applySelector: 'a[href*="apply"]'                          },
  { match: 'linkedin.com',    name: 'LinkedIn',    selector: '.jobs-description',  supported: true, applySelector: 'a[href*="apply"]'                          },
  { match: 'pracuj.pl',       name: 'Pracuj.pl',   selector: 'main',               supported: true, applySelector: 'a[href*="aplikuj"], a[href*="apply"]'      },
  { match: 'theprotocol.it',  name: 'TheProtocol', selector: 'main',               supported: true, applySelector: 'a[href*="apply"]'                          },
  { match: 'bulldogjob.pl',   name: 'Bulldogjob',  selector: 'main',               supported: true, applySelector: 'a[href*="apply"]'                          },
]

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
const ALL_STATES = ['loggedout', 'ready', 'unsupported', 'calculating', 'match', 'error']

function setState(name) {
  ALL_STATES.forEach(s => {
    const el = document.getElementById(`state-${s}`)
    if (!el) return
    const isActive = s === name
    el.classList.toggle('hidden', !isActive)
    if (isActive) el.style.display = ''
  })
  updateFooter(name)
}

let currentUser = null
let currentJobId = null

function updateFooter(state) {
  const emailEl  = document.getElementById('footEmail')
  const actionEl = document.getElementById('footAction')
  if (state === 'loggedout') {
    emailEl.textContent  = t('foot.notloggedin')
    actionEl.textContent = ''
    actionEl.onclick     = null
  } else if (state === 'match' || state === 'calculating') {
    emailEl.textContent  = currentUser?.email ?? ''
    actionEl.textContent = t('foot.open')
    actionEl.onclick     = () => chrome.tabs.create({ url: CONFIG.APP_URL })
  } else {
    emailEl.textContent  = currentUser?.email ?? ''
    actionEl.textContent = t('foot.logout')
    actionEl.onclick     = doLogout
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
async function getAuthToken() {
  if (CONFIG.API_URL.includes('localhost:5173')) return 'mock-dev-token'
  if (!chrome.cookies) return null
  return new Promise(resolve => {
    chrome.cookies.get({ url: CONFIG.API_URL, name: 'access_token' }, c => resolve(c?.value ?? null))
  })
}

async function apiFetch(path, token, options = {}) {
  return fetch(`${CONFIG.API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers ?? {}) },
  })
}

function detectSite(url) {
  return SITES.find(s => url.includes(s.match)) ?? null
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
let currentTab  = null
let currentSite = null

async function init() {
  // Load lang preference
  const stored = await chrome.storage.local.get('lang').catch(() => ({}))
  if (stored.lang) lang = stored.lang
  applyI18n()

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  currentTab  = tab
  currentSite = detectSite(tab?.url ?? '')

  const token = await getAuthToken()
  if (!token) return setState('loggedout')

  try {
    const res = await apiFetch('/api/auth/me', token)
    if (!res.ok) return setState('loggedout')
    currentUser = await res.json()
  } catch {
    return setState('loggedout')
  }

  if (currentSite) {
    document.getElementById('readyUser').textContent = `${t('ready.user')} ${currentUser.email}`
    document.getElementById('readySite').textContent = currentSite.name + t('ready.detected')
    document.getElementById('offerTitle').textContent = cleanTitle(tab?.title ?? '')
    document.getElementById('offerMeta').textContent  = currentSite.name
    setState('ready')
  } else {
    document.getElementById('unsuppUser').textContent = `${t('ready.user')} ${currentUser.email}`
    setState('unsupported')
  }
}

function cleanTitle(raw) {
  // Strip common noise from page titles (site names appended after |, -, –)
  return raw.replace(/\s*[\|\-–—]\s*.{3,}$/, '').trim() || raw
}

// ---------------------------------------------------------------------------
// Clip logic
// ---------------------------------------------------------------------------
async function doClip(force = false) {
  const token = await getAuthToken()
  if (!token) return setState('loggedout')

  setState('calculating')

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: extractPage,
      args: [SITES],
    })

    const res = await apiFetch('/api/clip', token, {
      method: 'POST',
      body: JSON.stringify({ ...result, force }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? `Server error ${res.status}`)
    }

    const data = await res.json()

    if (data.is_job_offer === false) {
      showError(t('unsupp.warn'), false)
      return
    }

    currentJobId = data.id
    await notifyHireTreeTabs()
    await pollMatch(data.id, token)

  } catch (err) {
    showError(err.message)
  }
}

// ---------------------------------------------------------------------------
// Poll for match score (up to 5 × 1.5s)
// ---------------------------------------------------------------------------
async function pollMatch(jobId, token) {
  const MAX = 5
  for (let i = 0; i < MAX; i++) {
    await sleep(1500)
    try {
      const res = await apiFetch(`/api/jobs/${jobId}`, token)
      if (!res.ok) break
      const job = await res.json()
      if (job.match_score !== null && job.match_score !== undefined) {
        renderMatch(job)
        return
      }
    } catch { break }
  }
  // Timeout — show saved without score
  renderMatch({ id: jobId, match_score: null, matched: [], missing: [] })
}

function renderMatch(job) {
  const score = job.match_score
  if (score !== null && score !== undefined) {
    document.getElementById('matchScore').textContent = score + '%'
    const matched = (job.matched ?? []).length
    const total   = matched + (job.missing ?? []).length
    document.getElementById('matchLabel').textContent = `match · ${matched} ${t('match.of')} ${total} ${t('match.skills')}`
    if (job.missing?.length) {
      const tags = job.missing.map(s => `<span class="miss-tag">${s}</span>`).join(' ')
      document.getElementById('matchMissing').innerHTML = `${t('match.missing')} ${tags}`
    } else {
      document.getElementById('matchMissing').textContent = ''
    }
  } else {
    document.getElementById('matchScore').textContent  = '✓'
    document.getElementById('matchLabel').textContent  = t('calc.title')
    document.getElementById('matchMissing').textContent = ''
  }

  document.getElementById('openJobBtn').onclick  = () => chrome.tabs.create({ url: `${CONFIG.APP_URL}/jobs/${job.id}` })
  document.getElementById('simulateBtn').onclick = () => chrome.tabs.create({ url: `${CONFIG.APP_URL}/simulator?job=${job.id}` })

  setState('match')
}

function showError(message, userLoggedIn = true) {
  document.getElementById('errMsg').textContent  = message || t('err.default')
  document.getElementById('errUser').textContent = currentUser?.email ?? ''
  if (!userLoggedIn) {
    document.getElementById('errUserDot').className = 'sdot red'
    document.getElementById('errUser').textContent  = t('foot.notloggedin')
  }
  document.getElementById('errOpenApp').onclick = () => chrome.tabs.create({ url: CONFIG.APP_URL })
  setState('error')
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
async function doLogout() {
  const token = await getAuthToken()
  if (token) apiFetch('/api/auth/logout', token, { method: 'POST' }).catch(() => {})
  if (chrome.cookies) {
    chrome.cookies.remove({ url: CONFIG.API_URL, name: 'access_token' }, () => {})
  }
  currentUser = null
  setState('loggedout')
}

// ---------------------------------------------------------------------------
// Injected page extraction (pure — no closure refs)
// ---------------------------------------------------------------------------
function extractPage(sites) {
  const url  = window.location.href
  const site = sites.find(s => url.includes(s.match))
  let text   = ''
  if (site?.selector) {
    const el = document.querySelector(site.selector)
    text = el ? el.innerText.trim() : document.body.innerText.trim()
  } else {
    text = document.body.innerText.trim()
  }
  let apply_url = ''
  if (site?.applyAppend) {
    apply_url = url.split('?')[0].replace(/\/$/, '') + site.applyAppend
  } else if (site?.applySelector) {
    const el = document.querySelector(site.applySelector)
    if (el) apply_url = el.href
  }
  if (!apply_url) {
    const kw = ['apply', 'aplikuj', 'apply now', 'quick apply']
    const a  = Array.from(document.querySelectorAll('a[href]')).find(a =>
      kw.some(k => a.textContent.trim().toLowerCase().includes(k)) ||
      kw.some(k => a.href.toLowerCase().includes(k))
    )
    if (a) apply_url = a.href
  }
  return { url, raw_text: text, apply_url }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ---------------------------------------------------------------------------
// Event wiring
// ---------------------------------------------------------------------------
document.getElementById('loginBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: `${CONFIG.APP_URL}/login` })
})
document.getElementById('registerLink').addEventListener('click', e => {
  e.preventDefault()
  chrome.tabs.create({ url: `${CONFIG.APP_URL}/register` })
})
document.getElementById('clipBtn').addEventListener('click', () => doClip(false))
document.getElementById('clipUnsuppBtn').addEventListener('click', () => doClip(false))
document.getElementById('retryBtn').addEventListener('click', () => init())
document.getElementById('langToggle').addEventListener('click', async () => {
  lang = lang === 'pl' ? 'en' : 'pl'
  await chrome.storage.local.set({ lang })
  applyI18n()
  // Re-render current state strings
  if (currentUser) {
    document.getElementById('readyUser').textContent  = `${t('ready.user')} ${currentUser.email}`
    document.getElementById('unsuppUser').textContent = `${t('ready.user')} ${currentUser.email}`
    document.getElementById('errUser').textContent    = currentUser.email
  }
  if (currentSite) {
    document.getElementById('readySite').textContent = currentSite.name + t('ready.detected')
  }
  updateFooter(ALL_STATES.find(s => !document.getElementById(`state-${s}`).classList.contains('hidden')) ?? 'ready')
})

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
init()
