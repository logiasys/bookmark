# Bookmark Palette for Brave (MV3)

Extensión tipo **Command Palette / Spotlight** para buscar y abrir bookmarks con teclado sobre la página actual.

## Features del MVP

- Atajo global configurable (por defecto `Ctrl+K` (en macOS equivale a `⌘K`)).
- Overlay in-page con búsqueda en tiempo real.
- Navegación por teclado:
  - `↑/↓`: mover selección.
  - `Enter`: abrir en la pestaña actual.
  - `⌘Enter` / `Ctrl+Enter`: abrir en nueva pestaña.
  - `Esc`: cerrar.
- Resultado enriquecido con ruta de carpetas + dominio.

## Instalación

1. Abre `brave://extensions`.
2. Activa **Developer mode**.
3. Haz click en **Load unpacked** y selecciona esta carpeta (`/workspace/bookmark`).
4. Ve a `brave://extensions/shortcuts` para ajustar atajos.

## Arquitectura

- `manifest.json`: permisos, comandos, service worker.
- `background.js`: inyección del overlay, búsqueda con `chrome.bookmarks`, apertura de resultados.
- `overlay.js`: UI, navegación de teclado, interacción con background vía mensajes.
- `overlay.css`: estilos del modal.

## Próximos pasos recomendados

- Índice fuzzy más robusto (Fuse.js / Lunr).
- Metadata adicional (`tags`, `notas`, `pinned`) en `chrome.storage.local`.
- Smart folders y deduplicación de URLs canónicas.
- Integración de IA vía endpoint compatible OpenAI (BYOM).
