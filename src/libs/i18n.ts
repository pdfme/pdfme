import { Lang } from './type';
import { DEFAULT_LANG } from './constants';

type DictEn = typeof dictEn;

const dictEn = {
  field: 'field',
  fieldName: 'Name',
  requireAndUniq: 'Required+Unique',
  posAndSize: 'Position,Size',
  style: 'Style',
  inputExample: 'Input Example',
  edit: 'Edit',
  plsSelect: 'Please select',
  plsInputName: 'Please input name',
  plsAddNewField: 'Please add new field',
  fieldMustUniq: 'Name of field is not unique',
  noKeyName: 'No name',
  fieldsList: 'List of Fields',
  addNewField: 'Add new field',
  editField: 'Edit Field',
  type: 'Type',
  previewWarnMsg: 'Preview is not available on iOS devices.',
  previewErrMsg:
    'An error occurred during the PDF creation process. (Characters that are not in the Helvetica font are not available)',
  goToFirst: 'Go to first',
  goToPrevious: 'Back',
  goToNext: 'Next',
  goToEnd: 'Go to end',
  select: 'Select',
};

const dictJa: { [key in keyof DictEn]: string } = {
  field: '入力項目',
  fieldName: '項目名',
  requireAndUniq: '必須+他の項目名と同一不可',
  posAndSize: '位置,サイズ',
  style: 'スタイル',
  inputExample: '記入例',
  edit: '編集する',
  plsSelect: '選択してください',
  plsInputName: '項目名を入力してください',
  plsAddNewField: '入力項目を追加してください',
  fieldMustUniq: '他の入力項目名と被っています',
  noKeyName: '項目名なし',
  fieldsList: '入力項目一覧',
  addNewField: '入力項目を追加',
  editField: '入力項目を編集',
  type: 'タイプ',
  previewWarnMsg: 'iOS端末ではプレビューができません。',
  previewErrMsg:
    'PDF作成処理でエラーが発生しました。お手数ですがコンタクトからお問い合わせください。',
  goToFirst: '最初に戻る',
  goToPrevious: '1つ戻る',
  goToNext: '1つ進む',
  goToEnd: '最後に進む',
  select: '選択',
};

const i18n = (lang: Lang, key: keyof DictEn) => (lang === DEFAULT_LANG ? dictEn[key] : dictJa[key]);

export const curriedI18n = (lang: Lang) => (key: keyof DictEn) => i18n(lang, key);
