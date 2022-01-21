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
| `props` | `CommonConstructor` |

#### Overrides

BaseUIClass.constructor

#### Defined in

[Designer.tsx:14](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L14)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

BaseUIClass.domContainer

#### Defined in

[libs/class.ts:19](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L19)

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

[Designer.tsx:12](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L12)

___

### onSaveTemplateCallback

• `Private` `Optional` **onSaveTemplateCallback**: (`t`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void`

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

[Designer.tsx:11](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L11)

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

[libs/class.ts:23](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L23)

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

[libs/class.ts:21](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L21)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

BaseUIClass.destroy

#### Defined in

[libs/class.ts:79](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L79)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>

#### Inherited from

BaseUIClass.getFont

#### Defined in

[libs/class.ts:63](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L63)

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

[libs/class.ts:59](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L59)

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

[libs/class.ts:67](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L67)

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

[Designer.tsx:32](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L32)

___

### onSaveTemplate

▸ **onSaveTemplate**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`t`: { `basePdf`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `columns`: `undefined` \| `string`[] ; `sampledata`: `undefined` \| `Record`<`string`, `string`\>[] ; `schemas`: `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[]  }) => `void` |

#### Returns

`void`

#### Defined in

[Designer.tsx:28](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L28)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

BaseUIClass.render

#### Defined in

[Designer.tsx:36](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L36)

___

### saveTemplate

▸ **saveTemplate**(): `void`

#### Returns

`void`

#### Defined in

[Designer.tsx:21](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/Designer.tsx#L21)

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

[libs/class.ts:73](https://github.com/hand-dot/labelmake-ui/blob/56180ca/src/libs/class.ts#L73)
