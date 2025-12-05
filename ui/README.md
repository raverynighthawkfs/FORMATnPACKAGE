# UI assets (Material Design)

This folder contains a minimal Material 3 setup for a web UI:

- `styles/theme.css` – color tokens and basic theming variables (edit to brand).
- `styles/layout.css` – responsive container, grid, and app bar helpers.
- `preview/index.html` – static preview using Material Web components via CDN. Open in a browser to validate tokens and layout.

Notes
- Icons: the preview uses Google Material Symbols (webfont via Google Fonts). For bundling, prefer installing locally or via your app’s build pipeline.
- Components: the preview imports Material Web via unpkg. In production, install with a package manager (e.g. `npm i @material/web`) and import from your code.
- Licensing: Material Symbols and Material Web are provided under permissive licenses by Google; review before bundling in distributed artifacts.

Next steps
- If targeting a desktop shell (e.g. Electron), copy `ui/` into your renderer and wire up real inputs and results.
- If targeting a Python-based desktop app, consider a webview (e.g. PySide/QWebEngine, Tauri + CLI, or Flask + browser) and reuse these assets.