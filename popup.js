const btn    = document.getElementById('clipBtn')
const status = document.getElementById('status')

async function getAuthToken() {
  return new Promise(resolve => {
    chrome.cookies.get(
      { url: CONFIG.API_URL, name: 'access_token' },
      cookie => resolve(cookie?.value ?? null)
    )
  })
}

btn.addEventListener('click', async () => {
  btn.disabled = true
  setStatus('', 'Clipping...')

  try {
    const token = await getAuthToken()

    if (!token) {
      setStatus('error', 'Not logged in — open HireTree and sign in first.')
      btn.disabled = false
      return
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPage,
    })

    const res = await fetch(`${CONFIG.API_URL}/api/clip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(result),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.detail ?? `Server error ${res.status}`)
    }

    const data = await res.json()

    if (data.duplicate) {
      setStatus('warn', 'Already saved — job is already in your list.')
    } else {
      setStatus('success', 'Saved ✓')
    }

  } catch (err) {
    console.error('[HireTree Clip]', err)
    setStatus('error', err.message)
    btn.disabled = false
  }
})

function setStatus(type, text) {
  status.className = type
  status.textContent = text
}

function extractPage() {
  return {
    url:      window.location.href,
    raw_text: document.body.innerText.trim(),
  }
}
