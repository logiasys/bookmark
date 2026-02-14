const MAX_RESULTS = 40;
const STYLE_FILE = "overlay.css";
const SCRIPT_FILE = "overlay.js";

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureOverlayInjected(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: [STYLE_FILE]
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [SCRIPT_FILE]
  });
}

async function getNodePath(parentId) {
  const segments = [];
  let cursor = parentId;

  while (cursor) {
    const [node] = await chrome.bookmarks.get(cursor);
    if (!node) break;

    const title = node.title?.trim();
    if (title) segments.unshift(title);
    cursor = node.parentId;
  }

  return segments;
}

function normalizeUrl(urlString = "") {
  try {
    const url = new URL(urlString);
    return {
      url: url.toString(),
      domain: url.hostname.replace(/^www\./i, "")
    };
  } catch {
    return { url: urlString, domain: "" };
  }
}

async function searchBookmarks(query) {
  const raw = (query || "").trim();
  if (!raw) return [];

  const nodes = await chrome.bookmarks.search(raw);
  const leafNodes = nodes.filter((node) => node.url);

  const results = await Promise.all(
    leafNodes.slice(0, MAX_RESULTS).map(async (node) => {
      const { url, domain } = normalizeUrl(node.url);
      const path = await getNodePath(node.parentId);

      return {
        id: node.id,
        title: (node.title || url).trim(),
        url,
        domain,
        path
      };
    })
  );

  return results;
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-palette") return;

  const tab = await getActiveTab();
  if (!tab?.id) return;

  await ensureOverlayInjected(tab.id);
  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PALETTE" });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "SEARCH") {
      const results = await searchBookmarks(message.query);
      sendResponse({ results });
      return;
    }

    if (message?.type === "OPEN") {
      const tabId = sender.tab?.id;
      if (!tabId || !message.url) {
        sendResponse({ ok: false });
        return;
      }

      if (message.disposition === "newTab") {
        await chrome.tabs.create({ url: message.url, active: true });
      } else {
        await chrome.tabs.update(tabId, { url: message.url });
      }

      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false });
  })();

  return true;
});
