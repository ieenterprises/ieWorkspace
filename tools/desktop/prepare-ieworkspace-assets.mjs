// SPDX-License-Identifier: AGPL-3.0-only
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(process.cwd());
const desktopDir = path.join(root, 'desktop');
const assetsDir = path.join(desktopDir, 'assets');
const themeImgDir = path.join(root, 'branding', 'web-apps', 'theme', 'elixiroffice', 'assets', 'img');

// 0. Ensure update-production-trust.cjs has LF line endings (Windows git checkout converts to CRLF)
const trustPath = path.join(desktopDir, 'update-production-trust.cjs');
if (fs.existsSync(trustPath)) {
  const trustLf = fs.readFileSync(trustPath, 'utf8').replace(/\r\n/g, '\n');
  fs.writeFileSync(trustPath, trustLf, 'utf8');
}

// 1. Create build-info.json and stamp desktop/package.json so build-identity-before-pack.cjs passes
const pkgPath = path.join(desktopDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const baseVersion = pkg.version.split('-')[0];
const buildNumber = Number(process.env.BUILD_NUMBER || 1);
let productRev = '0'.repeat(40);
try {
  productRev = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
} catch {}
const dsRev = 'ec0c0cfb56ab9c4eea1c050ab845d118b31881e5';

const buildIdentity = require(path.join(desktopDir, 'build-identity.cjs'));
const identity = buildIdentity.create(baseVersion, 'final', buildNumber, productRev, dsRev);
fs.writeFileSync(path.join(desktopDir, 'build-info.json'), JSON.stringify(identity, null, 2) + '\n');

pkg.version = identity.version;
pkg.build.buildNumber = String(identity.build_number);
pkg.build.buildVersion = identity.windows_version;
pkg.build.mac.bundleShortVersion = identity.mac_short_version;
pkg.build.mac.bundleVersion = identity.mac_bundle_version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// 2. Ensure mac-licenses files exist for macOS extraResources
const macLicensesDir = path.join(desktopDir, 'mac-licenses');
fs.mkdirSync(macLicensesDir, { recursive: true });
if (!fs.existsSync(path.join(macLicensesDir, 'LICENSE'))) {
  fs.copyFileSync(path.join(root, 'LICENSE'), path.join(macLicensesDir, 'LICENSE'));
}
if (!fs.existsSync(path.join(macLicensesDir, 'LICENSES.chromium.html'))) {
  fs.writeFileSync(
    path.join(macLicensesDir, 'LICENSES.chromium.html'),
    '<!doctype html><meta charset="utf-8"><title>Third-Party Licenses</title><pre>See NOTICE and LICENSE in ieWorkspace.</pre>\n'
  );
}

// 3. Overlay ieWorkspace round SVG logos onto extracted desktop/assets/
function copyIfDir(src, dest) {
  if (fs.existsSync(src) && fs.existsSync(path.dirname(dest))) {
    fs.copyFileSync(src, dest);
  }
}

const commonRoots = [
  path.join(assetsDir, 'web-apps', 'apps', 'common', 'main', 'resources', 'img'),
  path.join(assetsDir, 'web-apps', 'apps', 'common', 'mobile', 'resources', 'img')
];

for (const imgRoot of commonRoots) {
  copyIfDir(path.join(themeImgDir, 'header', 'logo_light.svg'), path.join(imgRoot, 'header', 'logo_light.svg'));
  copyIfDir(path.join(themeImgDir, 'header', 'logo_dark.svg'), path.join(imgRoot, 'header', 'logo_dark.svg'));
  copyIfDir(path.join(themeImgDir, 'header', 'header-logo_s.svg'), path.join(imgRoot, 'header', 'header-logo_s.svg'));
  copyIfDir(path.join(themeImgDir, 'header', 'dark-logo_s.svg'), path.join(imgRoot, 'header', 'dark-logo_s.svg'));
  copyIfDir(path.join(themeImgDir, 'about', 'logo.svg'), path.join(imgRoot, 'about', 'logo.svg'));
  copyIfDir(path.join(themeImgDir, 'about', 'logo.svg'), path.join(imgRoot, 'about', 'logo_s.svg'));
  copyIfDir(path.join(themeImgDir, 'header', 'logo_dark.svg'), path.join(imgRoot, 'about', 'logo-white_s.svg'));
  copyIfDir(path.join(themeImgDir, 'embed', 'logo.svg'), path.join(imgRoot, 'embed', 'logo.svg'));
}

const brandLogo = path.join(root, 'branding', 'example', 'nodejs', 'public', 'elixir', 'brand', 'logo.svg');
const brandFav = path.join(root, 'branding', 'example', 'nodejs', 'public', 'elixir', 'brand', 'favicon.svg');
const desktopBrandDir = path.join(assetsDir, 'example', 'local-assets', 'desktop-home', 'brand');
copyIfDir(brandLogo, path.join(desktopBrandDir, 'logo.svg'));
copyIfDir(brandFav, path.join(desktopBrandDir, 'favicon.svg'));
copyIfDir(brandLogo, path.join(assetsDir, 'desktop-home', 'brand', 'logo.svg'));
copyIfDir(brandFav, path.join(assetsDir, 'desktop-home', 'brand', 'favicon.svg'));

// 4. Sync desktop-manifest.json byte sizes after overlaying brand assets so eoapp:// never mismatches Content-Length
const manifestPath = path.join(assetsDir, 'desktop-manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest && manifest.files && typeof manifest.files === 'object') {
    let updated = 0;
    for (const [rel, rec] of Object.entries(manifest.files)) {
      const full = path.join(assetsDir, rel);
      if (fs.existsSync(full)) {
        const sz = fs.statSync(full).size;
        if (rec && rec.bytes !== sz) {
          rec.bytes = sz;
          updated++;
        }
      }
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log('Updated desktop-manifest.json sizes for', updated, 'rebranded asset(s).');
  }
}

console.log('Prepared ieWorkspace desktop assets and build-info.json:', identity.version, 'build', identity.build_number);
