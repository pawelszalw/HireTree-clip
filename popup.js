const btn    = document.getElementById('clipBtn')
const status = document.getElementById('status')

btn.addEventListener('click', async () => {
  btn.disabled = true
  status.className = ''
  status.textContent = 'Clipping...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    console.log('[clip] active tab:', tab?.url)

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPage,
    })
    console.log('[clip] extracted:', { url: result.url, length: result.raw_text?.length })

    const endpoint = `${CONFIG.API_URL}/api/clip`
    console.log('[clip] posting to:', endpoint)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    })

    console.log('[clip] response status:', res.status)

    if (!res.ok) throw new Error(`Server error: ${res.status}`)

    const data = await res.json()
    console.log('[clip] response body:', data)

    status.className = 'success'
    status.textContent = `Saved ✓  ${data.title ?? ''}`
  } catch (err) {
    console.error('[clip] error:', err)
    status.className = 'error'
    status.textContent = 'Error: ' + err.message
    btn.disabled = false
  }
})

function extractPage() {
  return {
    url:      window.location.href,
    raw_text: document.body.innerText.trim(),
  }
}
