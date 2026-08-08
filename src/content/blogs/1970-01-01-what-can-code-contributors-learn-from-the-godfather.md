---
title: What can code contributors learn from The Godfather?
subtitle: >-
  I was recently asked by a contributor as to how to reduce the amount of time
  it takes to get a PR accepted. It’s an interesting question…
date: '1970-01-01'
draft: true
---

I was recently asked by a contributor as to how to reduce the amount of time it takes to get a PR accepted. It’s an interesting question, one no doubt asked by software teams all around the world. 

Exploring the question further, I asked the contributor what she expected to get out of a code review. She thought she could learn from suggested improvements to the implementation. This is a reasonable answer, and I’d hope that a more experienced reviewer would take the time to indicate where a simpler or more robust implementation could be used. However, there’s a value exchange at play here, and that answer misses the point of a PR. 

_“Come to think of it, what is the point of a PR?”_

 _— “To make a change to our system”_

_“Why?”_

 _— “To solve a particular problem”_

_“How do you know when you’ve solved it?”_

 _— “Because, when I carried out this check, I saw the desired outcome over there”_

To circle back to the title, as a contributor you need to “to make (the reviewer) an offer they can’t refuse” — or, have empathy for the reviewer. Show them you’ve done the hard work, the thinking, the problem solving, the testing.

### Describe the problem you face. Setting the scene.

Context. Context. Context.

Your reviewer needs to understand the forces that have caused you to write code. From this they can build a mental model of why the current solution isn’t working.

### Describe how your solution solves the problem.

No-one wants a solution to a problem that doesn’t exist. Given the forces above, can you explain how your solution moves them? Importantly, what are the compromises you have made along the way? 

### Indicate how you have verified you have solved the problem.

Specs are great, but certain types of
