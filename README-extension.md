# CodeAtlas Chrome Extension

Turn CodeAtlas into a **GitHub Sidebar Extension** — analyze any repo in a Chrome Side Panel directly from github.com.

## How it works

1. Navigate to any GitHub repo (e.g. `github.com/vercel/next.js`)
2. Click the **⚡ CodeAtlas** button injected into the GitHub header
3. The Side Panel opens and loads CodeAtlas with the repo pre-filled
4. Analysis starts automatically — graph, AI chat, and risk analysis appear inline

---

## Installation (Developer Mode)

> No Chrome Web Store account needed for local use.

### Step 1 — Build the web app

```bash
npm run build
```

This creates a `dist/` folder with the compiled React app.

### Step 2 — Assemble the extension

```bash
npm run build:extension
```

This copies `dist/` + `chrome-extension/` into `dist-extension/`.

### Step 3 — Add icons (one-time)

Place square PNG icons in `chrome-extension/icons/`:
- `icon16.png` — 16×16 px
- `icon48.png` — 48×48 px  
- `icon128.png` — 128×128 px

You can use any CodeAtlas logo or the lightning bolt ⚡ as the icon.

### Step 4 — Load in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `dist-extension/` folder
5. The CodeAtlas icon appears in your Chrome toolbar ✅

---

## Usage

| Action | Result |
|--------|--------|
| Go to `github.com/owner/repo` | ⚡ CodeAtlas button appears in the repo header |
| Click ⚡ CodeAtlas button | Side Panel opens with auto-analysis |
| Click toolbar icon (any page) | Opens Side Panel manually |
| Click **↗ Full tab** in sidebar | Opens CodeAtlas in a new full tab |

---

## How the URL param integration works

The sidebar loads:
```
https://codeatlas2.lovable.app/?repo=owner/repo&auto=true
```

The web app reads these params on mount and automatically triggers analysis — no manual input required.

---

## Publishing to Chrome Web Store

1. Zip the `dist-extension/` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay one-time $5 developer fee
4. Upload the zip, fill in description + screenshots
5. Submit for review (~1-3 business days)

---

## File structure

```
chrome-extension/
  manifest.json          ← Manifest V3 config
  background.js          ← Service worker: opens Side Panel on click
  content-script.js      ← Injects ⚡ button on GitHub repo pages
  sidebar/
    index.html           ← Side Panel UI with iframe + header
  icons/
    icon16.png           ← (you add these)
    icon48.png
    icon128.png
```

---

## Permissions requested

| Permission | Why |
|------------|-----|
| `sidePanel` | Open the Chrome Side Panel |
| `activeTab` | Read current tab's URL |
| `tabs` | Open new tabs (Full tab button) |
| `https://github.com/*` | Inject ⚡ button on GitHub pages |
| `storage` | Pass repo URL from content script to sidebar |
