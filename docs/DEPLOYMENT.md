# Run and host Signal Atlas

The application needs no API keys, backend, database, or runtime dependencies. Vercel and Supabase are not used. Version 0.4.0 is a reviewable release candidate; these are hosting instructions, not a claim of deployment.

## Local use

Install Node.js 22 or later. Clone or download the release branch, then:

```sh
npm start
# Open http://localhost:3000
```

Do not open index.html directly through file://; browser ES modules need HTTP(S). The server's port can be set with PORT. It exposes only the application files, not project metadata or model data. Model storage stays in the visiting browser.

## Portable static build

```sh
npm run check
npm test
npm run build
```

`dist/` contains index.html, the six browser modules, CSS, and release.json. No installation step is needed. Deploy the contents of dist/ to any static HTTP(S) host. Relative asset paths support both `/` and a subdirectory such as `/Codex-Project/`. No routing rewrites are required: this is a single page with fragment navigation.

The GitHub verification workflow builds a downloadable `signal-atlas-static-v0.4` artifact on pushes and pull requests. That workflow verifies and packages the site; it does not publish it. Download the artifact after a successful workflow run or create dist/ locally.

## Hosting options

- **GitHub Pages:** after reviewing/merging the release candidate, build dist/ and publish its contents on a dedicated Pages source branch, then configure that branch in repository Settings → Pages. The `/Codex-Project/` path works without source edits. Review repository visibility and Pages audience before enabling it.
- **Cloudflare Pages:** upload dist/ through a direct-upload Pages project, or connect the repository with build command `npm run build` and output directory `dist`. No bindings, secrets, or database integrations are needed.
- **Existing static host:** serve dist/ through nginx, Apache, an object-store website behind HTTPS, or a local static HTTP server. Use appropriate MIME types for `.js` and `.css`.

Nothing in this release invokes or configures these hosting accounts. There is no deployment URL yet.

## Local data and exports

Storage is scoped to browser origin. Localhost, a preview, and a hosted domain have separate model libraries. Export model JSON before moving between them. The app reports blocked/full storage and can continue in a session; downloads provide a portable copy. Clearing browser site data deletes local libraries. Evidence and confidence are user-entered and unverified.

## Verification

Standard checks are `npm run check`, `npm test`, and `npm run build`. Optional real-browser QA requires Python Playwright and an installed Chromium browser:

```sh
python scripts/browser-check.py --url http://localhost:3000 \
  --browser-path /path/to/chromium --output /tmp/signal-atlas-qa
```

Pass `--axe-path /path/to/axe.min.js` for the optional axe-core WCAG A/AA scan. These are development tools, not application dependencies. The browser script uses a fresh context, downloads models/briefs to its output directory, checks error states and layouts, and writes screenshots and report.json. Use a trusted Chromium installation for the local `--no-sandbox` test harness; this flag is not part of application hosting.
