<!-- TOOD This readme should be rewrite. -->
# labelmake-ui

labelmake's [template design & code generator tool](https://labelmake.jp/javascript-pdf-generator-library/template-design/) has been cut out as a UI library. 

![](./assets/screenShot.png)


That is labelmake-ui.


## Check example

You can check and edit mininal example.

```
npm install -g serve
serve -s dist
```

open http://localhost:5000/

Try editing the fetchTemplate and saveTemplate functions in dist/index.html

## API
<!-- TODO namespace is "NOT" LabelmakeEditor-->
Library namespace is LabelmakeEditor.

LabelmakeEditor has init function.

```ts
const init: (domContainer: HTMLElement, fetchTemplate: () => Promise<Template>, saveTemplate: (template: Template) => Promise<Template>, customHeader?: React.ComponentType<EditorHeaderProp> | undefined) => void
```

This function takes four arguments.
- domContainer: The HTML element to attach
- fetchTemplate: Function to fetch the template when the editor is initialized.
- saveTemplate: Callback function called when the editor is saved.

---

## Setup

node 15.x, npm 7.x

```
npm i
```

## Develop

```
npm run develop
```

open http://localhost:8080/

## Build

```
npm run build
```

## Storybook

```
npm run storybook
```