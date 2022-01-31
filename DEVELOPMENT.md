Please use `yarn`

## development pdfme library

### develop

```
$ yarn install
$ npm run develop
```

You can open http://localhost:8080/

### build

```
$ yarn install
$ npm run develop
```

You can get output in dist/ folder

## development website

You have to build pdfme library before start website.

```
$ yarn install
$ npm run build
```

```
$ cd website
$ yarn install
$ npm run start

```
You can open http://localhost:3000/  

If you need open website and development library, you need yarn link.

```
$ yarn link
$ cd website
$ yarn link pdfme
```

