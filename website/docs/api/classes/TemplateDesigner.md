---
id: "TemplateDesigner"
title: "Class: TemplateDesigner"
sidebar_label: "TemplateDesigner"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `BaseUIClass`

  ↳ **`TemplateDesigner`**

## Constructors

### constructor

• **new TemplateDesigner**(`props`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `Object` |
| `props.domContainer` | `HTMLElement` |
| `props.options?` | `Object` |
| `props.options.font` | `undefined` \| `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\> |
| `props.options.lang` | `undefined` \| ``"en"`` \| ``"ja"`` |
| `props.template` | `Object` |
| `props.template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `props.template.columns` | `undefined` \| `string`[] |
| `props.template.sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `props.template.schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |
| `props.saveTemplate` | (`t`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void` |

#### Overrides

BaseUIClass.constructor

#### Defined in

[TemplateDesigner.tsx:14](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/TemplateDesigner.tsx#L14)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

BaseUIClass.domContainer

#### Defined in

[libs/class.ts:8](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L8)

___

### onChangeTemplateCallback

• `Private` `Optional` **onChangeTemplateCallback**: (`t`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void`

#### Type declaration

▸ (`t`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `t` | `Object` |
| `t.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `t.columns` | `undefined` \| `string`[] |
| `t.sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `t.schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

##### Returns

`void`

#### Defined in

[TemplateDesigner.tsx:12](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/TemplateDesigner.tsx#L12)

___

### saveTemplateCallback

• `Private` **saveTemplateCallback**: (`t`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void`

#### Type declaration

▸ (`t`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `t` | `Object` |
| `t.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `t.columns` | `undefined` \| `string`[] |
| `t.sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `t.schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

##### Returns

`void`

#### Defined in

[TemplateDesigner.tsx:11](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/TemplateDesigner.tsx#L11)

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

[libs/class.ts:12](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L12)

___

### template

• `Protected` **template**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `columns` | `undefined` \| `string`[] |
| `sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Inherited from

BaseUIClass.template

#### Defined in

[libs/class.ts:10](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L10)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

BaseUIClass.destroy

#### Defined in

[libs/class.ts:68](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L68)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>

#### Inherited from

BaseUIClass.getFont

#### Defined in

[libs/class.ts:52](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L52)

___

### getI18n

▸ `Protected` **getI18n**(): (`key`: ``"type"`` \| ``"field"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsSelect"`` \| ``"plsInputName"`` \| ``"plsAddNewField"`` \| ``"fieldMustUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"previewWarnMsg"`` \| ``"previewErrMsg"`` \| ``"goToFirst"`` \| ``"goToPrevious"`` \| ``"goToNext"`` \| ``"goToEnd"`` \| ``"select"`` \| ``"errorOccurred"``) => `string`

#### Returns

`fn`

▸ (`key`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `key` | ``"type"`` \| ``"field"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsSelect"`` \| ``"plsInputName"`` \| ``"plsAddNewField"`` \| ``"fieldMustUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"previewWarnMsg"`` \| ``"previewErrMsg"`` \| ``"goToFirst"`` \| ``"goToPrevious"`` \| ``"goToNext"`` \| ``"goToEnd"`` \| ``"select"`` \| ``"errorOccurred"`` |

##### Returns

`string`

#### Inherited from

BaseUIClass.getI18n

#### Defined in

[libs/class.ts:48](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L48)

___

### getTemplate

▸ **getTemplate**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `columns` | `undefined` \| `string`[] |
| `sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Inherited from

BaseUIClass.getTemplate

#### Defined in

[libs/class.ts:56](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L56)

___

### onChangeTemplate

▸ **onChangeTemplate**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`t`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void` |

#### Returns

`void`

#### Defined in

[TemplateDesigner.tsx:32](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/TemplateDesigner.tsx#L32)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

BaseUIClass.render

#### Defined in

[TemplateDesigner.tsx:36](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/TemplateDesigner.tsx#L36)

___

### saveTemplate

▸ **saveTemplate**(): `void`

#### Returns

`void`

#### Defined in

[TemplateDesigner.tsx:27](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/TemplateDesigner.tsx#L27)

___

### updateTemplate

▸ **updateTemplate**(`template`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `template` | `Object` |
| `template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `template.columns` | `undefined` \| `string`[] |
| `template.sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `template.schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Returns

`void`

#### Inherited from

BaseUIClass.updateTemplate

#### Defined in

[libs/class.ts:62](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L62)
