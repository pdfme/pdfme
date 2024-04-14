---
title: Released pdfme V4
description: Explore the latest features and enhancements in pdfme V4, including a new left sidebar for easy schema placement and the addition of dynamic table generation.
slug: released-pdfme-v4
authors:
  - name: Kyohei Fukuda (@hand-dot)
    title: Author of pdfme
    url: https://github.com/hand-dot
    image_url: https://avatars.githubusercontent.com/u/24843808?v=4
tags: []
---

## Overview

**🚀 Release [pdfme V4!!](https://github.com/pdfme/pdfme/releases/tag/4.0.0) 🚀**

### What's Changed

- V4 by @hand-dot in https://github.com/pdfme/pdfme/pull/427
  - Add a Left Sidebar for Placing Schemas #400
  - Add DynamicTable Schema #332 (Still have bug...)
- Update custom-fonts.md by @KaminoRyo in https://github.com/pdfme/pdfme/pull/448
- contentEditable firefox fix by @valushagrinchik in https://github.com/pdfme/pdfme/pull/444
- Support for line breaking on hyphens by @peteward in https://github.com/pdfme/pdfme/pull/451
- Add spanish language by @fmaso04 in https://github.com/pdfme/pdfme/pull/458
- remove localhost from related links by @bboyle in https://github.com/pdfme/pdfme/pull/469

<!-- truncate -->

:::info

Users who have been using V3 should be cautious when updating to V4. Please refer to the following article for necessary modifications:
[About Backward Compatibility](/blog/developing-pdfme-v4#about-backward-compatibility)

:::

## Key Features

### Add a Left Sidebar for Placing Schemas

![Add a Left Sidebar for Placing Schemas](/img/sidebar-drag&drop.gif)

- You can now place schemas by dragging and dropping.
- Add an icon to the sidebar by including the `icon` property in the `defaultSchema` property when defining plugins.
  - Reference: [packages/schemas/src/text/propPanel.ts](https://github.com/pdfme/pdfme/blob/40cc703f2c2ac144dfb395f9be3998f40b3ed43f/packages/schemas/src/text/propPanel.ts#L180)

### Add DynamicTable Schema

![Add a Left Sidebar for Placing Schemas](/img/table.png)

- Added a schema for dynamically generating tables.
- This is currently released as Beta due to remaining bugs.
- For more details, please refer to [here](/docs/tables).

## Thanks, everyone

pdfme exists thanks to the contributions of many contributors.  
We express our gratitude to everyone involved in this release.  

We look forward to your continued support for pdfme!