// ---------------------------------------------------------------------------
// Supported job boards — selector targets the main job content area
// to avoid nav / footer / cookie banners in the extracted text.
// ---------------------------------------------------------------------------
const SITES = [
  { match: 'justjoin.it',      name: 'JustJoinIT',   selector: 'main',              supported: true, applyAppend: '/apply'                                          },
  { match: 'nofluffjobs.com',  name: 'NoFluffJobs',  selector: 'main',              supported: true, applySelector: 'a[href*="apply"]'                              },
  { match: 'linkedin.com',     name: 'LinkedIn',      selector: '.jobs-description', supported: true, applySelector: 'a[href*="apply"]'                              },
  { match: 'pracuj.pl',        name: 'Pracuj.pl',     selector: 'main',              supported: true, applySelector: 'a[href*="aplikuj"], a[href*="apply"]'          },
  { match: 'theprotocol.it',   name: 'TheProtocol',   selector: 'main',              supported: true, applySelector: 'a[href*="apply"]'                              },
  { match: 'bulldogjob.pl',    name: 'Bulldogjob',    selector: 'main',              supported: true, applySelector: 'a[href*="apply"]'                              },
]

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const btn        = document.getElementById('clipBtn')
const status     = document.getElementById('status')
const viewLink   = document.getElementById('viewLink')
const saveAnyway = document.getElementById('saveAnyway')
const userDot    = document.getElementById('userDot')
const userLabel  = document.getElementById('userLabel')
const siteDot    = document.getElementById('siteDot')
const siteLabel  = document.getElementById('siteLabel')
const siteBadge  = document.getElementById('siteBadge')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setStatus(type, text) {
  status.className = type
  status.textContent = text
}

function showViewLink(jobId) {
  viewLink.classList.add('visible')
  viewLink.onclick = () => {
    chrome.tabs.create({ url: `${CONFIG.APP_URL}/jobs/${jobId}` })
  }
}

async function getAuthToken() {
  // Mock mode (Vite dev server) — skip cookie lookup entirely.
  // The mock API accepts any token without validation.
  if (CONFIG.API_URL.includes('localhost:5173')) {
    return 'mock-dev-token'
  }

  // Real backend — read the httpOnly cookie Chrome set when the user logged in.
  if (!chrome.cookies) return null
  return new Promise(resolve => {
    chrome.cookies.get(
      { url: CONFIG.API_URL, name: 'access_token' },
      cookie => resolve(cookie?.value ?? null)
    )
  })
}

