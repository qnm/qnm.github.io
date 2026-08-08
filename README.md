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
