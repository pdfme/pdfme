# Playground File Workspace Plan

最終更新: 2026-05-14

## 目的

- `playground/public/template-assets` と同じような template collection directory を、ブラウザ内
  localStorage ではなく、ユーザーが選んだローカルディレクトリ上の実ファイル群として扱う。
- Designer / FormViewer と、同じディレクトリを編集する AI / editor / CLI が
  `<template-name>/template.json` を介して協調できるようにする。
- Playground は「編集 UI」でありつつ、保存先は mounted collection 内で選択した template の
  `template.json` にする。

## 既存構造メモ

- `playground/public/template-assets` は root 直下に `<template-name>/template.json` が並ぶ collection。
- 既存 gallery は `playground/src/routes/Templates.tsx` で sample templates と local projects を表示する。
- Local project workspace の正体は `playground/src/lib/playgroundProjects.ts` の `PlaygroundProject[]`。
  `localStorage` の `playground:projects:v1` に保存される。
- 現在の import は `Import Template JSON` のみ。1 つの `Template` を local project として保存する。
- 現在の export は `Template JSON` download のみ。inputs、source、title、kind は export されない。

## Browser API 前提

- `showDirectoryPicker({ mode: "readwrite" })` で template collection root directory を選ぶ。
- root 直下の child directories から `<template-name>/template.json` を探し、`checkTemplate` に通るものを
  mounted templates として扱う。
- File System Access API は secure context と user gesture が必要。`localhost` と
  `https://playground.pdfme.com` は前提にできる。
- 非対応ブラウザでは従来の import/download fallback のままにする。
- `FileSystemFileHandle.createWritable()` で selected template JSON file を上書き保存できる。
- File / directory handle は IndexedDB に保存できる。次回アクセス時の復元候補に使う。
- `FileSystemObserver` は experimental / non-standard。使える場合だけ使い、MVP は polling fallback を標準経路にする。
- 現在の TypeScript DOM lib には `showDirectoryPicker` と `FileSystemObserver` の型がないため、
  playground 側に小さな ambient type を追加する。

参考:

- https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- https://wicg.github.io/file-system-access/
- https://developer.mozilla.org/en-US/docs/Web/API/FileSystemObserver/observe

## 確定要件

- 対象は `playground/public/template-assets/<template-name>/template.json` と同じ directory collection 形式。
- root 直下の child directories を走査し、各 `<template-name>/template.json` を `checkTemplate` などで
  validation して pdfme `Template` として認識できたものを mounted templates にする。
- valid template directory が 1 つもない場合は、blank template を
  `untitled-template/template.json`, `untitled-template-2/template.json` のように採番して新規作成する。
- 保存時は `JSON.stringify(template, null, 2)` の pretty JSON で、現在開いている
  `<template-name>/template.json` に上書き保存する。
- 保存時に browser 側で thumbnail を再生成し、対応する `<template-name>/thumbnail.png` へ上書きする。
- Designer に未保存変更がある状態で外部変更を検知した場合は conflict dialog を出し、ユーザーに選択させる。
- FormViewer で template が変わった時は、同名 field の入力値を保持する。
- workspace file は template JSON だけを同期対象にする。`inputs.json` は同期しない。
- JSX / md2pdf の `source.tsx` / `source.md` は初期実装では対象外。
- `base.pdf` や画像などの相対 path asset は読まない。現状どおり data URL / URL / base64 保存前提。
- 前回開いた workspace は IndexedDB に handle を保存し、次回アクセス時に復元候補として出す。
- File System Access API 対応は一旦 Chromium 系だけで考える。Safari / Firefox は fallback のままでよい。

## UX 方針

- `Open Folder` は Templates 画面の `My Workspace` 内に置く。
- Mounted collection は existing local projects と混ぜず、`Mounted Folder` のような別セクションにする。
- Local projects と Mounted Folder は切り替えられる感じにする。local projects から Mounted Folder への
  migration / export は将来検討として残す。
- Folder open 後は Templates 画面に留まり、mounted templates を一覧表示する。
- Mounted collection は同時に 1 folder だけ。
- `Disconnect Folder` / `Close Folder` を用意し、いつでも unmount できるようにする。
- valid template が 0 件の folder を開いた場合は、まず blank template を作るか確認し、作成後に Designer を開く。

## MVP 方針

- `Open Folder` / `Open Directory` を My Workspace 付近に追加する。
- Directory workspace は「collection root directory handle + template entries」と定義する。
- Template entry は `<template-name>/template.json`, `<template-name>/metadata.json`,
  `<template-name>/thumbnail.png` file handles から作る。
- Open 時は root 直下の child directories を scan し、`template.json` の JSON parse と `checkTemplate`
  を通った directories を collection entries にする。
- Scan 対象は root 直下の child directory のみ。深い階層は無視する。
- dot directory (`.git`, `.cache` など) は無視する。
- invalid `template.json` の directory は一覧に出さず、toast または console warning に留める。
- valid template directory がない場合は、ユーザー確認後に `getBlankTemplate()` を新規 directory に pretty JSON
  で作成し、その entry を Designer で開く。
- Open 成功時は mounted collection を Templates 画面の workspace section に表示し、選択した template を
  Designer または FormViewer に読み込む。
- `metadata.json` は mounted collection の一覧表示に使う。title / description / tags / order など、gallery
  表示に必要な情報は metadata から読む。
- 既存 `playground/public/template-assets` も per-template `metadata.json` へ統一したい。現状 root
  `metadata.json` にしか metadata がないものがあるため、実装時に既存 templates 全てへ
  `<template-name>/metadata.json` を作る migration task を含める。
