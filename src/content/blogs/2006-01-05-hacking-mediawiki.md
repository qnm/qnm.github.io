---
title: Hacking Mediawiki
date: '2006-01-05'
topic: archive
image: ../../images/tokyo.jpg
---

Mediawiki seems to be a great open-source project - it has a very large customer site ([Wikipedia](http://www.wikipedia.org)), full time development and maintainence staff, yet still I struggled to find doco to enable me to customise it to my needs. I even got the standard RTFM from the IRC channel - great way to attract new developers, guys! All I wanted to do was update a wiki page from inside the application... Contrast this to my experience customising Gallery2, which was a much bigger problem - synchronise changes to data across a group of servers - and I got loads of great help from the IRC channel. We ended up with a more pragmatic solution (running G2 on its own box), but it's good to know the support is there when you need it. Anyway, for anyone who wants to know how to programatically update or append to a wiki page, here's whatI came up with:

$myNewContent = "Brillant!";

$articleName = "User\_talk:" . $wgUser->getName(); // get the user talk page for the logged in user

$articleTitle = Title::newFromText($articleName); // create a wiki title name from the friendly name

$articleToUpdate = new Article ($articleTitle); // get an article instance

$currentContent = $articleToUpdate->getContentWithoutUsingSoManyDamnGlobals(); // i love comedy function names :-(

$newContent = $currentContent . "\\n" . $myNewContent; // create page content

$articleToUpdate->quickEdit( $newContent ); // update the article with the new content

Caveat Emptor - this doesn't take into account revisions, so you can't rollback a page after editing. I'm working on that though...
