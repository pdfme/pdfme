Clone the repository , install dependency and use `npm link` for local development.  
For this purpose, please do `npm link` in `packages/generator` and `packages/ui`.

```cmd
[in pdfme dir] $ npm install
[in pdfme dir] $ npm run build
[in pdfme/packages/ui dir] $ npm link
[in pdfme/packages/generator dir] $ npm link
```

Then, run `npm run develop` on `packages/common`, `packages/generator`, and `packages/ui`, and
Make sure that any changes are output to the each packages's `dist` folder.

```cmd
[in pdfme/packages/common dir] $ npm run develop
[in pdfme/packages/ui dir] $ npm run develop
[in pdfme/packages/generator dir] $ npm run develop
```

To confirm the changes, for example, create a React application with `npx create-react-app my-app` in other folder and
Install `@pdfme/generator` and `@pdfme/ui` with the following command.

```cmd
[in my-app dir] $ npm install --save @pdfme/generator @pdfme/ui
```

In addition, connect `packages/generator` and `packages/ui`, which you npm linked above, to my-app with the following command

```cmd
[in my-app dir] $ npm link @pdfme/generator @pdfme/ui
```

> If you don't want to prepare my-app by yourself, you can clone the following repository and use npm link @pdfme/generator @pdfme/ui to develop it.  
> https://github.com/pdfme/pdfme-playground

You can use `npm ls` to check if the `npm link` is configured correctly as follows.

```cmd
[in my-app dir] $ npm ls
my-app@0.1.0 /Users/user/my-app
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

Now, changes in `packages/common`, `packages/generator`, and `packages/ui` will be reflected in my-app's @pdfme/generator and @pdfme/ui.

If you run npm run start on my-app and rewrite `packages/common`, `packages/generator`, and `packages/ui`, you can confirm the changes on my-app
