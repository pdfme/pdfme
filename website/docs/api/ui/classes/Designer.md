---
id: "Designer"
title: "Class: Designer"
sidebar_label: "Designer"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `BaseUIClass`

  ↳ **`Designer`**

## Constructors

### constructor

• **new Designer**(`props`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `Object` |
| `props.domContainer` | `HTMLElement` |
| `props.options?` | `Object` |
| `props.options.font?` | `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\> |
| `props.options.lang?` | ``"en"`` \| ``"ja"`` |
| `props.template` | `Object` |
| `props.template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `props.template.columns?` | `string`[] |
| `props.template.sampledata?` | `Record`<`string`, `string`\>[] |
| `props.template.schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Overrides

BaseUIClass.constructor

#### Defined in

[ui/src/Designer.tsx:14](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L14)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

BaseUIClass.domContainer

#### Defined in

[ui/src/class.ts:55](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L55)

___

### onChangeTemplateCallback

• `Private` `Optional` **onChangeTemplateCallback**: (`template`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns?`: `string`[] ; `sampledata?`: `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void`

#### Type declaration

▸ (`template`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `template` | `Object` |
| `template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `template.columns?` | `string`[] |
| `template.sampledata?` | `Record`<`string`, `string`\>[] |
| `template.schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

##### Returns

`void`

#### Defined in

[ui/src/Designer.tsx:12](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L12)

___

### onSaveTemplateCallback

• `Private` `Optional` **onSaveTemplateCallback**: (`template`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns?`: `string`[] ; `sampledata?`: `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void`

#### Type declaration

▸ (`template`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `template` | `Object` |
| `template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `template.columns?` | `string`[] |
| `template.sampledata?` | `Record`<`string`, `string`\>[] |
| `template.schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

##### Returns

`void`

#### Defined in

[ui/src/Designer.tsx:11](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L11)

___

### size

• `Protected` **size**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `height` | `number` |
| `width` | `number` |

#### Inherited from

BaseUIClass.size

#### Defined in

[ui/src/class.ts:59](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L59)

___

### template

• `Protected` **template**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `columns?` | `string`[] |
| `sampledata?` | `Record`<`string`, `string`\>[] |
| `schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Inherited from

BaseUIClass.template

#### Defined in

[ui/src/class.ts:57](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L57)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

BaseUIClass.destroy

#### Defined in

[ui/src/class.ts:127](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L127)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Inherited from

BaseUIClass.getFont

#### Defined in

[ui/src/class.ts:99](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L99)

___

### getI18n

▸ `Protected` **getI18n**(): (`key`: ``"field"`` \| ``"cancel"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsSelect"`` \| ``"plsInputName"`` \| ``"plsAddNewField"`` \| ``"fieldMustUniq"`` \| ``"notUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"type"`` \| ``"goToFirst"`` \| ``"goToPrevious"`` \| ``"goToNext"`` \| ``"goToEnd"`` \| ``"select"`` \| ``"errorOccurred"`` \| ``"errorBulkUpdateFieldName"`` \| ``"commitBulkUpdateFieldName"`` \| ``"bulkUpdateFieldName"``) => `string`

#### Returns

`fn`

▸ (`key`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `key` | ``"field"`` \| ``"cancel"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsSelect"`` \| ``"plsInputName"`` \| ``"plsAddNewField"`` \| ``"fieldMustUniq"`` \| ``"notUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"type"`` \| ``"goToFirst"`` \| ``"goToPrevious"`` \| ``"goToNext"`` \| ``"goToEnd"`` \| ``"select"`` \| ``"errorOccurred"`` \| ``"errorBulkUpdateFieldName"`` \| ``"commitBulkUpdateFieldName"`` \| ``"bulkUpdateFieldName"`` |

##### Returns

`string`

#### Inherited from

BaseUIClass.getI18n

#### Defined in

[ui/src/class.ts:95](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L95)

___

### getTemplate

▸ **getTemplate**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `columns?` | `string`[] |
| `sampledata?` | `Record`<`string`, `string`\>[] |
| `schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Inherited from

BaseUIClass.getTemplate

#### Defined in

[ui/src/class.ts:103](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L103)

___

### onChangeTemplate

▸ **onChangeTemplate**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`template`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns?`: `string`[] ; `sampledata?`: `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void` |

#### Returns

`void`

#### Defined in

[ui/src/Designer.tsx:41](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L41)

___

### onSaveTemplate

▸ **onSaveTemplate**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`template`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns?`: `string`[] ; `sampledata?`: `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void` |

#### Returns

`void`

#### Defined in

[ui/src/Designer.tsx:37](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L37)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

BaseUIClass.render

#### Defined in

[ui/src/Designer.tsx:45](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L45)

___

### saveTemplate

▸ **saveTemplate**(): `void`

#### Returns

`void`

#### Defined in

[ui/src/Designer.tsx:21](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L21)

___

### updateOptions

▸ **updateOptions**(`options`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.font?` | `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\> |
| `options.lang?` | ``"en"`` \| ``"ja"`` |

#### Returns

`void`

#### Inherited from

BaseUIClass.updateOptions

#### Defined in

[ui/src/class.ts:115](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/class.ts#L115)

___

### updateTemplate

▸ **updateTemplate**(`template`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `template` | `Object` |
| `template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `template.columns?` | `string`[] |
| `template.sampledata?` | `Record`<`string`, `string`\>[] |
| `template.schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Returns

`void`

#### Overrides

BaseUIClass.updateTemplate

#### Defined in

[ui/src/Designer.tsx:28](https://github.com/pdfme/pdfme/blob/908a9c6/packages/ui/src/Designer.tsx#L28)
