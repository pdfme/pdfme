---
title: Developing pdfme V4
description: Explore the latest developments in pdfme V4, from dynamic table schemas and UI enhancements to new features like placeholders and expressions. Dive into the challenges and progress, including critical bug fixes and backward compatibility considerations, and learn how you can contribute to this evolving open-source PDF library project.
slug: developing-pdfme-v4
authors:
  - name: Kyohei Fukuda (@hand-dot)
    title: Author of pdfme
    url: https://github.com/hand-dot
    image_url: https://avatars.githubusercontent.com/u/24843808?v=4
tags: []
---

Development of V4 started in December last year, and it's been about 3 months since then.

I apologize for the slow development speed. However, the release of V4 is gradually becoming a reality.

<!-- truncate -->

## Features Planned for V4

1. [**Add DynamicTable Schema #332**](https://github.com/pdfme/pdfme/issues/332)

    ![](https://storage.googleapis.com/zenn-user-upload/3d22843b2486-20240302.png)
    
    - The table is being implemented differently than planned.
        - Two months ago, I wrote a blog post titled [Implementation Ideas for Dynamic Tables in pdfme](https://pdfme.com/blog/implementation-Ideas-for-dynamic-tables), but the actual implementation deviated from the ideas at that time.
        - The implementation is based on **[jspdf-autotable](https://www.npmjs.com/package/jspdf-autotable)**.
            - It was thought that organized classes, options, and layout calculations could be reused.
            - The code from **[jspdf-autotable](https://www.npmjs.com/package/jspdf-autotable)** was ported, unnecessary code was removed, and it's being used for table calculation processes.
        - In both the generator and UI packages, the `getDynamicTemplate` function is called to calculate the height of the table, readjust the Y-coordinate of schemas located below the table, and handle page breaks.
    - There are several critical bugs that have not been successfully fixed for a week.
        - The implementation of `getDynamicTemplate` is failing to calculate correctly, which is critical and blocking the release.
            - [🔥🔥🔥 [Form & Generator] The page break does not account for pages beyond the second page. #429](https://github.com/pdfme/pdfme/issues/429)
            - [🔥🔥🔥 [Form & Generator] When spanning across pages, it overlaps due to a padding issue. #428](https://github.com/pdfme/pdfme/issues/428)
        - Bugs are already documented in issues: https://github.com/pdfme/pdfme/issues?q=is%3Aissue+is%3Aopen+label%3Atable
        - Honestly, I'm stuck on fixing these bugs. I don't want to be stuck here, so I plan to start working on the other features introduced next.
2. [**Add a Left Sidebar for Placing Schemas #400**](https://github.com/pdfme/pdfme/issues/400)
    
    ![](https://storage.googleapis.com/zenn-user-upload/be31a9c03519-20240302.png)

    - Adding a UI that allows dragging schemas from the sidebar.
    - The definition of plugins is changing (adding icons), so I intend to include this in this major version.
3. [**Placeholder, Expression #439**](https://github.com/pdfme/pdfme/issues/439)
    
    ![](https://storage.googleapis.com/zenn-user-upload/4e66257d5d55-20240302.png)

    - I don't have a concrete image of how to realize this yet.
        - Perhaps a template engine like **[Handlebars](https://handlebarsjs.com/)** could operate at render time?
    - However, there is a clear need from users. This might also involve breaking changes, so it might be included in V4 depending on circumstances.
      - ref: https://github.com/pdfme/pdfme/issues/437
      - ref: https://github.com/pdfme/pdfme/pull/388
      - ref: https://github.com/pdfme/pdfme/discussions/208#discussioncomment-6594913

## Release Timing

- I want to release as soon as possible, but I can't determine a release date yet since I don't know when the bugs will be fixed, and I haven't started on the other features.
- Currently, only the implementation of the table is completed, and there are still critical bugs to be resolved before release, so it looks like it will take some more time.
- If you don't particularly plan to use the features announced in V4, please continue to use V3 with confidence. Necessary fixes for V3, including bug support, will continue.

## Access to the alpha version

- A preview environment for V4 is prepared: https://pdfme-playground-v4.vercel.app/
- How to install V4
    
    Versions tagged with next on [npm's version page](https://www.npmjs.com/package/@pdfme/generator?activeTab=versions) are V4 versions. Currently, version 4.0.0-alpha.0 is released for each package.
    
    ![](https://storage.googleapis.com/zenn-user-upload/65a828e2f2b7-20240302.png)

    - The following command can be used for installation:
        - `npm i @pdfme/common@4.0.0-alpha.0 @pdfme/schemas@4.0.0-alpha.0 @pdfme/generator@4.0.0-alpha.0 @pdfme/ui@4.0.0-alpha.0`

## About Backward Compatibility

When using V4, modifications will be necessary for past templates and plugins.

- Templates:
    - `template.sampledata` has been deprecated, and now designer display data is held in each schema's `content` property.
        - Modification example: https://github.com/pdfme/pdfme/pull/427/files#diff-4f370f85245caa3e9aa10fa5ecded75ba9fca1530600f8ceadc8b94f01f7df77
- Plugins:
    - Plugins now use `defaultSchema.content` instead of `defaultValue` as initial data.
        
        ![](https://storage.googleapis.com/zenn-user-upload/2cb01519cb4a-20240302.png)
        
    - When onChange occurs within a plugin, instead of rewriting the user input with `onChange`, it is now possible to also change the schema definition itself in the format `{[key:string]:string}`. If you want to reflect the user input as before, please write `onChange({ key: 'content', value: data });`.
        
        ![](https://storage.googleapis.com/zenn-user-upload/02a5e41c6fb9-20240302.png)
        
    - Modification example: https://github.com/pdfme/pdfme/pull/427/files#diff-e64985c2bcbfd91c01ab897562721dccc7605499f81432b2e09c167e7a844bb0
- Versioning Templates:
    - Templates created with the V4 designer will now have versions. Currently, as it is in development, the property `pdfmeVersion:"4-dev"` will be added.
        
        ![](https://storage.googleapis.com/zenn-user-upload/51d4bbc4e1c2-20240302.png)
        

## Finally

### Help wanted!

I can move to the next step if the table bug is resolved, but honestly, I'm stuck and would really appreciate help...

- If anyone is willing to help with the following issue, please let me know. I intend to add the information I know to the issue so that we can fix it efficiently when a collaborator appears.
    - [🔥🔥🔥 [Form & Generator] The page break does not account for pages beyond the second page. #429](https://github.com/pdfme/pdfme/issues/429)
    - [🔥🔥🔥 [Form & Generator] When spanning across pages, it overlaps due to a padding issue. #428](https://github.com/pdfme/pdfme/issues/428)

I'm stuck but want to move forward, so I intend to start implementing the following feature in March.

- [**Add a Left Sidebar for Placing Schemas #400**](https://github.com/pdfme/pdfme/issues/400)

### Thanks, everyone

I couldn't make good progress in February, but the contributors did an excellent job. Thank you.

- [Fix pdf text render overlap by avoiding line breaks in pdflib #417](https://github.com/pdfme/pdfme/pull/417)
- [ui-build-optimization: development react/react-dom files in prod build fix #422](https://github.com/pdfme/pdfme/pull/422)

It's not merged yet, but this PR that added color type is cool too.

- [Added support for color type option in generator #436](https://github.com/pdfme/pdfme/pull/436)

There are infinite ways to contribute to OSS beyond code.

First, use the software, and if you think it's good, introduce this library to your friends. If you find a bug, please register it from [GitHub issues](https://github.com/pdfme/pdfme/issues).

It might take some time, but I try to reply as much as possible and look through the comments.

V4 will include the table feature I had given up on when I started creating this library, and this was something I could never have done alone. I am grateful to supporters, contributors, and users. I am amazed by the power of OSS, and now I feel like we can create the best PDF library!

I will update you if there are any more updates. Thanks for reading to the end.