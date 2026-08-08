---
title: Mixing rspec and mislav's will_paginate plugin
date: '2010-01-11'
topic: archive
image: ../../images/tokyo.jpg
---

I didn't find the solution to using will\_paginate in rpsec'd views anywhere, so here it is for anyone else searching for the same.

The solution is to build mock ActiveRecord models as part of an array, which will get you most of the way there. Then you can either the mock in the will\_paginate methods, or you can simply call the paginate method on the array itself, as the plugin extends the Array class.

The code looks a bit like this:

> describe "/items/index.html.erb" do
>
>   before(:each) do
> @items = \[
> stub\_model(Item,
> :name => "value for name",
> :description => "value for description"
> ),
> stub\_model(Item,
> :name => "value for name",
> :description => "value for description"
> )
> \]
> assigns\[:items\] = @items.paginate({:page => 1, :per\_page => 30})
>   end