async function apiFetch(path, token, options = {}) {
  return fetch(`${CONFIG.API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
}

function detectSite(url) {
  return SITES.find(s => url.includes(s.match)) ?? null
}

// ---------------------------------------------------------------------------
// Init — runs when popup opens
// ---------------------------------------------------------------------------
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabUrl = tab?.url ?? ''

  // Site detection — informational only, all pages are clippable
  const site = detectSite(tabUrl)
  if (site) {
    siteDot.className = 'dot green'
    siteLabel.textContent = site.name
    siteBadge.textContent = 'optimised'
    siteBadge.className = 'site-badge supported'
    siteBadge.style.display = ''
  } else {
    siteDot.className = 'dot yellow'
    siteLabel.textContent = 'Any page can be clipped'
    siteBadge.textContent = 'generic'
    siteBadge.className = 'site-badge generic'
    siteBadge.style.display = ''
  }

  // Auth check
  const token = await getAuthToken()
  if (!token) {
    userDot.className = 'dot red'
    userLabel.textContent = 'Not logged in — open HireTree and sign in'
    btn.disabled = true
    setStatus('error', '')
    return
  }

  try {
    const res = await apiFetch('/api/auth/me', token)
    if (!res.ok) throw new Error()
    const user = await res.json()
    userDot.className = 'dot green'
    userLabel.textContent = user.email
    btn.disabled = false
    setStatus('', 'Ready to clip this page.')
  } catch {
    userDot.className = 'dot red'
    userLabel.textContent = 'Session expired — please log in again'
    btn.disabled = true
  }
}

// ---------------------------------------------------------------------------
// Open app button
// ---------------------------------------------------------------------------
document.getElementById('openApp').addEventListener('click', () => {
  chrome.tabs.create({ url: CONFIG.APP_URL })
})

// ---------------------------------------------------------------------------
// Shortcut — show current value + toggle instructions panel
// ---------------------------------------------------------------------------
async function loadShortcut() {
  const commands = await chrome.commands.getAll()
  const cmd = commands.find(c => c.name === 'clip-page')
  const shortcutValue = document.getElementById('shortcutValue')
  if (cmd?.shortcut) {
    shortcutValue.innerHTML = `<kbd>${cmd.shortcut}</kbd>`
  } else {
    shortcutValue.textContent = 'Not set'
  }
}

document.getElementById('shortcutChangeBtn').addEventListener('click', () => {
  const panel = document.getElementById('shortcutPanel')
  panel.classList.toggle('open')
})

document.getElementById('copyUrlBtn').addEventListener('click', async () => {
  await navigator.clipboard.writeText('chrome://extensions/shortcuts')
  const btn = document.getElementById('copyUrlBtn')
  btn.textContent = 'Copied ✓'
  setTimeout(() => { btn.textContent = 'Copy ↗' }, 2000)
})

// ---------------------------------------------------------------------------
// Core clip logic — reused for normal clip and "Save anyway"
// ---------------------------------------------------------------------------
async function doClip(force = false) {
  btn.disabled = true
  btn.textContent = 'Clipping…'
  saveAnyway.style.display = 'none'
  setStatus('', '')
  viewLink.classList.remove('visible')

  try {
    const token = await getAuthToken()
    if (!token) {
      setStatus('error', 'Not logged in.')
      btn.textContent = 'Clip this page'
      btn.disabled = false
      return
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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
      // AI says this is not a job offer — ask the user
      setStatus('warn', "Doesn't look like a job offer.")
      saveAnyway.style.display = 'inline'
      btn.textContent = 'Clip this page'
      btn.disabled = false
      return
    }

    if (data.duplicate) {
      setStatus('warn', 'Already in your list.')
      showViewLink(data.id)
      btn.textContent = 'Clip this page'
      btn.disabled = false
    } else {
      setStatus('success', 'Saved ✓')
      showViewLink(data.id)
      btn.textContent = 'Clip this page'
      await notifyHireTreeTabs()
    }

  } catch (err) {
    console.error('[HireTree Clip]', err)
    setStatus('error', err.message)
    btn.textContent = 'Clip this page'
    btn.disabled = false
  }
}

// ---------------------------------------------------------------------------
// Clip button
// ---------------------------------------------------------------------------
btn.addEventListener('click', () => doClip(false))

// ---------------------------------------------------------------------------
// Save anyway button (shown after is_job_offer: false response)
// ---------------------------------------------------------------------------
saveAnyway.addEventListener('click', () => doClip(true))

// ---------------------------------------------------------------------------
// Injected into the page — must be a pure function (no closure references)
// ---------------------------------------------------------------------------
function extractPage(sites) {
  const url = window.location.href
  const site = sites.find(s => url.includes(s.match))

  let text = ''
  if (site?.selector) {
    const el = document.querySelector(site.selector)
    text = el ? el.innerText.trim() : document.body.innerText.trim()
  } else {
    text = document.body.innerText.trim()
  }

  // Find apply link — site-specific first, then generic text/href search
  let apply_url = ''
  if (site?.applyAppend) {
    const base = url.split('?')[0].replace(/\/$/, '')
    apply_url = base + site.applyAppend
  } else if (site?.applySelector) {
    const el = document.querySelector(site.applySelector)
    if (el) apply_url = el.href
  }
  if (!apply_url) {
    const keywords = ['apply', 'aplikuj', 'apply now', 'quick apply']
    const link = Array.from(document.querySelectorAll('a[href]')).find(a =>
      keywords.some(k => a.textContent.trim().toLowerCase().includes(k)) ||
      keywords.some(k => a.href.toLowerCase().includes(k))
    )
    if (link) apply_url = link.href
  }

  return { url, raw_text: text, apply_url }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
init()
loadShortcut()
