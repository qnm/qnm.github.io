---
title: Using Gatsby with Github Pages and Actions
date: '2019-04-30'
read: 1 min read
---

Gatsby is a super-lean and customisable static site generator and, when combined with Github Pages and Github Actions, can provide a really easy-to-use workflow for content creation.

Here's how I did it:

1. Create your new gatsby blog.

There's literally hundreds of Gatsby 'starters' available over at https://www.gatsbyjs.org/starters/. You should pick yourself something nice, and then use Gatsby to creater a new one.

I intend to run mine on Github Pages, so I used my Github username to name my site. In my case

`gatsby new qnm.github.com https://github.com/tobyau/gatsby-starter-amelie`

This creates a new directory with your blog set up.

1. Add in your Github repository

Jump over to Github and create yourself a new repository in the format `[username].github.com`.

In my case this was `qnm.github.com`. Once you've done this, you can add the remote repo and push.

`git remote add origin https://github.com/qnm/qnm.github.com`

`git push -u origin master`

1. Setting up a development branch

Move into your newly created Gatsby blog

`cd qnm.github.com`

In our case, our `master` branch will be used for the static site, so let's switch to a `dev` branch:

`git checkout -b dev`

At this point it's worthwhile telling Github that you want the `dev` branch to be the main one.

1. Add in the Github action workflow.

Then create a new directory for actions:

`mkdir -p .github/workflows`

Lastly, we need to create a file to hold our workflow. The path I use is `.github/workflows/gatsby.yml`

That file has the following contents:

```
name: Gatsby Publish

on:
  push:
    branches:
      - dev

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
      - uses: enriikke/gatsby-gh-pages-action@master
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
```

There's one further step inside Github itself - creating a Personal Access Token and then storing in Secrets.

TODO

