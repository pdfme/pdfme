---
id: "index"
title: "pdfme"
slug: "/api/"
sidebar_label: "Exports"
sidebar_position: 0.5
custom_edit_url: null
---

## Classes

- [Designer](classes/Designer)
- [Form](classes/Form)
- [Viewer](classes/Viewer)

## Type aliases

### BarcodeSchema

Ƭ **BarcodeSchema**: `z.infer`<typeof [`BarcodeSchema`](#barcodeschema)\>

#### Defined in

[libs/type.ts:56](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L56)

___

### GeneratorOptions

Ƭ **GeneratorOptions**: `z.infer`<typeof [`GeneratorOptions`](#generatoroptions)\>

#### Defined in

[libs/type.ts:107](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L107)

___

### ImageSchema

Ƭ **ImageSchema**: `z.infer`<typeof [`ImageSchema`](#imageschema)\>

#### Defined in

[libs/type.ts:52](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L52)

___

### Schema

Ƭ **Schema**: `z.infer`<typeof [`Schema`](#schema)\>

#### Defined in

[libs/type.ts:61](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L61)

___

### Template

Ƭ **Template**: `z.infer`<typeof [`Template`](#template)\>

#### Defined in

[libs/type.ts:89](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L89)

___

### TextSchema

Ƭ **TextSchema**: `z.infer`<typeof [`TextSchema`](#textschema)\>

#### Defined in

[libs/type.ts:48](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L48)

___

### UIOptions

Ƭ **UIOptions**: `z.infer`<typeof [`UIOptions`](#uioptions)\>

#### Defined in

[libs/type.ts:118](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L118)

## Variables

### BarcodeSchema

• **BarcodeSchema**: `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `type`: `ZodEnum`<[``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = BarcodeSchemaType }\>, ``"strip"``, `ZodTypeAny`, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>

#### Defined in

[libs/type.ts:55](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L55)

___

### GeneratorOptions

• **GeneratorOptions**: `ZodObject`<`extendShape`<{ `font`: `ZodOptional`<`ZodRecord`<`ZodString`, `ZodObject`<{ `data`: `ZodUnion`<[`ZodString`, `ZodType`<`ArrayBuffer`, `ZodTypeDef`, `ArrayBuffer`\>, `ZodType`<`Uint8Array`, `ZodTypeDef`, `Uint8Array`\>]\> = Data; `fallback`: `ZodOptional`<`ZodBoolean`\> ; `subset`: `ZodOptional`<`ZodBoolean`\>  }, ``"strip"``, `ZodTypeAny`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>\>\>  }, { `splitThreshold`: `ZodOptional`<`ZodNumber`\>  }\>, ``"strip"``, `ZodTypeAny`, { `font`: `undefined` \| `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\> ; `splitThreshold`: `undefined` \| `number`  }, { `font`: `undefined` \| `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\> ; `splitThreshold`: `undefined` \| `number`  }\>

#### Defined in

[libs/type.ts:104](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L104)

___

### ImageSchema

• **ImageSchema**: `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `type`: `ZodLiteral`<``"image"``\>  }\>, ``"strip"``, `ZodTypeAny`, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  }, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  }\>

#### Defined in

[libs/type.ts:51](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L51)

___

### Schema

• **Schema**: `ZodUnion`<[`ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `alignment`: `ZodOptional`<`ZodEnum`<[``"left"``, ``"center"``, ``"right"``]\>\> ; `backgroundColor`: `ZodOptional`<`ZodString`\> ; `characterSpacing`: `ZodOptional`<`ZodNumber`\> ; `fontColor`: `ZodOptional`<`ZodString`\> ; `fontName`: `ZodOptional`<`ZodString`\> ; `fontSize`: `ZodOptional`<`ZodNumber`\> ; `lineHeight`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodLiteral`<``"text"``\>  }\>, ``"strip"``, `ZodTypeAny`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  }, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  }\>, `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `type`: `ZodLiteral`<``"image"``\>  }\>, ``"strip"``, `ZodTypeAny`, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  }, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  }\>, `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `type`: `ZodEnum`<[``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = BarcodeSchemaType }\>, ``"strip"``, `ZodTypeAny`, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>]\>

#### Defined in

[libs/type.ts:60](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L60)

___

### Template

• **Template**: `ZodObject`<{ `basePdf`: `ZodUnion`<[`ZodString`, `ZodType`<`ArrayBuffer`, `ZodTypeDef`, `ArrayBuffer`\>, `ZodType`<`Uint8Array`, `ZodTypeDef`, `Uint8Array`\>]\> = Data; `columns`: `ZodOptional`<`ZodArray`<`ZodString`, ``"many"``\>\> ; `sampledata`: `ZodOptional`<`ZodArray`<`ZodRecord`<`ZodString`, `ZodString`\>, ``"many"``\>\> ; `schemas`: `ZodArray`<`ZodRecord`<`ZodString`, `ZodUnion`<[`ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `alignment`: `ZodOptional`<`ZodEnum`<[``"left"``, ``"center"``, ``"right"``]\>\> ; `backgroundColor`: `ZodOptional`<`ZodString`\> ; `characterSpacing`: `ZodOptional`<`ZodNumber`\> ; `fontColor`: `ZodOptional`<`ZodString`\> ; `fontName`: `ZodOptional`<`ZodString`\> ; `fontSize`: `ZodOptional`<`ZodNumber`\> ; `lineHeight`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodLiteral`<``"text"``\>  }\>, ``"strip"``, `ZodTypeAny`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  }, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  }\>, `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `type`: `ZodLiteral`<``"image"``\>  }\>, ``"strip"``, `ZodTypeAny`, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  }, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  }\>, `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `type`: `ZodEnum`<[``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = BarcodeSchemaType }\>, ``"strip"``, `ZodTypeAny`, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }, { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>]\>\>, ``"many"``\>  }, ``"strip"``, `ZodTypeAny`, { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }, { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }\>

