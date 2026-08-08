---
title: '[Rails] Using ssl/tls with ActionMailer (gmail)'
date: '2008-07-16'
topic: archive
image: ../../images/tokyo.jpg
---

[drawohara](http://drawohara.com/post/37908300/rails-using-ssl-tls-with-actionmailer-gmail):

Using ActionMailer with tsl/ssl (for example with gmail) can be this easy

**#**
**\# step 1 - grab this tls patch for ruby’s net/smtp.rb lib**
**#**

curl **\-s** [](http://s3.amazonaws.com/drawohara.com.ruby/tls_smtp.rb)<http://s3.amazonaws.com/drawohara.com.ruby/tls_smtp.rb> **\>**

./lib/tls\_smtp.rb

**#**
**\# step 2 - put something like this into ./config/initializers/email.rb**
**#**

require 'tls\_smtp'

ActionMailer::Base.delivery\_method = :smtp
ActionMailer::Base.smtp\_settings = {
  :address => 'smtp.gmail.com',
  :port => 25,
  :domain => 'yourdomain.com',
  :user\_name => 'zaphod@yourdomain.com',
  :password => 'beeblebrox',
  :authentication => :plain,

}

Awesome - just what i needed!
