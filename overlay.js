(() => {
  const ROOT_ID = "__bookmark_palette_root__";
  const DEBOUNCE_MS = 80;

  let root = document.getElementById(ROOT_ID);
  let visible = false;
  let selected = 0;
  let results = [];
  let lastQuery = "";
  let searchTimer = null;

  function createEl(tag, attrs = {}) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }

    return node;
  }

  function selectionInBounds() {
    if (results.length === 0) {
      selected = 0;
      return;
    }

    selected = Math.min(selected, results.length - 1);
    selected = Math.max(selected, 0);
  }

  function buildEmptyState(list) {
    const empty = createEl("div", { class: "bp-empty", text: "Sin resultados" });
    list.appendChild(empty);
  }

  function renderResults() {
    const list = root.querySelector(".bp-list");
    list.innerHTML = "";

    if (results.length === 0) {
      buildEmptyState(list);
      return;
    }

    selectionInBounds();

    results.forEach((result, index) => {
      const item = createEl("button", {
        class: `bp-item${index === selected ? " bp-item--selected" : ""}`,
        type: "button"
      });

      const title = createEl("div", { class: "bp-title", text: result.title });
      const url = createEl("div", { class: "bp-url", text: result.url });
      const metaParts = [];

      if (Array.isArray(result.path) && result.path.length > 0) {
        metaParts.push(result.path.join(" › "));
      }

      if (result.domain) {
        metaParts.push(result.domain);
      }

      const meta = createEl("div", { class: "bp-meta", text: metaParts.join(" • ") });

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(url);

      item.addEventListener("mouseenter", () => {
        selected = index;
        renderResults();
      });

      item.addEventListener("click", async () => {
        await openCurrent(false);
      });

      list.appendChild(item);
    });
  }

  async function search(query) {
    const response = await chrome.runtime.sendMessage({ type: "SEARCH", query });
    results = response?.results || [];
    selected = 0;
    renderResults();
  }

  function hide() {
    visible = false;
    if (root) root.style.display = "none";
  }

  async function openCurrent(openInNewTab) {
    const target = results[selected];
    if (!target?.url) return;

    const disposition = openInNewTab ? "newTab" : "currentTab";
    await chrome.runtime.sendMessage({
      type: "OPEN",
      url: target.url,
      disposition
    });

    hide();
  }

  function bindInputEvents(input) {
    input.addEventListener("input", () => {
      lastQuery = input.value;

      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        search(input.value);
      }, DEBOUNCE_MS);
    });

    input.addEventListener("keydown", async (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        hide();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        selected += 1;
        selectionInBounds();
        renderResults();
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        selected -= 1;
        selectionInBounds();
        renderResults();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        await openCurrent(event.metaKey || event.ctrlKey);
      }
    });
  }

  function ensureRoot() {
    if (root) return;

    root = createEl("div", { id: ROOT_ID, class: "bp-root" });
    const box = createEl("section", { class: "bp-box", role: "dialog", "aria-modal": "true" });
    const input = createEl("input", {
      class: "bp-input",
      placeholder: "Buscar bookmark… (Enter abre, ⌘/Ctrl+Enter nueva pestaña)",
      type: "text",
      autocomplete: "off",
      spellcheck: "false"
    });
    const list = createEl("div", { class: "bp-list" });

    bindInputEvents(input);

    root.addEventListener("click", (event) => {
      if (event.target === root) hide();
    });

    box.appendChild(input);
    box.appendChild(list);
    root.appendChild(box);
    document.documentElement.appendChild(root);
  }

  function show() {
    ensureRoot();
    visible = true;
    root.style.display = "block";

    const input = root.querySelector(".bp-input");
    input.value = lastQuery;
    input.focus();
    input.dispatchEvent(new Event("input"));
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "TOGGLE_PALETTE") return;

    if (visible) hide();
    else show();
  });
})();
