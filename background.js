// ---------------------------------------------------------------------------
// HireTree Clip — background service worker
// Handles: context menu, keyboard shortcut, notifications
// ---------------------------------------------------------------------------

importScripts('config.js')

const SITES = [
  { match: 'justjoin.it',      selector: 'main'               },
  { match: 'nofluffjobs.com',  selector: 'main'               },
  { match: 'linkedin.com',     selector: '.jobs-description'  },
  { match: 'pracuj.pl',        selector: 'main'               },
  { match: 'theprotocol.it',   selector: 'main'               },
  { match: 'bulldogjob.pl',    selector: 'main'               },
]

// ---------------------------------------------------------------------------
// Auth + fetch helpers (same logic as popup.js)
// ---------------------------------------------------------------------------

async function getAuthToken() {
  if (CONFIG.API_URL.includes('localhost:5173')) return 'mock-dev-token'
  if (!chrome.cookies) return null
  return new Promise(resolve => {
    chrome.cookies.get(
      { url: CONFIG.API_URL, name: 'access_token' },
      cookie => resolve(cookie?.value ?? null),
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

// Pure function — injected into the page via scripting.executeScript
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
  return { url, raw_text: text }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function notify(id, message, buttons = []) {
  const options = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon48.png'),
    title: 'HireTree Clip',
    message,
  }
  if (buttons.length) options.buttons = buttons
  chrome.notifications.create(id, options)
}

// ---------------------------------------------------------------------------
// Core clip logic
// ---------------------------------------------------------------------------

async function doClip(tabId, force = false) {
  try {
    const token = await getAuthToken()
    if (!token) {
      notify('clip-error', 'Not logged in — open HireTree and sign in.')
      return
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
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
      // Store tab so the "Save anyway" notification button can re-clip it
      await chrome.storage.session.set({ pendingClipTabId: tabId })
      notify('clip-not-job', "Doesn't look like a job offer.", [
        { title: 'Save anyway' },
        { title: 'Dismiss'     },
      ])
      return
    }

    if (data.duplicate) {
      notify('clip-duplicate', 'Already in your list.')
      return
    }

    notify('clip-success', 'Saved to HireTree ✓')

  } catch (err) {
    console.error('[HireTree background]', err)
    notify('clip-error', err.message || 'Something went wrong.')
  }
}

// ---------------------------------------------------------------------------
// Context menu — created once on install, persists across SW sleep cycles
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Clip to HireTree',
    contexts: ['page'],
  }, () => void chrome.runtime.lastError) // suppress "already exists" error
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clip-page' && tab?.id) {
    doClip(tab.id)
  }
})

// ---------------------------------------------------------------------------
// Keyboard shortcut
// ---------------------------------------------------------------------------

chrome.commands.onCommand.addListener(async command => {
  if (command !== 'clip-page') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) doClip(tab.id)
})

// ---------------------------------------------------------------------------
// Notification button clicks ("Save anyway" after is_job_offer: false)
// ---------------------------------------------------------------------------

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIdx) => {
  chrome.notifications.clear(notifId)

  if (notifId === 'clip-not-job' && btnIdx === 0) {
    const { pendingClipTabId } = await chrome.storage.session.get('pendingClipTabId')
    if (pendingClipTabId) {
      await chrome.storage.session.remove('pendingClipTabId')
      doClip(pendingClipTabId, true)
    }
  }
})
