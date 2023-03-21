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
| `props.inputs` | `Record`<`string`, `string`\>[] |
| `props.options?` | `Object` |
| `props.options.font?` | `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\> |
| `props.options.lang?` | ``"en"`` \| ``"ja"`` |
| `props.template` | `Object` |
| `props.template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `props.template.columns?` | `string`[] |
| `props.template.sampledata?` | `Record`<`string`, `string`\>[] |
| `props.template.schemas` | `Record`<`string`, { `alignment?`: ``"center"`` \| ``"left"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Overrides

PreviewUI.constructor

#### Defined in

[ui/src/Viewer.tsx:10](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/Viewer.tsx#L10)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

PreviewUI.domContainer

#### Defined in

[ui/src/class.ts:58](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L58)

___

### inputs

• `Protected` **inputs**: { [key: string]: `string`;  }[]

#### Inherited from

PreviewUI.inputs

#### Defined in

[ui/src/class.ts:146](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L146)

___

### resizeObserver

• **resizeObserver**: `ResizeObserver`

#### Inherited from

PreviewUI.resizeObserver

#### Defined in

[ui/src/class.ts:77](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L77)

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

[ui/src/class.ts:62](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L62)

___

### template

• `Protected` **template**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `columns?` | `string`[] |
| `sampledata?` | `Record`<`string`, `string`\>[] |
| `schemas` | `Record`<`string`, { `alignment?`: ``"center"`` \| ``"left"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Inherited from

PreviewUI.template

#### Defined in

[ui/src/class.ts:60](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L60)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

PreviewUI.destroy

#### Defined in

[ui/src/class.ts:135](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L135)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Inherited from

PreviewUI.getFont

#### Defined in

[ui/src/class.ts:104](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L104)

___

### getI18n

▸ `Protected` **getI18n**(): (`key`: ``"field"`` \| ``"cancel"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsInputName"`` \| ``"fieldMustUniq"`` \| ``"notUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"type"`` \| ``"errorOccurred"`` \| ``"errorBulkUpdateFieldName"`` \| ``"commitBulkUpdateFieldName"`` \| ``"bulkUpdateFieldName"``) => `string`

#### Returns

`fn`

▸ (`key`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `key` | ``"field"`` \| ``"cancel"`` \| ``"fieldName"`` \| ``"require"`` \| ``"uniq"`` \| ``"inputExample"`` \| ``"edit"`` \| ``"plsInputName"`` \| ``"fieldMustUniq"`` \| ``"notUniq"`` \| ``"noKeyName"`` \| ``"fieldsList"`` \| ``"addNewField"`` \| ``"editField"`` \| ``"type"`` \| ``"errorOccurred"`` \| ``"errorBulkUpdateFieldName"`` \| ``"commitBulkUpdateFieldName"`` \| ``"bulkUpdateFieldName"`` |

##### Returns

`string`

#### Inherited from

PreviewUI.getI18n

#### Defined in

[ui/src/class.ts:100](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L100)

___

### getInputs

▸ **getInputs**(): { [key: string]: `string`;  }[]

#### Returns

{ [key: string]: `string`;  }[]

#### Inherited from

PreviewUI.getInputs

#### Defined in

[ui/src/class.ts:155](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L155)

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
| `schemas` | `Record`<`string`, { `alignment?`: ``"center"`` \| ``"left"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Inherited from

PreviewUI.getTemplate

#### Defined in

[ui/src/class.ts:108](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L108)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

PreviewUI.render

#### Defined in

[ui/src/Viewer.tsx:15](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/Viewer.tsx#L15)

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

[ui/src/class.ts:161](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L161)

___

### updateOptions

▸ **updateOptions**(`options`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Object` |
| `options.font?` | `Record`<`string`, { `data`: `string` \| `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\> |
| `options.lang?` | ``"en"`` \| ``"ja"`` |

#### Returns

`void`

#### Inherited from

PreviewUI.updateOptions

#### Defined in

[ui/src/class.ts:122](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L122)

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
| `template.schemas` | `Record`<`string`, { `alignment?`: ``"center"`` \| ``"left"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Returns

`void`

#### Inherited from

PreviewUI.updateTemplate

#### Defined in

[ui/src/class.ts:114](https://github.com/pdfme/pdfme/blob/77445ea/packages/ui/src/class.ts#L114)
