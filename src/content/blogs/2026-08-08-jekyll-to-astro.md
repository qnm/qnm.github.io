---
title: From Jekyll to Astro (via Posterous, via Gatsby)
subtitle: A blog worth keeping is a blog worth migrating every few years
date: '2026-08-08'
topic: feature
read: 5 min read
---

This blog has now had four homes. It started on **Posterous** around 2005 as a
linklog, back when the Delicious-era pattern was "here's a URL and a sentence
about it". Posterous shut down in 2013, so the content moved to **Jekyll**,
then to **Gatsby** in 2019, and this week it's landed on **Astro**.

Every one of those migrations was triggered by the same thing: the previous
stack quietly rotting while I wasn't looking. This time the nudge was GitHub
reporting *120 vulnerabilities* on the default branch.

## The Gatsby dep-tree situation

The site itself was fine. A pile of static HTML served by GitHub Pages, no
server, no user input, no runtime dependency risk at all. But the *build* tree
was Gatsby 2 from 2019, which by 2026 was dragging in dozens of packages with
published CVEs: `sharp`, `node-forge`, `trim`, `glob-parent`, `nth-check`, and
a few hundred more transitively.

None of it was reachable by a visitor. All of it fired every time CI ran
`npm install`. And Dependabot, to its credit, would not shut up.

The tempting fix is `npm audit fix --force`, but Gatsby 2 has no compatible
upgrade path, so you end up with a broken build and the same CVEs. The real
fix was ripping the build system out entirely.

## Why Astro

I looked at Hugo, Eleventy, Next static export, and Astro. Astro won on four
things.

Content collections with a Zod schema for frontmatter is the feature I didn't
know I wanted. Every post has to satisfy the schema at build time, so a typo in
a date or a missing title fails the build instead of silently shipping a broken
page. Zero JavaScript goes to the browser by default, and the site is now less
than half the size of the Gatsby version of the same content. Islands are there
if I ever want interactivity, without paying for a framework I don't use. And
the dep tree is small and modern enough that `npm audit` comes back clean.

The whole migration took an afternoon, most of it spent on content rather than
code.

## The archive was the interesting part

I had 704 old posts sitting in `src/content/blogs/`, in three flavours: Jekyll
`.markdown` files from 2011 to 2012 with fairly reasonable frontmatter,
Posterous exports as `.html` with inconsistent frontmatter and raw HTML bodies
(many pointing at dead `posterous.com/getfile/…` images, since Posterous went
dark in 2013), and a handful of "real" `.md` posts from the Gatsby era.

So, a three-script pipeline, all kept in `scripts/`:

- **`normalise-archive.mjs`** pulls dates out of filenames when the frontmatter
  is missing them, coerces everything to `.md`, and drops the
  WordPress/Posterous-era junk fields.
- **`detect-linkposts.mjs`** does strict detection of the Posterous linklog
  bookmarklet shape (a leading anchor where the display text is the URL
  itself), and promotes the target URL to a `link:` frontmatter field. 475
  posts matched.
- **`htmlify-to-markdown.mjs`** runs [turndown] over the HTML bodies to get
  CommonMark out, strips the dead posterous.com images, unwraps the
  Posterous-specific div wrappers, and swaps those echoed leading anchors for
  markdown equivalents.

After the pipeline: 703 files are pure markdown, and one is a nested HTML table
I chose not to fight with. It's a Sean Connery personality quiz, because of
course it is.

## Linkblogs deserve a convention

The bit I actually like about this setup is the linkblog affordance. Any post
with a `link:` field gets its title rendered as an outbound link on both the
list and the post page, a small `∞` internal permalink so you can still link
*at* my post rather than only at the destination, a visible `(host)` chip on
the archive listing, and a `→` glyph so the eye can pick out a link post at a
glance.

Daring Fireball has been doing this since forever. The pattern is well
established and yet almost nothing supports it natively, which is a shame,
because it's a couple of lines of schema and a bit of template logic.

## Design

The visual design is [Catppuccin Mocha][catppuccin], a warm dark palette I've
enjoyed elsewhere, plus JetBrains Mono throughout and a prompt-style header
(`qnm:~/path $ ▍`) with a blinking block cursor. There's a Latte toggle for
when the sun's out.

Nothing here is trying to look like a magazine. It's meant to look like a
terminal, because that's where I spend most of my day.

## Numbers

- **704 posts** built, going back to 2005
- **0** `npm audit` vulnerabilities
- **6.1 MB** `dist/`, down from 13 MB on Gatsby
- **~1 second** clean build
- **120 → 0** vulnerabilities reported by Dependabot

## Deploying

The CI pipeline is embarrassingly simple:

```yaml
- uses: actions/checkout@v7
- uses: withastro/action@v6
- uses: actions/deploy-pages@v5
```

That's the entire deploy. GitHub Pages picks up the artifact and serves it. No
branch to push, no third-party actions, no personal access tokens.

## Should you migrate?

Probably, yeah. If your blog runs on anything that had its peak in the Gatsby
era, the dep tree is bad news by now, and moving is cheaper than you think.
Astro's markdown pipeline is close enough to Jekyll's that the port is mostly
mechanical, a couple of hours if your archive is less chaotic than mine.

The pipeline scripts are pretty portable. If you've got a Posterous or Jekyll
archive gathering dust somewhere, feel free to [steal them][repo].

[turndown]: https://github.com/mixmark-io/turndown
[catppuccin]: https://catppuccin.com/
[repo]: https://github.com/qnm/qnm.github.io/tree/main/scripts
