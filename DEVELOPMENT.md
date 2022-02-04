<!-- TODO translate -->
npm link を使って ローカルでの開発を行なってください
そのため packages/generator, packages/ui で npm link をしてください。
そして、packages/common, packages/generator, packages/ui で npm run develop を行い、
変更があれば distフォルダに出力されるようにします。

変更を確認するには 例えば npx create-react-app my-app で適当なアプリケーションを作成し、
上記でnpm linkした packages/generator, packages/uiを  my-app に結びつけてください
(!!これらを同時にlinkすることができない問題がある)
npm link @pdfme/generator @pdfme/ui

npm ls で下記のように確認できます。
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

これで packages/common, packages/generator, packages/ui の変更がmy-appで使用している
@pdfme/generator, @pdfme/ui に反映されます。

my-appでnpm run start して、 packages/uiや@pdfme/generatorを書き換えれば my-appで変更を確認することができます