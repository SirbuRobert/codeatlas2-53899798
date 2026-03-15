// CodeAtlas Content Script
// Injects an "⚡ CodeAtlas" button into GitHub repository pages

(function () {
  'use strict';

  // Only run on repo root/tree pages, not issues/PRs/settings etc.
  function isRepoPage() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    // github.com/owner/repo  or  github.com/owner/repo/tree/...
    return parts.length >= 2 && !['issues', 'pulls', 'settings', 'actions', 'wiki', 'security', 'pulse', 'graphs', 'network'].includes(parts[2]);
  }

  function getRepoPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return null;
  }

  function injectButton() {
    if (!isRepoPage()) return;
    if (document.getElementById('codeatlas-btn')) return; // already injected

    const repoPath = getRepoPath();
    if (!repoPath) return;

    // Find GitHub's action buttons area (Watch/Star/Fork row)
    const actionBar = document.querySelector('ul.pagehead-actions') ||
                      document.querySelector('[data-view-component="true"].d-flex.flex-wrap');

    if (!actionBar) return;

    // Create button wrapper (matches GitHub's li structure)
    const li = document.createElement('li');
    li.id = 'codeatlas-btn';

    const btn = document.createElement('a');
    btn.href = '#';
    btn.title = 'Analyze this repo with CodeAtlas';
    btn.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 500;
      color: #f0f6fc;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      border: 1px solid rgba(124,58,237,0.6);
      border-radius: 6px;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    `;
    btn.onmouseenter = () => (btn.style.opacity = '0.85');
    btn.onmouseleave = () => (btn.style.opacity = '1');

    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      CodeAtlas
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Ask background to open the side panel
      chrome.runtime.sendMessage({
        type: 'OPEN_SIDEPANEL',
        repoPath,
      });
      // Also update the sidebar's iframe URL via storage
      chrome.storage.local.set({ pendingRepo: repoPath });
    });

    li.appendChild(btn);
    actionBar.appendChild(li);
  }

  // Run on initial load
  injectButton();

  // Re-run on GitHub's SPA navigation (pjax / turbo)
  document.addEventListener('pjax:end', injectButton);
  document.addEventListener('turbo:render', injectButton);
  window.addEventListener('popstate', () => setTimeout(injectButton, 300));
})();
