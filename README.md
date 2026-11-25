<p align="center">
  <img src="https://raw.githubusercontent.com/ieenterprises/logo/main/Company%20Logo%203.png" alt="ieWorkspace Logo" width="88" height="88" style="border-radius: 50%;" />
</p>

<h1 align="center">ieWorkspace</h1>

<p align="center">
  <strong>An open source office suite for Word, Excel, PowerPoint, and OpenDocument files — in your browser or on your desktop.</strong>
</p>

ieWorkspace edits Word (`.docx`), Excel (`.xlsx`), PowerPoint (`.pptx`), PDF, and OpenDocument (`.odt`, `.ods`, `.odp`) files with a familiar ribbon, menus, dialogs, and keyboard shortcuts. It runs in the browser on your own server (Docker / Render) or as an offline desktop app. It is free software (**AGPL-3.0-only**), private by design, and fast.

## Key Features

- **Familiar Office experience:** Ribbon tabs and groups, KeyTips (`Alt`), mini toolbar, quick access toolbar, contextual tabs, and Microsoft Office keyboard shortcuts (228 Word shortcuts on Windows, 171 on macOS, plus Excel and PowerPoint habits).
- **High layout fidelity:** Metric-compatible free fonts keep line and page breaks consistent without proprietary Microsoft fonts, with optional support for system fonts.
- **Private by design:** No telemetry, no forced third-party cloud accounts, and nothing sent to external publishers.
- **Optional AI:** Complete without AI; optional AI assistance (rewrite, formulas, charts, pivot tables, slides) is off by default and only connects to an endpoint you configure.
- **Cloud & collaboration:** Real-time co-editing in the browser, plus optional Nextcloud / Murena Workspace integration.
- **International:** 45 interface languages, 49 spelling dictionaries, offline thesaurus in 17 languages, and CJK text support.
- **Fast WebAssembly converter:** Optimised C++ document converter (`x2t`) compiled to WebAssembly for rapid document loading and native-quality PDF export.

## Deploy ieWorkspace

Every push to `main` automatically builds and publishes **`ghcr.io/ieenterprises/ieworkspace:main`** via [.github/workflows/build-ieworkspace.yml](.github/workflows/build-ieworkspace.yml).

### 1. Run locally with Docker

```bash
docker run -d --name ieworkspace -p 8080:80 --shm-size=256m \
  -e EXAMPLE_ENABLED=true \
  -e JWT_ENABLED=true \
  -e JWT_SECRET=change-me-to-a-private-secret \
  -e JWT_HEADER=Authorization \
  -e GENERATE_FONTS=false \
  ghcr.io/ieenterprises/ieworkspace:main
```

Wait until `http://localhost:8080/healthcheck` returns `true`, then open **`http://localhost:8080/example/`**.

### 2. Deploy on Render

All three Render deployment workflows use the exact same `ghcr.io/ieenterprises/ieworkspace:main` image:

- **Blueprint (`render.yaml`):** In Render, choose **New → Blueprint** and select `ieenterprises/ieWorkspace`. This automatically deploys the web service, a managed **PostgreSQL** database (`ieworkspace-db`), a **20 GB Persistent Disk** (`/var/www/elixiroffice/Data`), and synced environment variables.
- **Git (`Dockerfile`):** Choose **New → Web Service → Build and deploy from a Git repository** and select `ieenterprises/ieWorkspace`. Render uses the root [Dockerfile](Dockerfile) (`FROM ghcr.io/ieenterprises/ieworkspace:main`).
- **Existing Image:** Choose **New → Web Service → Deploy an existing image** and enter `ghcr.io/ieenterprises/ieworkspace:main` (set `PORT=80`, `EXAMPLE_ENABLED=true`, `JWT_ENABLED=true`, `JWT_SECRET`, and Health Check Path `/healthcheck`).

> **Note:** Set the `ieworkspace` package visibility to **Public** under GitHub Packages (or add GHCR credentials in Render). A Render plan with at least **2–4 GB RAM** (`pro` recommended) is required for document conversion.

## Documentation

- Server installation and architecture: [docs/install-server.md](docs/install-server.md)
- Development environment: [docs/dev.md](docs/dev.md), [docs/images.md](docs/images.md)
- Branding and theme overlay: [docs/branding.md](docs/branding.md)
- WebAssembly converter: [docs/wasm.md](docs/wasm.md)
- Desktop app: [docs/desktop.md](docs/desktop.md)
- Feature comparison: [docs/differences.md](docs/differences.md)

## Licence and attribution

ieWorkspace is free software, released under the **GNU Affero General Public License v3.0** ([LICENSE](LICENSE)), the same licence as the projects it derives from.

It is derived from **[ElixirOffice](https://github.com/leag1234/elixiroffice)**, built on **[Euro-Office](https://github.com/Euro-Office)**, itself derived from **[ONLYOFFICE](https://www.onlyoffice.com/)** Docs by Ascensio System SIA. Their copyright notices, licence files, and attributions are preserved unchanged; see [NOTICE](NOTICE). Bundled fonts, dictionaries, thesauri, and icons (Microsoft Fluent UI System Icons, MIT) keep their own free licences: [branding/fonts/LICENSES.md](branding/fonts/LICENSES.md) and [NOTICE](NOTICE).

ieWorkspace is not affiliated with or endorsed by Microsoft, Ascensio System SIA, Euro-Office, or ElixirOffice. Microsoft, Word, Excel, and PowerPoint are trademarks of Microsoft Corporation.

## Contributing & Security

- **Contributing:** See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Bug reports & feedback:** Open an [issue](https://github.com/ieenterprises/ieWorkspace/issues).
- **Security vulnerabilities:** Do not open a public issue; see [SECURITY.md](SECURITY.md) and use [GitHub Private Vulnerability Reporting](https://github.com/ieenterprises/ieWorkspace/security/advisories/new).
