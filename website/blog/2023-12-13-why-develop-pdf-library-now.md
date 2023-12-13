---
title: Why Develop a PDF Library Now?
description: Exploring the creation of 'pdfme,' a revolutionary TypeScript-based PDF library. Discover the motivations and innovations behind this modern PDF solution.
slug: why-develop-pdf-library-now
authors:
  - name: Kyohei Fukuda (@hand-dot)
    title: Author of pdfme
    url: https://github.com/hand-dot
    image_url: https://avatars.githubusercontent.com/u/24843808?v=4
tags: []
---

## What is pdfme?

![pdfme](https://storage.googleapis.com/zenn-user-upload/e8b30b9c5923-20231206.png)

An open-source, free PDF creation library written in TypeScript. It allows for declarative PDF creation using templates and works both on servers and browsers.

Since its beta release in February 2022, it has reached Version 3 by November 2023. On [GitHub](https://github.com/pdfme/pdfme), it has garnered 1500 stars, and on [npm](https://www.npmjs.com/package/@pdfme/generator), it sees about 10,000 downloads weekly, though there's some variation.

It's already integrated into various services worldwide, including electronic medical record creation, factory procedure manual production, and e-commerce custom packaging.

This article aims to explain the motivation behind developing pdfme.

<!-- truncate -->

## Why Develop a **PDF Library**?

Since 2014, [pdfkit](https://github.com/foliojs/pdfkit), a fantastic library for creating and editing PDF files, has been available. Another library, [pdf-lib](https://github.com/Hopding/pdf-lib), written in TypeScript and offering additional functionalities over pdfkit's PDF creation capabilities, emerged in 2018.

Both are open-source, free, and available under the MIT License.
So, why develop pdfme despite these excellent libraries?

It started as a simple function with no significant motivation, but it evolved into a passion to "**eliminate the tedious task of PDF creation from the world!**" This drive emerged through the following three steps:

### 1. Created a Function to Return PDFs from JSON Input, 2020~

- pdfkit and pdf-lib are great but require imperative coding and struggle with scaling template numbers.
- For a personal development project, I created a function to return PDFs from JSON input, which led to the precursor of pdfme, [labelmake](https://github.com/hand-dot/labelmake).
- It seemed convenient, so I published it on npm.

### 2. Added WYSIWYG for Ease of Use as a Colleague Struggled with PDF Creation, 2022~

- A colleague was struggling with creating something like a notice of work conditions using [Jaspersoft](https://www.jaspersoft.com/), which seemed overly complex.
- Existing solutions were either too complicated for our needs or required expensive licenses.
- Added an easy-to-use WYSIWYG, similar to PowerPoint, and rebranded labelmake to pdfme, releasing it as a beta version.

    ![](https://storage.googleapis.com/zenn-user-upload/6e1076e7ddf5-20231206.png)
    

### 3. A Desire to Overhaul Commercial Software with OSS, 💥Currently Here💥

- Recognized the inherent problems in PDF creation. Why does it have to be so cumbersome?
- Contemplated why PDF creation remains a tedious task without modern solutions.
- Aimed to contribute to the community at the next level, similar to how pdfkit and pdf-lib did.

## What Kind of PDF Library Are We Developing?

### Implementing Sufficiently Necessary Features

Focusing on simplicity while providing sufficiently necessary features.
In Version 3, we released plugins and custom themes/labels, emphasizing "customizability."

Being Japanese, I ensured our product could easily handle [custom CJK fonts](https://pdfme.com/docs/custom-fonts), unlike others focused only on Latin characters. Interestingly, China is where we get the most website traffic.

However, we're not yet sufficiently equipped for common use cases like dynamically changing table heights. We plan to support relative coordinate layouts and dynamic tables in [Version 4](https://github.com/orgs/pdfme/projects/8/views/1).

### Open Source and Community

Our current motivation is to contribute to the community at the next level, as pdfkit and pdf-lib have done.

I mainly develop the software, but thankfully, 2-3 people contribute daily.

Bug reports and feature proposals can be made through [GitHub Issues](https://github.com/pdfme/pdfme/issues), and we also have an open [Discord](https://discord.gg/xWPTJbmgNV) channel. Any clear questions in these open forums usually receive a response within a day or two, including from me.

### Free to Use

Currently, there's no direct monetization from the library.
It can be installed via npm install and used for commercial purposes without worry.

However, development takes time, so I need to earn a living. I'm working full-time and plan to continue this as a side project for the next few years.

Additionally, I operate a service in Japan using pdfme, [labelmake.jp](https://labelmake.jp/), and occasionally monetize through technical support inquiries.

Support (including documentation) is where I believe users have the most need, so I plan to

 establish a more reliable system in the future if necessary.

## Conclusion

- Creating a future where PDF creation is quick and cost-free.
    - We're making it so one day we'll say, 'Remember how hard it used to be to create PDFs? What was that all about?'
- Believe that even less modern areas can evolve through community contributions.
    - Never thought a function I created years ago would now be used worldwide.
    - OSS is fascinating and engaging! I hope to write another interesting chapter.

### Thank you for your interest in pdfme!

If you support this project, the easiest contribution you can make is to share this article.  
I would be delighted if you could introduce pdfme to people who struggle with PDF creation.