#### Defined in

[libs/type.ts:83](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L83)

___

### TextSchema

• **TextSchema**: `ZodObject`<`extendShape`<{ `height`: `ZodNumber` ; `position`: `ZodObject`<{ `x`: `ZodNumber` ; `y`: `ZodNumber`  }, ``"strip"``, `ZodTypeAny`, { `x`: `number` ; `y`: `number`  }, { `x`: `number` ; `y`: `number`  }\> ; `rotate`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodEnum`<[``"text"``, ``"image"``, ``"qrcode"``, ``"japanpost"``, ``"ean13"``, ``"ean8"``, ``"code39"``, ``"code128"``, ``"nw7"``, ``"itf14"``, ``"upca"``, ``"upce"``]\> = SchemaType; `width`: `ZodNumber`  }, { `alignment`: `ZodOptional`<`ZodEnum`<[``"left"``, ``"center"``, ``"right"``]\>\> ; `backgroundColor`: `ZodOptional`<`ZodString`\> ; `characterSpacing`: `ZodOptional`<`ZodNumber`\> ; `fontColor`: `ZodOptional`<`ZodString`\> ; `fontName`: `ZodOptional`<`ZodString`\> ; `fontSize`: `ZodOptional`<`ZodNumber`\> ; `lineHeight`: `ZodOptional`<`ZodNumber`\> ; `type`: `ZodLiteral`<``"text"``\>  }\>, ``"strip"``, `ZodTypeAny`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  }, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  }\>

#### Defined in

[libs/type.ts:38](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L38)

___

### UIOptions

• **UIOptions**: `ZodObject`<`extendShape`<{ `font`: `ZodOptional`<`ZodRecord`<`ZodString`, `ZodObject`<{ `data`: `ZodUnion`<[`ZodString`, `ZodType`<`ArrayBuffer`, `ZodTypeDef`, `ArrayBuffer`\>, `ZodType`<`Uint8Array`, `ZodTypeDef`, `Uint8Array`\>]\> = Data; `fallback`: `ZodOptional`<`ZodBoolean`\> ; `subset`: `ZodOptional`<`ZodBoolean`\>  }, ``"strip"``, `ZodTypeAny`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>\>\>  }, { `lang`: `ZodOptional`<`ZodEnum`<[``"en"``, ``"ja"``]\>\>  }\>, ``"strip"``, `ZodTypeAny`, { `font`: `undefined` \| `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\> ; `lang`: `undefined` \| ``"en"`` \| ``"ja"``  }, { `font`: `undefined` \| `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\> ; `lang`: `undefined` \| ``"en"`` \| ``"ja"``  }\>

#### Defined in

[libs/type.ts:117](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/type.ts#L117)

___

### blankPdf

• **blankPdf**: ``"data:application/pdf;base64,JVBERi0xLjcKJeLjz9MKNSAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDM4Cj4+CnN0cmVhbQp4nCvkMlAwUDC1NNUzMVGwMDHUszRSKErlCtfiyuMK5AIAXQ8GCgplbmRzdHJlYW0KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL01lZGlhQm94IFswIDAgNTk1LjQ0IDg0MS45Ml0KL1Jlc291cmNlcyA8PAo+PgovQ29udGVudHMgNSAwIFIKL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzQgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL3RyYXBwZWQgKGZhbHNlKQovQ3JlYXRvciAoU2VyaWYgQWZmaW5pdHkgRGVzaWduZXIgMS4xMC40KQovVGl0bGUgKFVudGl0bGVkLnBkZikKL0NyZWF0aW9uRGF0ZSAoRDoyMDIyMDEwNjE0MDg1OCswOScwMCcpCi9Qcm9kdWNlciAoaUxvdmVQREYpCi9Nb2REYXRlIChEOjIwMjIwMTA2MDUwOTA5WikKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL1NpemUgNwovUm9vdCAxIDAgUgovSW5mbyAzIDAgUgovSUQgWzwyODhCM0VENTAyOEU0MDcyNERBNzNCOUE0Nzk4OUEwQT4gPEY1RkJGNjg4NkVERDZBQUNBNDRCNEZDRjBBRDUxRDlDPl0KL1R5cGUgL1hSZWYKL1cgWzEgMiAyXQovRmlsdGVyIC9GbGF0ZURlY29kZQovSW5kZXggWzAgN10KL0xlbmd0aCAzNgo+PgpzdHJlYW0KeJxjYGD4/5+RUZmBgZHhFZBgDAGxakAEP5BgEmFgAABlRwQJCmVuZHN0cmVhbQplbmRvYmoKc3RhcnR4cmVmCjUzMgolJUVPRgo="``

#### Defined in

[libs/constants.ts:23](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/constants.ts#L23)

## Functions

### checkProps

▸ `Const` **checkProps**<`T`\>(`data`, `zodSchema`): `void`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `data` | `unknown` |
| `zodSchema` | `ZodType`<`T`, `ZodTypeDef`, `T`\> |

#### Returns

`void`

#### Defined in

[libs/helper.ts:179](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/libs/helper.ts#L179)

___

### generate

▸ `Const` **generate**(`props`): `Promise`<`Uint8Array`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `Object` |
| `props.inputs` | `Record`<`string`, `string`\>[] |
| `props.options` | `undefined` \| { font?: Record<string, { fallback?: boolean \| undefined; subset?: boolean \| undefined; data: string \| ArrayBuffer \| Uint8Array; }\> \| undefined; splitThreshold?: number \| undefined; } |
| `props.template` | `Object` |
| `props.template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `props.template.columns` | `undefined` \| `string`[] |
| `props.template.sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `props.template.schemas` | `Record`<`string`, { rotate?: number \| undefined; alignment?: "left" \| "center" \| "right" \| undefined; fontSize?: number \| undefined; fontName?: string \| undefined; fontColor?: string \| undefined; backgroundColor?: string \| undefined; ... 5 more ...; height: number; } \| { rotate?: number \| undefined; type: "image"; position: { x: number; y: number; }; width: number; height: number; } \| { rotate?: number \| undefined; type: "qrcode" \| "japanpost" \| "ean13" \| "ean8" \| "code39" \| "code128" \| "nw7" \| "itf14" \| "upca" \| "upce"; position: { x: number; y: number; }; width: number; height: number; }\>[] |

#### Returns

`Promise`<`Uint8Array`\>

#### Defined in

[generate.ts:39](https://github.com/hand-dot/pdfme-beta/blob/d84df91/src/generate.ts#L39)
