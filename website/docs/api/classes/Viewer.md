---
id: "Viewer"
title: "Class: Viewer"
sidebar_label: "Viewer"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `PreviewUI`

  ↳ **`Viewer`**

## Constructors

### constructor

• **new Viewer**(`props`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `Object` |
| `props.domContainer` | `HTMLElement` |
| `props.inputs` | { [key: string]: `string`;  }[] |
| `props.options?` | `Object` |
| `props.options.font` | `undefined` \| `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\> |
| `props.options.lang` | `undefined` \| ``"en"`` \| ``"ja"`` |
| `props.template` | `Object` |
| `props.template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `props.template.columns` | `undefined` \| `string`[] |
| `props.template.sampledata` | `undefined` \| `Record`<`string`, `string`\>[] |
| `props.template.schemas` | `Record`<`string`, { `alignment`: `undefined` \| ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor`: `undefined` \| `string` ; `characterSpacing`: `undefined` \| `number` ; `fontColor`: `undefined` \| `string` ; `fontName`: `undefined` \| `string` ; `fontSize`: `undefined` \| `number` ; `height`: `number` ; `lineHeight`: `undefined` \| `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { x: number; y: number; } ; `rotate`: `undefined` \| `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Overrides

PreviewUI.constructor

#### Defined in

[Viewer.tsx:10](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/Viewer.tsx#L10)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

PreviewUI.domContainer

#### Defined in

[libs/class.ts:8](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L8)

___

### inputs

• `Protected` **inputs**: { [key: string]: `string`;  }[]

#### Inherited from

PreviewUI.inputs

#### Defined in

[libs/class.ts:78](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L78)

___

### size

• `Protected` **size**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `height` | `number` |
| `width` | `number` |

#### Inherited from

PreviewUI.size

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

PreviewUI.template

#### Defined in

[libs/class.ts:10](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L10)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

PreviewUI.destroy

#### Defined in

[libs/class.ts:68](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L68)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback`: `undefined` \| `boolean` ; `subset`: `undefined` \| `boolean`  }\>

#### Inherited from

PreviewUI.getFont

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

PreviewUI.getI18n

#### Defined in

[libs/class.ts:48](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L48)

___

### getInputs

▸ **getInputs**(): { [key: string]: `string`;  }[]

#### Returns

{ [key: string]: `string`;  }[]

#### Inherited from

PreviewUI.getInputs

#### Defined in

[libs/class.ts:88](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L88)

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

PreviewUI.getTemplate

#### Defined in

[libs/class.ts:56](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L56)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

PreviewUI.render

#### Defined in

[Viewer.tsx:19](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/Viewer.tsx#L19)

___

### setInputs

▸ **setInputs**(`inputs`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `inputs` | { [key: string]: `string`;  }[] |

#### Returns

`void`

#### Inherited from

PreviewUI.setInputs

#### Defined in

[libs/class.ts:94](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L94)

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

PreviewUI.updateTemplate

#### Defined in

[libs/class.ts:62](https://github.com/hand-dot/labelmake-ui/blob/4bfccb3/src/libs/class.ts#L62)