- `index.json`, `manifest.json`, `manifests/<version>.json` は mounted collection では read-only/generated-ish
  metadata として扱い、初期実装では更新しない。
- Designer の save は file workspace active 時に prompt なしで selected template JSON file へ上書き保存する。
  localStorage project 保存は fallback / 別 mode として残す。
- File workspace active 時、Designer の save button 文言は `Save <template-name>/template.json` のように
  selected file が分かる形にする。
- File workspace active 時の `Save As` は local project 複製ではなく、mounted folder 内に新しい
  template directory を作る。
- Designer で編集中の template が外部で削除された場合、`Save over disk` は同じ path に再作成する。
- Mounted template を Designer で開いた場合、localStorage active project は切り替えない。
- FormViewer は selected template JSON file の変更を検知して `updateTemplate()` する。
  inputs は `getInputFromTemplate(template)` で補完しつつ、既存入力を schema name ベースで保持する。
- FormViewer の `Save` / `Save As` は local project inputs 保存として残す。
- Collection root の directory changes も polling / observer で検知し、template directory の追加・削除・rename
  を Templates 画面に反映する。

## Thumbnail 方針

- Folder scan 時に既存 `thumbnail.png` があれば読む。
- `thumbnail.png` がない場合は browser 側で作成する。
- Designer save 時に thumbnail を再生成する。FormViewer の入力変更では再生成しない。
- Thumbnail 生成に使う inputs は `getInputFromTemplate(template)` でよい。
- Thumbnail write に失敗しても template save は成功扱いにし、toast warning を出す。
- Thumbnail が読めない / 生成できない場合の fallback image を用意する。

## 同期・競合

- clean state で外部変更を検知した場合は自動 reload する。
- Designer に未保存変更がある状態で外部変更を検知した場合は、`Reload from disk` / `Keep editing` /
  `Save over disk` を選べる conflict dialog を出す。
- 保存時に disk version が最後に読んだ version から進んでいた場合も同じ conflict として扱う。
- selected template JSON file が invalid JSON / invalid Template になった場合、現在の UI は維持しつつ
  「invalid 中」状態を表示する。toast は連打しない。AI が書きかけの瞬間を polling で拾う可能性があるため、
  次の valid change で自動復帰できるようにする。
- Form 入力中に selected template JSON file が変わった場合、同名 field の入力値は保持し、新規 field は
  `getInputFromTemplate` の default を入れ、消えた field は捨てる。
- Polling interval は 1500ms にする。

## Persistence / Permission

- IndexedDB には collection root handle と selected template directory name を保存する。
- 次回起動時は勝手に permission prompt を出さない。
- Permission が残っていれば自動 mount する。
- Permission が必要な場合は `Reopen last folder` ボタンを表示する。
- Permission denied の場合は mounted state を clear せず、再試行できる表示にする。
- `Disconnect Folder` / `Close Folder` でいつでも unmount できるようにする。

## 実装候補

- `playground/src/lib/fileWorkspace.ts`
  - `isFileWorkspaceSupported()`
  - `openTemplateCollectionDirectory()`
  - `scanTemplateCollection()`
  - `readTemplateEntry(entry)`
  - `writeTemplateEntry(entry, template)`
  - `writeTemplateThumbnail(entry, template, inputs?)`
  - `createBlankTemplateEntry(collection, title?)`
  - `subscribeTemplateCollectionChanges(listener)`
  - IndexedDB に active collection root handle と selected template id/path を保存・復元する helper
- `playground/src/lib/templateInputs.ts`
  - template reload 時に既存 inputs を schema name ベースで reconcile する helper。
- `playground/src/vite-env.d.ts` または `playground/src/lib/fileSystemAccess.d.ts`
  - `Window.showDirectoryPicker`
  - `FileSystemHandle.queryPermission/requestPermission`
  - `FileSystemObserver` の最小 ambient type。
- `playground/src/routes/Templates.tsx`
  - My Workspace toolbar に `Open Folder` を追加する。
  - Open 成功後に mounted collection templates を project card と同じ gallery UI で表示する。
  - mounted collection の card は Designer / FormViewer を開くときに selected template entry を active にする。
  - Mounted Folder section に `Disconnect Folder` / `Close Folder` と `Reopen last folder` を配置する。
- `playground/src/routes/Designer.tsx`
  - load request に active mounted template entry を追加する。
  - `onSaveTemplate` で file workspace active 時は selected template JSON file と thumbnail へ write。
  - `Save As` で mounted folder 内に新しい template directory を作る。
  - 外部変更購読で `designer.current.updateTemplate(template)`。
  - dirty tracking と conflict UI。
- `playground/src/routes/FormAndViewer.tsx`
  - active mounted template entry を読み込み対象に追加する。
  - 外部変更購読で `ui.current.updateTemplate(template)` と inputs reconcile。
- `playground/public/template-assets`
  - 既存 templates の metadata を per-template `metadata.json` へ統一する。
- Tests
  - file workspace helper は fake file handles で unit test する。
  - UI E2E は native picker を mock し、open, save overwrite, thumbnail write, external change polling,
    invalid JSON recovery, conflict branch を確認する。

## 未確定要件

- Mounted Folder と local projects の切り替え UI の具体デザイン。
- local projects から Mounted Folder への migration / export を初期実装に含めるか、後回しにするか。
- root `metadata.json` をどのタイミングで legacy 扱いにするか。
