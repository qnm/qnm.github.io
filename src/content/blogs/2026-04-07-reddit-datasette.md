---
title: Reddit, on my own disk
subtitle: A public archive, a selective torrent, and Datasette doing all the hard bits
date: '2026-04-07'
topic: feature
read: 5 min read
---

I wrote a while back about [getting fifteen years of reading out of
Goodreads][goodreads], and the itch behind that one hasn't gone away. Data I
rely on lives on someone else's servers, under someone else's business model,
and the sensible move is to get a copy locally while getting a copy is still
possible.

Reddit is the obvious next target, and it's a much bigger problem than a CSV
export.

## Where the data comes from

For years the answer to "how do I query Reddit in bulk" was
[Pushshift][pushshift], which ingested basically everything and made it
searchable. Reddit's 2023 API changes ended public access to it, along with most
of the third-party app ecosystem, and Pushshift became a moderator-only tool.

[Arctic Shift][arctic] picked up the thread. It's an ongoing archive of Reddit
submissions and comments with a public search API, plus periodic bulk dumps
published to [Academic Torrents][at]. The dump I care about covers the top 40,000
subreddits from mid-2005 to the end of 2025, one zstandard-compressed NDJSON
file per subreddit per type, so `solarpunk_submissions.zst` and
`solarpunk_comments.zst`.

That naming turns out to matter a lot.

## Downloading 0.001% of a torrent

The full dump is terabytes. I want seventeen subreddits.

The neat bit is that BitTorrent has always supported per-file priorities, and
`libtorrent` exposes them from Python, so you don't have to choose between "all
of it" and "none of it". `download_torrent.py` adds the magnet link, waits for
just the metadata, walks the file list matching basenames against
`config.json`, then does this:

    handle.prioritize_files([0] * files.num_files())
    for i in wanted:
        handle.file_priority(i, 4)

Everything off, then the handful I asked for back on. That's the whole trick.
The rest of the script is a progress bar, which is the usual ratio for this kind
of thing.

Because it's a torrent, it's also resumable for free. Ctrl-C, come back
tomorrow, it picks up where it left off. And subreddits too small or too new to
be in the top 40k fall back to `download.py`, which pages through the Arctic
Shift API in timestamp order and appends to a JSONL file, resuming from the last
`created_utc` it sees. Slower, but it fills the gaps.

## Getting it into SQLite

`to_sqlite.py` doesn't care which path the data came from. It globs for `.zst`
and `.jsonl`, streams either one a line at a time (the compressed files are far
too big to hold in memory), flattens the fields I actually want, and pushes
batches of a thousand rows through `sqlite-utils`:

    db[table_name].upsert_all(batch, pk="id", alter=True, foreign_keys=fk)

`upsert_all` with a primary key means the whole import is idempotent, so a
re-run after a fresh download tops up rather than duplicating. `alter=True`
means new columns get added if Reddit's shape shifts under me, which it does.

Then indexes on the columns you'd actually sort by, and full-text search with
porter stemming over post titles, post bodies and comment bodies. Which,
incidentally, is already a better search experience than Reddit's own. Not a
high bar, but still.

## Datasette does the front end

This is where I stop writing code, mostly.

[Datasette][datasette] is [Simon Willison's][simon] open source tool for
exploring and publishing data, first released back in 2017. You point it at a
SQLite file and you get a browsable web UI: every table, faceted filtering,
full-text search if you've enabled it, sortable columns, and a JSON API for
every single view. For free. No app, no schema definitions, no routes.

It's one half of a pair. `sqlite-utils` gets messy data *in*, Datasette makes it
useful once it's there, and [Dogsheep][dogsheep] is Simon's name for the broader
idea of pulling your own data out of the services you use and querying it on
your own machine. There's a whole family of little importers under that banner
(Twitter, HealthKit, Swarm, GitHub) and my Goodreads fork was the same shape.
This is that pattern again, just pointed at a public archive instead of a
personal export.

A `metadata.json` handles most of the presentation: facet posts and comments by
subreddit, render `created_utc` as a readable date, render `selftext` and
comment bodies as markdown, sort subreddits by post count.

Then the [`datasette-template-sql`][tsql] plugin adds a `sql()` function to the
template context, which is the part that made a Reddit-ish UI a weekend job
rather than a project. Three Jinja templates, SQL inline:

    {% set post = sql("select * from posts where id = ?", [post_id])[0] %}

An index page that lists subreddits with counts, an `/r/{subreddit}` feed, and a
`/post/{post_id}` page with comments underneath. Roughly the right shape, arrows
and karma numbers and all, in about 200 lines of HTML and CSS.

One wrinkle worth mentioning: comments don't store a post id, they store their
parent's *fullname*, Reddit's internal `type_id` format. So pulling a post's
comments means concatenating a prefix onto the id you already have:

    sql("select * from comments where link_id = ? order by score desc limit 200",
        ["t3_" + post_id])

`t3_` is the type prefix for a submission. Slightly ugly, entirely fine.

## What you lose

Same as with Goodreads, the gaps are more interesting than the feature list:

- **Threading.** Comments carry a `parent_id`, so the tree is technically in
  there, but I render a flat list sorted by score and capped at 200. Proper
  nesting is a recursive CTE I haven't written yet.
- **Live scores.** Every number is frozen at whenever the archive snapshot was
  taken. Fine for old threads, wrong for recent ones.
- **Deleted content.** Whether you get the text, `[deleted]`, or nothing at all
  depends on how quickly the archiver got there.
- **Media.** Images and videos are just URLs pointing at Reddit's CDN, so
  picture-heavy subs degrade into a list of blue links.

## Why bother

Reddit is, slightly annoyingly, where a lot of the genuinely useful stuff lives.
Not the front page. The specific stuff: someone who has taken apart the same
espresso machine as me, someone who has ridden the same bike up the same kind of
hill, the thread from eight months ago that explains why a local model config
that everyone recommends is actually a bad idea now.

It's also getting harder to reach. The API changes took out the third-party
apps, the archive is a moving target, users nuke their own comment histories,
subreddits go private or get deleted, and the content is increasingly a
licensable asset rather than a public conversation.

So: export what you can, while you can, into something you'll still be able to
read in ten years. A single SQLite file on a disk I own beats a search box I
don't control, and once it's local it's queryable in ways nobody is ever going to
build a screen for.

The [repo is here][repo]. It's rough, it assumes you're comfortable with a
terminal, and there's a `run.sh` that does the whole pipeline if you'd rather not
think about any of the above.

[goodreads]: /blogs/2026-01-04-goodreads-to-sqlite-csv-import
[repo]: https://github.com/qnm/reddit-datasette
[arctic]: https://arctic-shift.photon-reddit.com/
[at]: https://academictorrents.com/details/3e3f64dee22dc304cdd2546254ca1f8e8ae542b4
[pushshift]: https://pushshift.io/
[datasette]: https://datasette.io/
[simon]: https://simonwillison.net/
[dogsheep]: https://simonwillison.net/2019/Oct/7/dogsheep/
[tsql]: https://datasette.io/plugins/datasette-template-sql
