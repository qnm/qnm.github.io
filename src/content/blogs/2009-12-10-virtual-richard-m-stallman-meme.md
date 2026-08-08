---
title: Virtual Richard M. Stallman Meme
date: '2009-12-10'
topic: archive
image: ../../images/tokyo.jpg
---

Joining in… [Planet Ubuntu](http://planet.ubuntu.com/) Virtual Richard M. Stallman meme

Here’s my Ubuntu Karmic on my Asus EEE

> robsharp@bamboo:~$ vrms
>
> No non-free or contrib packages installed on bamboo!  rms would be proud.

At one point or another I may have installed and removed nonfree software, such as Skype, but this little gem provides a post apt-get remove purge, which resulted in my clean sheet! I'm such a purist :-p

> dpkg -l |awk ‘/^rc/ {print $2}’ |xargs sudo dpkg --purge
