#!/usr/bin/env node
// Mirror remote Medium CDN images referenced from src/content/blogs/*.md
// into public/images/medium/ and rewrite the markdown to point at the
// local copies. Idempotent: safe to re-run.
//
// Usage:
//   node scripts/mirror-medium-images.mjs           # download + rewrite
//   node scripts/mirror-medium-images.mjs --dry     # report only
//
// Scope:
//   - Only rewrites cdn-images-1.medium.com / miro.medium.com URLs.
//   - Handles both markdown `![alt](url)` and raw `<img src="url">`.
//   - Preserves the Medium image id (e.g. `1*abcDEF.jpeg`) as the
//     on-disk filename so repeated URLs de-dupe.

import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs"
import { join, extname } from "node:path"

const BLOG_DIR = "src/content/blogs"
const OUT_DIR = "public/images/medium"
const PUBLIC_PREFIX = "/images/medium"

const DRY = process.argv.includes("--dry")

const MEDIUM_HOST = /^https?:\/\/(cdn-images-\d+\.medium\.com|miro\.medium\.com)\//i

if (!DRY) mkdirSync(OUT_DIR, { recursive: true })

/** Pull all likely image URLs out of a markdown body. */
function findUrls(text) {
  const urls = new Set()
  // Markdown: ![alt](url "title")
  const mdRe = /!\[[^\]]*\]\((\S+?)(?:\s+"[^"]*")?\)/g
  // HTML: <img ... src="url">
  const imgRe = /<img[^>]+src="([^"]+)"/gi
  for (const re of [mdRe, imgRe]) {
    let m
    while ((m = re.exec(text)) !== null) {
      if (MEDIUM_HOST.test(m[1])) urls.add(m[1])
    }
  }
  return [...urls]
}

/** Derive a filesystem-safe filename from a Medium image URL. */
function filenameFor(url) {
  // Medium URLs look like:
  //   https://cdn-images-1.medium.com/max/800/1*abcDEF.jpeg
  //   https://miro.medium.com/v2/resize:fit:640/format:webp/1*abcDEF.jpeg
  const u = new URL(url)
  const last = u.pathname.split("/").filter(Boolean).pop() || "image"
  // Some URLs put format hints in the last segment (`format:webp`).
  // In that case, fall back to the previous segment.
  const clean = /^\d[\w.*-]+\.\w+$/.test(last)
    ? last
    : u.pathname
        .split("/")
        .filter(Boolean)
        .reverse()
        .find((p) => /^\d[\w.*-]+\.\w+$/.test(p)) || last
  // `*` is legal on macOS/Linux but awkward — swap for `_`.
  return clean.replace(/\*/g, "_")
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // If the server returned a different content-type, respect its extension.
  const ct = res.headers.get("content-type") || ""
  const extFromCT = ct.includes("jpeg")
    ? ".jpg"
    : ct.includes("png")
      ? ".png"
      : ct.includes("gif")
        ? ".gif"
        : ct.includes("webp")
          ? ".webp"
          : ct.includes("svg")
            ? ".svg"
            : null
  let finalDest = dest
  if (extFromCT && extname(dest).toLowerCase() !== extFromCT) {
    finalDest = dest.replace(/\.[^.]+$/, "") + extFromCT
  }
  writeFileSync(finalDest, buf)
  return finalDest
}

const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith(".md"))

const urlToLocal = new Map() // remote URL → /images/medium/foo.jpg
let discovered = 0
let downloaded = 0
let cached = 0
let failed = 0
let filesTouched = 0

for (const file of files) {
  const abs = join(BLOG_DIR, file)
  const raw = readFileSync(abs, "utf8")
  const urls = findUrls(raw)
  if (urls.length === 0) continue

  for (const url of urls) {
    discovered++
    if (urlToLocal.has(url)) continue
    const name = filenameFor(url)
    const destAbs = join(OUT_DIR, name)
    if (existsSync(destAbs) && statSync(destAbs).size > 0) {
      urlToLocal.set(url, `${PUBLIC_PREFIX}/${name}`)
      cached++
      continue
    }
    if (DRY) {
      console.log(`would fetch ${url} → ${destAbs}`)
      urlToLocal.set(url, `${PUBLIC_PREFIX}/${name}`)
      continue
    }
    try {
      const finalPath = await download(url, destAbs)
      const finalName = finalPath.split("/").pop()
      urlToLocal.set(url, `${PUBLIC_PREFIX}/${finalName}`)
      console.log(`✓ ${url} → ${finalName}`)
      downloaded++
    } catch (err) {
      console.warn(`! ${url}: ${err.message}`)
      failed++
    }
  }

  // Rewrite this file if any of its URLs are now mirrored.
  let next = raw
  for (const url of urls) {
    const local = urlToLocal.get(url)
    if (!local) continue
    // Escape for regex.
    const esc = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    next = next.replace(new RegExp(esc, "g"), local)
  }
  if (next !== raw) {
    if (!DRY) writeFileSync(abs, next, "utf8")
    filesTouched++
    console.log(`  rewrote ${file}`)
  }
}

console.log(
  `\nDiscovered ${discovered} refs, downloaded ${downloaded}, cached ${cached}, failed ${failed}, rewrote ${filesTouched} files${
    DRY ? " (dry run)" : ""
  }.`
)
