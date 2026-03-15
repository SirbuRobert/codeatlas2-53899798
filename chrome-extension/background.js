// CodeAtlas Background Service Worker
// Opens the Side Panel when the toolbar icon is clicked

chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel for the current window
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Allow the side panel to be opened on github.com pages
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setOptions({
    enabled: true,
  });
});

// Listen for messages from content-script (e.g. "analyze this repo")
chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === 'OPEN_SIDEPANEL' && sender.tab) {
    await chrome.sidePanel.open({ windowId: sender.tab.windowId });

    // Wait briefly for the panel to load, then post the repo URL
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'ANALYZE_REPO',
        repoPath: message.repoPath,
      });
    }, 600);
  }
});
