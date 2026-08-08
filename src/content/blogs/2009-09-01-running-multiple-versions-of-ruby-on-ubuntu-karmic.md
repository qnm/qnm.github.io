---
title: Running multiple versions of Ruby on Ubuntu Karmic
date: '2009-09-01'
topic: archive
---

UPDATED: For dev, you could also use Ruby Version Manager <http://rvm.beginrescueend.com/>

Recently I discovered that Karmic ships with Ruby 1.8.7 - not a problem in itself, but if you're using ActionMailer with Google Mail, there's some big changes between how SMTP/TLS is handled on 1.8.6 vs 1.8.7 that cause things to break.

I run Ruby Enterprise Edition on my web server - which is currently 1.8.6 - and so the code I had written and tested locally wouldn't run correctly on the server. I can easily install REE locally, but I'd like to hang on to the default ubuntu Ruby too. Thankfully, there's an easy solution

update-alternatives

Let's create an alternative path for REE

> sudo update-alternatives --install /usr/local/bin/ruby ruby /opt/ruby-enterprise/bin/ruby 50 --slave /usr/local/bin/erb erb /opt/ruby-enterprise/bin/erb --slave /usr/local/bin/gem gem /opt/ruby-enterprise/bin/gem --slave /usr/local/bin/irb irb /opt/ruby-enterprise/bin/irb --slave /usr/local/bin/rdoc rdoc /opt/ruby-enterprise/bin/rdoc --slave /usr/local/bin/ri ri /opt/ruby-enterprise/bin/ri --slave /usr/local/bin/testrb testrb /opt/ruby-enterprise/bin/testrb --slave /usr/local/bin/rake rake /opt/ruby-enterprise/bin/rake --slave /usr/local/bin/rails rails /opt/ruby-enterprise/bin/rails

...and for MRI

> sudo update-alternatives --install /usr/local/bin/ruby ruby /usr/bin/ruby 100 --slave /usr/local/bin/erb erb /usr/bin/erb --slave /usr/local/bin/gem gem /usr/bin/gem --slave /usr/local/bin/irb irb /usr/bin/irb --slave /usr/local/bin/rdoc rdoc /usr/bin/rdoc --slave /usr/local/bin/ri ri /usr/bin/ri --slave /usr/local/bin/testrb testrb /usr/bin/testrb --slave /usr/local/bin/rake rake /usr/bin/rake --slave /usr/local/bin/rails rails /usr/bin/rails

Oddly, my Karmic install already had an alternative by gems, so I had to remove that first using

> sudo update-alternatives --remove-all gem

I can now easily switch betwen them using

> sudo update-alternatives --config ruby

Too easy!
