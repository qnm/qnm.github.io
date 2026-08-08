---
title: Blockchain contracts and the second-hand marketplace
subtitle: >-
  Recently I found my kids' old iPad, complete with smashed screen. It’s since
  been replaced by a slew of cheap Androids.
date: '2016-05-29'
canonical: >-
  https://medium.com/@qnm/blockchain-contracts-and-the-second-hand-marketplace-8e83af202a2b
---

Recently I found my kids' old iPad, complete with smashed screen. It’s since been replaced by a slew of cheap Androids.

Rather than throwing it out, I took some pictures, uploaded them to eBay, and advertised the iPad as sale for parts.

I received a number of offers — broken iPads are popular, it seems — but interestingly i received a number of requests for the iPad serial number.

I wasn’t sure if I should give this data out. It feels private but, after brief research into the topic, I discovered it’s commonly used by the buyer to determine whether a device has been stolen, or not.

If a buyer only wanted to successfully bid on devices that were not stolen (as per the Apple API), could we not have software to define that contract?

Apple (and others) provide an API to determine whether a device has been reported stolen. Wiring that data into a contract which only bids once the check is passed reduces risk for both parties. No serial number need be exposed outside of the contract. Potentially someone more nefarious could provide two bids, depending on what the API returned, but the process may reduce harvesting of serial numbers, if such a thing exists.

The software world is shifting towards exposing business intelligence in APIs, for consumption by chatbots and machine consumers, but using that data to form software defined contracts is an area I’ll be watching closely.
