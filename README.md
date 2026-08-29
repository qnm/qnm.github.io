# qnm.github.io

Personal blog, built with [Astro](https://astro.build/) and deployed to
GitHub Pages.

## Requirements

- Node.js **>= 22.12** (see `.nvmrc`)

## Local development

```sh
nvm use            # or `fnm use`
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to ./dist
npm run preview    # serve the built site locally
```

## Deployment

On push to `main` or `dev`, `.github/workflows/deploy.yml` builds the site
with `withastro/action@v3` and deploys via `actions/deploy-pages@v4`.

The first time this runs, enable it in the repo's **Settings → Pages** with
"Build and deployment" set to **GitHub Actions**.

## Content

Blog posts live in `src/content/blogs/`. The build only picks up `*.md`
files (see `src/content.config.ts`). Frontmatter:

```yaml
---
title: "Post title"
subtitle: "Optional teaser"
date: 2019-05-01
read: "1 min read"
topic: "feature"      # optional; "feature" pins to the hero slot
image: ../../images/tokyo.jpg
---
```

### Importing Nostr highlights

`scripts/import-nostr-highlights.ts` pulls your [Nostr](https://nostr.com)
content off the relays and writes each item as a post:

- **Highlights** (NIP-84, kind `9802`) → `topic: highlight` posts that
  quote the highlighted text.
- **Web bookmarks** (NIP-B0, kind `39701`) → `topic: link` posts (the
  same shape as the legacy linkblog) with a title derived from the
  page's `title` tag or its URL.

Each links back to the original source and, via `njump.me`, to the Nostr
event (any post carrying a `nostrId`/`nostr` pointer renders a “shared/
highlighted on nostr” link).

```sh
# npub or hex pubkey; --dry-run prints without writing
npm run import:nostr -- npub1… --dry-run
npm run import:nostr -- npub1… --since 2024-01-01
NOSTR_PUBKEY=npub1… npm run import:nostr
```

Flags: `--relay <wss://…>` (repeatable), `--since <YYYY-MM-DD>`,
`--timeout <sec>` (default 15), `--dry-run`. Runs directly on Node ≥ 22
via built-in TypeScript type stripping — no build step. Uses
[nostr-tools](https://github.com/nbd-wtf/nostr-tools) (fiatjaf's reference
toolkit) for relay I/O and NIP-19 encoding. Re-running is safe: already
imported events (tracked by `nostrId` in frontmatter) are skipped.

### Legacy archive

Several hundred imported Jekyll (`.markdown`) and Posterous (`.html`) posts
live alongside in `src/content/blogs/`. They are ignored by the current
content-collection glob because their frontmatter is inconsistent (many
have no `date` field, image references, or valid HTML bodies). They are
kept on disk so a future migration can normalise and republish them.

## History

The site was previously built with Gatsby 2 (2019). It was migrated to
Astro to eliminate a very large tree of build-time supply-chain
vulnerabilities and shrink the deploy footprint.
