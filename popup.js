const btn    = document.getElementById('clipBtn')
const status = document.getElementById('status')

btn.addEventListener('click', async () => {
  btn.disabled = true
  status.className = ''
  status.textContent = 'Clipping...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPage,
    })

    const res = await fetch(`${CONFIG.API_URL}/api/clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    })

    if (!res.ok) throw new Error(`Server responded with ${res.status}`)

    status.className = 'success'
    status.textContent = 'Saved ✓'
  } catch (err) {
    console.error('[HireTree Clip]', err)
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
