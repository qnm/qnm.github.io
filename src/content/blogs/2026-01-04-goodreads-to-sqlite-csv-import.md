---
title: Getting fifteen years of reading out of Goodreads
subtitle: The API is gone, but the CSV export is still an escape hatch
date: '2026-01-04'
topic: feature
read: 4 min read
---

I've been on Goodreads since roughly 2010. That's fifteen years of ratings,
half-finished shelves, and a to-read list I will realistically never get to the
bottom of. It's also fifteen years of a fairly detailed record of what I was
thinking about at any given point, which is a more personal thing than "book
website account" makes it sound.

All of it lives on someone else's servers, in a product Amazon has been slowly
letting rust.

## The API is gone

[rixx's goodreads-to-sqlite][rixx] has been around since 2019 and it does
exactly what it says: pulls your shelves, books and reviews into a SQLite file
so you can point [Datasette] at it. It's part of Simon Willison's
[Dogsheep][dogsheep] family, which is the idea that you should be able to pull
your own data out of the services you use and query it locally.

The problem is it works over the Goodreads API, and Goodreads stopped issuing
API keys in late 2020 and has since turned the thing off entirely. So the tool
still installs fine, runs fine, and returns nothing. Which is a slightly
depressing way for a piece of software to die.

What Goodreads *does* still have is a CSV export, buried at
`/review/import` behind an "Export Library" button. So I [forked the
tool][fork] and taught it to read that instead.

    $ goodreads-to-sqlite import-csv goodreads.db goodreads_library_export.csv

The important design constraint was that `import-csv` had to produce the *same*
database structure as the API import did: books, authors, reviews, shelves, the
same foreign keys. Anyone with existing Datasette queries or a dashboard sitting
on top of the old schema shouldn't have to care where the rows came from.

## The CSV is quietly hostile

The export is fine, but it carries a lot of scar tissue from being designed for
Excel rather than for programs.

ISBNs come out looking like `="0143039431"`. That's a formula wrapper, there so
Excel doesn't helpfully reinterpret a 13-digit number as scientific notation and
destroy it. Correct, in its way. Still needs stripping.

Series information isn't a column. It's jammed into the title in parentheses, so
you get `The Fifth Season (The Broken Earth, #1)` and have to pull `series` and
`series_position` back out yourself. I split on the last `(`, look for a `#`,
and bail out if it isn't there, because plenty of legitimate titles have
brackets in them and I'd rather leave those alone than be clever.

`My Rating` uses `0` to mean "unrated", not "zero stars". Writing that straight
into an integer column would quietly tell you that you hated a few thousand
books you simply never rated.

Dates are `YYYY/MM/DD`, which `dateutil` handles, and empty strings, which it
does not.

None of this is hard. It's just the usual archaeology of getting data out of a
system that was never really expecting you to leave.

## What you lose

Being honest about the gaps matters more than the feature list:

- **Book descriptions and cover URLs** aren't in the export at all, so those
  columns come back null.
- **Shelf ordering** isn't exposed either, so the order of your to-read list is
  gone. Which, given the size of mine, may be a mercy.

The rest survives: titles, authors (including the additional-authors column,
which the API import handled inconsistently anyway), ISBNs, publishers,
publication years, page counts, your rating, your review text, date read, date
added, and every shelf including custom ones.

## Why bother

Goodreads has been in maintenance mode for years. Amazon bought it in 2013, the
API is gone, the app is much the same as it was a decade ago, and there's a
non-zero chance that at some point somebody at Amazon does the maths and decides
it isn't worth keeping around.

If that happens I'd like my fifteen years to be a file on my disk rather than a
support ticket.

That's really the whole argument for self-hosting your own data, and it doesn't
require you to run any servers or take a position on federation. It's much more
boring than that. Export what you can, while you can, into a format you can
still read in ten years. SQLite is a good bet for that: single file, no server,
[a documented format][sqlite-format], and one of the [recommended storage
formats][loc] of the US Library of Congress.

The nice side effect is that once it's local, it's queryable. "Which authors do
I keep coming back to", "what did I actually finish in 2018", "how has my
average rating drifted" are all one SQL statement away, and none of them are
questions Goodreads will ever build a screen for.

The [fork is here][fork] if it's useful to you. It's Apache 2.0, same as rixx's
original, and the CSV path is now the documented default with the API commands
left in place and marked deprecated, in the unlikely event Goodreads ever turns
them back on.

[rixx]: https://github.com/rixx/goodreads-to-sqlite
[fork]: https://github.com/qnm/goodreads-to-sqlite
[Datasette]: https://datasette.io/
[dogsheep]: https://simonwillison.net/2019/Oct/7/dogsheep/
[sqlite-format]: https://www.sqlite.org/fileformat.html
[loc]: https://www.sqlite.org/locrsf.html
