import { Lang } from '@pdfme/common';
import { DEFAULT_LANG } from './constants';

type DictEn = typeof dictEn;

const dictEn = {
  cancel: 'Cancel',
  field: 'field',
  fieldName: 'Name',
  require: 'Required',
  uniq: 'Unique',
  inputExample: 'Input Example',
  edit: 'Edit',
  plsInputName: 'Please input name',
  fieldMustUniq: 'Name of field is not unique',
  notUniq: '(Not unique name)',
  noKeyName: 'No name',
  fieldsList: 'List of Fields',
  addNewField: 'Add new field',
  editField: 'Edit Field',
  type: 'Type',
  errorOccurred: 'An error occurred',
  errorBulkUpdateFieldName:
    'Cannot commit the change because the number of items has been changed.',
  commitBulkUpdateFieldName: 'Commit Changes',
  bulkUpdateFieldName: 'Bulk update field names',
};

const dictJa: { [key in keyof DictEn]: string } = {
  cancel: 'キャンセル',
  field: '入力項目',
  fieldName: '項目名',
  require: '必須',
  uniq: '他の項目名と同一不可',
  inputExample: '記入例',
  edit: '編集する',
  plsInputName: '項目名を入力してください',
  fieldMustUniq: '他の入力項目名と被っています',
  notUniq: '(他の項目名と重複しています)',
  noKeyName: '項目名なし',
  fieldsList: '入力項目一覧',
  addNewField: '入力項目を追加',
  editField: '入力項目を編集',
  type: 'タイプ',
  errorOccurred: 'エラーが発生しました',
  errorBulkUpdateFieldName: '項目数が変更されているため変更をコミットできません。',
  commitBulkUpdateFieldName: '変更を反映',
  bulkUpdateFieldName: '項目名を一括変更',
};

const i18n = (lang: Lang, key: keyof DictEn) => (lang === DEFAULT_LANG ? dictEn[key] : dictJa[key]);

export const curriedI18n = (lang: Lang) => (key: keyof DictEn) => i18n(lang, key);
