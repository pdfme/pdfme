To develop pdfme locally you need to install it, then embed it within a React application.
You can either use your own, or use the [pdfme-playground](https://github.com/pdfme/pdfme-playground).

## Installing and linking pdfme

* Clone the repository
* install dependency with `npm install`
* Use `npm link` in `packages/generator` and `packages/ui`:

```cmd
[in pdfme dir] $ npm install
[in pdfme dir] $ npm run build
[in pdfme/packages/ui dir] $ npm link
[in pdfme/packages/generator dir] $ npm link
```

Then, run `npm run develop` on `packages/common`, `packages/schemas`, `packages/generator`, and `packages/ui`, 
and make sure that any changes are output to each packages `dist` folder.

```cmd
[in pdfme/packages/common dir] $ npm run develop
[in pdfme/packages/schemas dir] $ npm run develop
[in pdfme/packages/ui dir] $ npm run develop
[in pdfme/packages/generator dir] $ npm run develop
```

## Using pdfme UI within an application

### Create your own application

Create a React application, e.g. with `npx create-react-app my-app` in another folder and
Install `@pdfme/generator` and `@pdfme/ui` with the following command:

```cmd
[in my-app dir] $ npm install --save @pdfme/generator @pdfme/ui
```

### OR use the pdfme-playground

If you don't want to prepare your own app, you can clone the [pdfme-playground](https://github.com/pdfme/pdfme-playground) repository, 
which contains a comprehensive example of how to use the pdfme ui and generator in a browser. After checking out pdfme-playground:

```
[in pdfme-playground dir] $ npm install
```

*For the remainder of this guide, consider the `pdfme-playground dir` or `my-app dir` as `app dir`.*

### Linking packages to your checked out version of pdfme

Regardless of whether you use your own application or the pdfme-playground, you need to link the packages to your checked out version of pdfme.

Connect `packages/generator` and `packages/ui`, which you npm linked above, to the relevant app with the following command:

```cmd
[in app dir] $ npm link @pdfme/generator @pdfme/ui
```

You can use `npm ls` to check if the `npm link` is configured correctly as follows:

```cmd
[in app dir] $ npm ls
app@0.1.0 /Users/user/app
├── @pdfme/generator@npm:generator@1.0.0-beta.7 extraneous -> ./../../../pdfme/packages/generator
├── @pdfme/ui@npm:ui@1.0.0-beta.7 extraneous -> ./../../../pdfme/packages/ui
├── @testing-library/jest-dom@5.16.2
├── @testing-library/react@12.1.2
├── @testing-library/user-event@13.5.0
├── react-dom@17.0.2
├── react-scripts@5.0.0
├── react@17.0.2
└── web-vitals@2.1.4
```

Now, changes in `packages/common`, `packages/schemas`, `packages/generator`, and `packages/ui` will be reflected in the app's @pdfme/generator and @pdfme/ui.

If you run `npm run start` on your app and make changes to any of the pdfme packages you can confirm these changes within your app.

Note that after making codes changes you will need to rebuild each package (`npm run build`). If you changed either `packages/common` or `packages/schemas` then you will also need to rebuild the package using them (`ui` or `generator`).

