---
title: Implementation Ideas for Dynamic Tables in pdfme
description: Explore the innovative solutions for implementing dynamic tables in pdfme, a comprehensive guide discussing challenges, strategies, and ideas for advanced PDF table rendering, including page breaks, table styling, and layout calculations.
slug: implementation-Ideas-for-dynamic-tables
authors:
  - name: Kyohei Fukuda (@hand-dot)
    title: Author of pdfme
    url: https://github.com/hand-dot
    image_url: https://avatars.githubusercontent.com/u/24843808?v=4
tags: []
---

:::info
Contrary to the plan, we are working on the implementation of the dynamic table in a different way.
Please see the following blog article for the latest development information.
- [Developing pdfme V4](/blog/developing-pdfme-v4)

:::

## Why Dynamic Tables Couldn't Be Implemented in pdfme

Until now, pdfme has been realizing simple [variable data printing](https://en.wikipedia.org/wiki/Variable_data_printing) by embedding PDF data into a property called `basePdf` in the template and overlaying a `schema` on top of this PDF.

![Image of the pdfme process](https://storage.googleapis.com/zenn-user-upload/b7b9c0b7611e-20240102.png)

This method is incredibly simple and allows for the easy creation of customized PDFs.

<!-- truncate -->

However, there is a significant need that cannot be ignored for certain use cases in PDF creation.  
That need is table rendering. More specifically, many users want to address cases where the number of rows, like in the red-framed section of the image below, increases, such as in invoices.

<img src="https://storage.googleapis.com/zenn-user-upload/53a9a0a584fc-20240102.png" width="500px" />

The method of overlaying a schema on the basePdf, as explained above, doesn't allow for an efficient implementation of page breaks.

Therefore, the current version of pdfme cannot support tables where rows dynamically increase.

I understand this need but was struggling with how exactly to implement it.  
This has been the main blocker in implementing Tables.

## How to Implement Page Breaks

I've been [discussing](https://github.com/pdfme/pdfme/discussions/148) this with users for quite some time, and finally, there seems to be a way to implement page breaks. Two key elements have come together:

- ReadOnly Schemas added in [V3.2.0](https://github.com/pdfme/pdfme/releases/tag/3.2.0)
    - Line, Rectangle, Ellipse, SVG, Text, Image
- A new way to specify basePdf and padding implemented for [V4](https://github.com/pdfme/pdfme/pull/394), called [BlankPDF](https://github.com/pdfme/pdfme/blob/c4dfa7023a42d9ab207784a6557f902c078bdcd6/packages/common/src/schema.ts#L87)

With ReadOnly Schemas, it's possible to design the static parts of a template within pdfme without loading a PDF designed in basePdf. This allows for the addition of the height of schemas added to the page, adjusting the y-coordinate of all schemas below it by the increased height. Padding also allows control over where to resume rendering after a page break.

The following figure shows an example where 19 rows of table data are provided, causing a page break, and the 'note' schema being pushed down.

![Example of table with page break](/img/dynamictable.png)

The logic I had in mind was:

- Render the table one row at a time, from Header to Row19.
- As the height increases and spills over the first page at Row 12, a page break occurs, creating a second page.
- After rendering up to Row19, the generator function returns the final height of the table, which is retained in a variable like yAdjust (190mm in the figure above).
- For all schemas below the increased height schema (in this example, 'note'), add the increased height (190mm) to their y-coordinate. The rendering starts on the second page at a y-coordinate of 140mm.

The issue is that it doesn't accommodate fixed layouts like headers or footers. In that case, instead of specifying the size of [BlankPDF](https://github.com/pdfme/pdfme/blob/c4dfa7023a42d9ab207784a6557f902c078bdcd6/packages/common/src/schema.ts#L87)'s width and height, specify a PDF containing the fixed design of the header or footer. This is planned for further modification.

## How to Tackle the Complexity of Table Settings and Rendering

Table settings and rendering can get complex. How should we approach it?  
I want to leverage the simplicity of pdfme, which allows for easy PDF creation, to implement the table functionality.

For example, consider how to set up the following table.

![Example of a complex table](https://storage.googleapis.com/zenn-user-upload/5607ddfc06c7-20240102.png)

A table is essentially composed of headers (th) and table data (td).  
Table data may be rendered in something other than text. In this example, `Name` and `Category` columns are rendered with a Text renderer, while `Image` column is rendered with an Image renderer.

**Fortunately, pdfme already implements various renderers like Text, Image, SVG, Barcodes, etc. Therefore, there's no need to create new rendering processes for each cell; once the size and position of a cell are determined, existing PDF rendering processes can be used.**

This leverages the plugin architecture of pdfme's rendering processes, potentially simplifying complex tasks.

This idea came from an [interesting comment](https://github.com/pdfme/pdfme/issues/332#issuecomment-1872032370) left by [MP70](https://github.com/MP70) on the dynamic table issue.  
Considering the above, I believe the table should do the following three things:

### 1. Table Styling

The following image shows a QR code setting panel, but similar style settings should be possible for tables as well.

<img src="https://storage.googleapis.com/zenn-user-upload/9444827add81-20240102.png" width="500px" />


- Border
    - color, width
- Cell Padding (content margin)
    - horizontal, vertical
- Cell Background Color
    - Plan to implement a stripe design, alternating odd and even rows
- Header Visibility

### 2. Setting Headers and Columns

Add columns to the header and set how they will be rendered.

<img src="https://storage.googleapis.com/zenn-user-upload/560ebea7ca2e-20240102.png" width="500px" />


- Each column is rendered with `ReadOnlyText`
    - Options available in the existing Text renderer like text color and background color can be used
- Specify Type to set up rendering of table data
    - Use renderers available in pdfme like Image, Barcodes, etc., as types
- Clicking the gear icon in the image above opens a modal to set the Column and Type

### 3. Calculating Table Layout

Once the style and column rendering settings are determined, calculate the layout and render the cells.

- Calculating and rendering cell positions
    - Generally, render at the same x-coordinate as each column, but use the y-coordinate and height of the row above for the y-coordinate. Once the position is set, render the cell using the column settings.
- Calculating the height of Rows and Cells
    - As explained in the page break section, the increased height needs to be communicated to the generator function.
    - As a current issue, the Text renderer, if not using the Dynamic Font Size feature, might render beyond the set height, as shown in the image below.
        ![Text rendering spilling over set height](https://storage.googleapis.com/zenn-user-upload/2f880c86b4fd-20240102.png)
    - Ideally, the row height should be expanded, as shown in the image below. To achieve this, the Text renderer needs to return the rendered height after rendering.
        <img src="https://storage.googleapis.com/zenn-user-upload/3b7065ee2f39-20240102.png" width="500px" />
    - The height of each cell's rendering result determines the height of each Row, and the total height of all Rows determines the height of the table.

## I Would Appreciate Feedback

The implementation of the table hasn't started yet. Right now, it's just the ideas written in this document.  
I believe there are many oversights and issues with these ideas.

Being an OSS, I hope it gets seen by many and receives feedback and collaboration. If there seem to be any issues, please let me know.  
The dynamic table issue is here. Feel free to comment.  
[https://github.com/pdfme/pdfme/issues/332](https://github.com/pdfme/pdfme/issues/332)

And thank you for reading until the end.  
If you want to support this project, the easiest way to contribute is to share this article.  
I look forward to your continued support for pdfme.