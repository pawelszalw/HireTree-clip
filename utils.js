async function notifyHireTreeTabs() {
  const tabs = await chrome.tabs.query({ url: `${CONFIG.APP_URL}/*` })
  for (const tab of tabs) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.dispatchEvent(new CustomEvent('hiretree:job-clipped')),
    }).catch(() => {})
  }
}
