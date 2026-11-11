# Weather Client website

A static landing page for Weather Client and its launcher. Plain HTML, CSS and JavaScript: there's
no build step and nothing to install, so any static host can serve this folder as it is.

| File | What it is |
| --- | --- |
| `index.html` | The page |
| `styles.css` | All styles (the launcher's colours, glass and type) |
| `main.js` | Download settings, the live aurora behind the hero (WebGL, the launcher's shader), the screenshot viewer |
| `config.js` | **Download link**, versions, installer size and SHA-256 |
| `news.json` | Posts for the launcher's home page |
| `updates/latest.json` | The mod update manifest the launcher checks |
| `site.webmanifest` | Name, colours and icons for browsers |
| `assets/` | Screenshots, icons, the social preview image (`og.jpg`) and the fonts |

## Preview it

```bash
cd launcher
npm run site
```

Then open http://localhost:4321. (`node scripts/serve-website.mjs 8080` picks another port.)

## Publish a release

1. **Build the installer.** In `launcher/`, run `npm run dist`. It builds
   `release/Weather-Client-Setup-<version>.exe` and `release/Weather Client.exe` (the one-file
   launcher: no install, it unpacks itself on first start). Then it writes the installer's size
   and SHA-256, the launcher and mod versions, and the bundled mod jar's SHA-256 into `config.js`,
   `updates/latest.json` and `index.html`. (`npm run stamp-site` does just that last step again.)

2. **Upload the installer and the mod jar to GitHub Releases.** The installer is about 118 MB.
   That's too big to keep in the site itself: GitHub rejects repository files over 100 MB, and
   Cloudflare Pages caps files at 25 MiB. A release asset can be up to 2 GiB. Create a release
   (for example tag `v1.0.0`) and attach:
   - `launcher/release/Weather-Client-Setup-1.0.0.exe`
   - `launcher/resources/mod/weather-client-1.2.0.jar` (for in-launcher mod updates)
   - optionally `launcher/release/Weather Client.exe`, for people who'd rather not install
     (GitHub turns the space in its name into a dot)

3. **Point the site at it.** In `config.js`, set `downloadUrl` to the installer's release URL, for
   example `https://github.com/OWNER/REPO/releases/download/v1.0.0/Weather-Client-Setup-1.0.0.exe`.
   While `downloadUrl` is empty, the Download buttons scroll to the download section, which says
   the link isn't set yet.

4. **Point the update manifest at the jar.** In `updates/latest.json`, set `url` to the jar's
   release URL and write the `notes` for this version. The launcher only offers an update when
   `version` is newer than the installed jar, and it checks the download against `sha256` before
   installing it.

5. **Make the social preview absolute.** Link previews (Discord, X, iMessage) need a full URL. In
   `index.html`, change `<meta property="og:image" content="assets/og.jpg">` to
   `https://YOUR-DOMAIN/assets/og.jpg`, and add `<meta property="og:url" content="https://YOUR-DOMAIN/">`.

`npm run dist` keeps what you typed in `downloadUrl`, `url` and `notes`. When the version changes,
it prints a note if those still point at the previous files.

## Host the site

Any of these serve the folder for free, over HTTPS:

- **GitHub Pages:** put this folder in a repository (as the root or `/docs`), then Settings →
  Pages → Deploy from a branch.
- **Cloudflare Pages:** Workers & Pages → Create → Pages → Upload assets, and drop this folder.
- **Netlify:** drag this folder onto https://app.netlify.com/drop.

Keep the installer on GitHub Releases in every case; only the site goes on the host.

## Connect the launcher

Both settings take effect straight away and accept only `https://` addresses.

- **News:** Settings → Advanced → News feed: `https://YOUR-DOMAIN/news.json`
- **Mod updates:** Weather Client page → Update URL: `https://YOUR-DOMAIN/updates/latest.json`

The launcher reads these from its own process, so the host doesn't need CORS headers.

### news.json

```json
{
  "items": [
    {
      "id": "unique-id",
      "title": "Shown in bold",
      "date": "2026-11-08",
      "tag": "Release",
      "icon": "aurora",
      "body": "One or two sentences.",
      "url": "https://optional-link-for-the-post"
    }
  ]
}
```

`id`, `title` and `body` are required. `icon` is one of `aurora`, `rain`, `storm`, `snow`, `sun`,
`wind`, `fog`, `bolt`. Newest first; the launcher shows up to 30 posts, keeps the last good copy
for offline starts, and falls back to its built-in posts if the feed can't be read.

### updates/latest.json

```json
{
  "version": "1.2.0",
  "url": "https://github.com/OWNER/REPO/releases/download/v1.2.0/weather-client-1.2.0.jar",
  "sha256": "64 hex characters",
  "size": 1517172,
  "notes": "What changed."
}
```

`version`, `url` and `sha256` are required. When updating, the launcher moves the old jar to
`mods-backup`, so only one Weather Client jar is ever loaded.

## Notes

- The aurora behind the hero runs at most 30 frames a second below full resolution, stops when
  it's scrolled out of view or the tab is hidden, and draws a single still frame for visitors who
  ask for reduced motion. Without WebGL the page keeps its CSS gradient sky.
- The installer isn't code-signed, so Windows SmartScreen warns on first run. The FAQ and the
  message after clicking Download explain "More info → Run anyway", and the SHA-256 is on the page
  for checking the download. Signing the installer removes the warning over time.
- `Weather Client.exe`, the one-file launcher, isn't signed either. Its first start unpacks the
  launcher into `%LOCALAPPDATA%\Weather Client\portable` (about 360 MB, a few seconds behind a
  splash). Later starts run it from there with no wait, and a newer exe replaces the old copy.
- Keep the footer line "Not an official Minecraft product. Not approved by or associated with
  Mojang or Microsoft." Minecraft's usage guidelines ask for it.
- Fonts: Inter, Sora and JetBrains Mono, under the SIL Open Font License (licences in
  `assets/fonts/`). Icons: Lucide, ISC licence.
