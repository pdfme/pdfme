---
id: "Form"
title: "Class: Form"
sidebar_label: "Form"
sidebar_position: 0
custom_edit_url: null
---

## Hierarchy

- `PreviewUI`

  ↳ **`Form`**

## Constructors

### constructor

• **new Form**(`props`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | `Object` |
| `props.domContainer` | `HTMLElement` |
| `props.inputs` | `Record`<`string`, `string`\>[] |
| `props.options?` | `Object` |
| `props.options.font?` | `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\> |
| `props.options.lang?` | ``"en"`` \| ``"ja"`` |
| `props.template` | `Object` |
| `props.template.basePdf` | `string` \| `ArrayBuffer` \| `Uint8Array` |
| `props.template.columns?` | `string`[] |
| `props.template.sampledata?` | `Record`<`string`, `string`\>[] |
| `props.template.schemas` | `Record`<`string`, { `alignment?`: ``"left"`` \| ``"center"`` \| ``"right"`` ; `backgroundColor?`: `string` ; `characterSpacing?`: `number` ; `fontColor?`: `string` ; `fontName?`: `string` ; `fontSize?`: `number` ; `height`: `number` ; `lineHeight?`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"text"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"image"`` ; `width`: `number`  } \| { `height`: `number` ; `position`: { `x`: `number` ; `y`: `number`  } ; `rotate?`: `number` ; `type`: ``"qrcode"`` \| ``"japanpost"`` \| ``"ean13"`` \| ``"ean8"`` \| ``"code39"`` \| ``"code128"`` \| ``"nw7"`` \| ``"itf14"`` \| ``"upca"`` \| ``"upce"`` ; `width`: `number`  }\>[] |

#### Overrides

PreviewUI.constructor

#### Defined in

[ui/src/Form.tsx:12](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/Form.tsx#L12)

## Properties

### domContainer

• `Protected` **domContainer**: ``null`` \| `HTMLElement`

#### Inherited from

PreviewUI.domContainer

#### Defined in

[ui/src/class.ts:54](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L54)

___

### inputs

• `Protected` **inputs**: { [key: string]: `string`;  }[]

#### Inherited from

PreviewUI.inputs

#### Defined in

[ui/src/class.ts:124](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L124)

___

### onChangeInputCallback

• `Private` `Optional` **onChangeInputCallback**: (`arg`: { `index`: `number` ; `key`: `string` ; `value`: `string`  }) => `void`

#### Type declaration

▸ (`arg`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `arg` | `Object` |
| `arg.index` | `number` |
| `arg.key` | `string` |
| `arg.value` | `string` |

##### Returns

`void`

#### Defined in

[ui/src/Form.tsx:10](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/Form.tsx#L10)

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

[ui/src/class.ts:58](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L58)

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

PreviewUI.template

#### Defined in

[ui/src/class.ts:56](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L56)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Inherited from

PreviewUI.destroy

#### Defined in

[ui/src/class.ts:114](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L114)

___

### getFont

▸ `Protected` **getFont**(): `Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Returns

`Record`<`string`, { `data`: `ArrayBuffer` \| `Uint8Array` ; `fallback?`: `boolean` ; `subset?`: `boolean`  }\>

#### Inherited from

PreviewUI.getFont

#### Defined in

[ui/src/class.ts:98](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L98)

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

PreviewUI.getI18n

#### Defined in

[ui/src/class.ts:94](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L94)

___

### getInputs

▸ **getInputs**(): { [key: string]: `string`;  }[]

#### Returns

{ [key: string]: `string`;  }[]

#### Inherited from

PreviewUI.getInputs

#### Defined in

[ui/src/class.ts:133](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L133)

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

PreviewUI.getTemplate

#### Defined in

[ui/src/class.ts:102](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L102)

___

### onChangeInput

▸ **onChangeInput**(`cb`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `cb` | (`arg`: { `index`: `number` ; `key`: `string` ; `value`: `string`  }) => `void` |

#### Returns

`void`

#### Defined in

[ui/src/Form.tsx:17](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/Form.tsx#L17)

___

### render

▸ `Protected` **render**(): `void`

#### Returns

`void`

#### Overrides

PreviewUI.render

#### Defined in

[ui/src/Form.tsx:21](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/Form.tsx#L21)

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

[ui/src/class.ts:139](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L139)

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

#### Inherited from

PreviewUI.updateTemplate

#### Defined in

[ui/src/class.ts:108](https://github.com/pdfme/pdfme/blob/8c98b46/packages/ui/src/class.ts#L108)
