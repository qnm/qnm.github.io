---
title: Installing Fedora 13 via USB boot disk
date: '2010-05-26'
topic: archive
---

After many attempts to get Fedora 13 onto my Asus EEE 1005HE netbook, I finally cracked it. This is something of a note bene for me, but hopefully it'll help someone else too. For the search spiders, the error you will see will be "installer has tried to mount image #1". Sadly, the live cd kept failing on install, even though it was checksum verified to be a valid download.

1.  Grab the DVD image from [Fedora](http://fedoraproject.org/get-fedora)
2.  Use the [Live CD Creator](http://fedoraproject.org/wiki/FedoraLiveCD/USBHowTo) to build an image from the ISO.
3.  As you've only got a 4Gb drive, delete the RPM and Repo directories, as the installer seems to ignore them anyway.
4.  Copy over the Fedora 13 DVD ISO to the root of the drive.
5.  Boot from USB, and install Fedora goodness!
