---
title: Screen Scraping for Fun and For Profit
date: '2007-09-25'
topic: archive
image: ../../images/tokyo.jpg
---

I love coding in Ruby. It's a nice language to work in, but more often than not there's a gem or plugin that implements common problems. If I had tackled my [131500](http://www.131500.info)\-bot in my native tongue of PHP, it would no doubt have taken a lot longer than the 50-or-so lines of code this baby has. The ease of feedbot creation was facilitated by the excellent [Scrubyt](http://scrubyt.org/) gem, which makes scraping so damn easy!

Scrubyt gives you an xpath-like access to the DOM, meaning data retreval is much simpler than with regex methods.  You can even use the learning mode to work out the paths for you. In the middle, we have ActiveRecord which allows super-simple database connectivity.

Finally, we have the Ruby [Twitter gem](http://twitter.rubyforge.org/), which ties it all together nicely. I estimate that coding something similar in PHP would have taken at least twice as long, as there really is no equivalent of scrubyt in PHP, much less in any other language I've seen. The next step for the bot is to allow people to ask it for the next train to trancentral, which won't be too far off!

You can check out my [bots feed](http://twitter.com/131500), or there's a really nice tutorial with a practical example called [Dogs of the FTSE](http://www.straw-dogs.co.uk/09/05/scrubyt-tutorial-dogs-of-the-ftse/) that you should check out.
