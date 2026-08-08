---
title: Scaling new heights
date: '2008-06-25'
topic: archive
image: ../../images/tokyo.jpg
---

No doubt due to the [recent departure of Twitter engo Blaine Cook](http://www.alleyinsider.com/2008/4/lead_architect_blaine_cook_out_at_twitter) theres been a glut of posts about scaling web apps.

I like [I’m Going To Scale My Foot Up Your Ass](http://teddziuba.com/2008/04/im-going-to-scale-my-foot-up-y.html) from [Ted Dziuba](http://teddziuba.com/):

> every chest-thumping blog post I have seen written about scalability is either about architecture, Memcached, or both. Some asshole who writes shitty code starts pontificating about “scalable architecture” with data storage, web frontends, whatever-the-fuck. Dude, your app isn’t having scalability problems because of the architecture. It’s having scalability problems because you coded a ton of N^2 loops into it and you’re too self-important to get peer reviews on your commits.

I’ve been guilty of relying too heavily on memcaching in the past, and a recent conversion of an old 4NF attributes system to mine to a star schema reinforced the point – get the DB right! Admittedly, when that old schema was written no-one had a practical use for tagging (bar tag clouds). I was experimenting with tag schemas, but due to my SE background had discounted it as the wrong way to attack the problem. It benched pretty well though. Numbers don’t lie.

Another post [Internet Asshattery, Armchair Scaling Experts Edition](http://randomfoo.net/blog/id/4171), comments on the reaction of the armchair engineers to the problems Twitter faced, and to some extent, solved. Everyone blames the architecture. “Rails doesn’t scale”. Repeat ad infinitum. But there’s more too it than that. _Lots more._

> 600 QPS on 8 machines is pretty decent – but this raises the question of utilization and capacity planning. You can see from the 1×1 MySQL structure and the note on DRb that there were many single points of failure – again, this raises questions of BCP and redundancy. With the constant bumping of limits, you could guess that they were running really hot (and from a single data center, even after the move (probably w/o backup routers, etc.))—all these issues are as much (if not moreso, since these are technical no-brainers) business/financial decisions than architectural/technological ones.

Depressingly, until you’ve suffered a meltdown at the hands of insufficient capacity or (lack-of) BCP, it’s hard to argue to management that paying for something that isn’t obviously required _now_ is actually required at all. I’m hoping that the like of EC2 and AppEngine will make these things easier, but scaling is still _hard_.

What’s really required is framework-level scaling, which looks like AppEngine is trying to address. The like of Rails and Django, being ubiquitous within their lanuguages, are perfectly placed to have some kind of standard scaling tech built in.

It’s interesting times for web apps, as they grow up from organic scripts into “enterprise” application, but to quote Ted Dziuba:

> You don’t need to worry about scalability on your Rails-over-Mysql application because nobody is going to use it. Really. Believe me. You’re going to get, at most, 1,000 people on your app, and maybe 1% of them will be 7-day active. Scalability is not your problem, getting people to give a shit is.
