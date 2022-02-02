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

[ui/src/Designer.tsx:13](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L13)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

BaseUIClass.domContainer

#### Defined in

[ui/src/class.ts:54](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L54)

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

[ui/src/Designer.tsx:11](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L11)

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

[ui/src/Designer.tsx:10](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L10)

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

[ui/src/class.ts:58](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L58)

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

[ui/src/class.ts:56](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L56)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

BaseUIClass.destroy

#### Defined in

[ui/src/class.ts:114](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L114)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Inherited from

BaseUIClass.getFont

#### Defined in

[ui/src/class.ts:98](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L98)

___

### getI18n

▸ `Protected` **getI18n**(): (`key`: ``"field"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsSelect"`` \| ``"plsInputName"`` \| ``"plsAddNewField"`` \| ``"fieldMustUniq"`` \| ``"notUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"type"`` \| ``"previewWarnMsg"`` \| ``"previewErrMsg"`` \| ``"goToFirst"`` \| ``"goToPrevious"`` \| ``"goToNext"`` \| ``"goToEnd"`` \| ``"select"`` \| ``"errorOccurred"``) => `string`

#### Returns

`fn`

▸ (`key`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `key` | ``"field"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsSelect"`` \| ``"plsInputName"`` \| ``"plsAddNewField"`` \| ``"fieldMustUniq"`` \| ``"notUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"type"`` \| ``"previewWarnMsg"`` \| ``"previewErrMsg"`` \| ``"goToFirst"`` \| ``"goToPrevious"`` \| ``"goToNext"`` \| ``"goToEnd"`` \| ``"select"`` \| ``"errorOccurred"`` |

##### Returns

`string`

#### Inherited from

BaseUIClass.getI18n

#### Defined in

[ui/src/class.ts:94](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L94)

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

[ui/src/class.ts:102](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/class.ts#L102)

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

[ui/src/Designer.tsx:40](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L40)

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

[ui/src/Designer.tsx:36](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L36)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

BaseUIClass.render

#### Defined in

[ui/src/Designer.tsx:44](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L44)

___

### saveTemplate

▸ **saveTemplate**(): `void`

#### Returns

`void`

#### Defined in

[ui/src/Designer.tsx:20](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L20)

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

[ui/src/Designer.tsx:27](https://github.com/hand-dot/pdfme-beta/blob/910f06c/packages/ui/src/Designer.tsx#L27)
