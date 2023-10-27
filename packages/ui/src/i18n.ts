import { Lang } from '@pdfme/common';

type DictEn = typeof dictEn;

const dictEn = {
  cancel: 'Cancel',
  field: 'field',
  fieldName: 'Name',
  require: 'Required',
  uniq: 'Unique',
  edit: 'Edit',
  plsInputName: 'Please input name',
  fieldMustUniq: 'Name of field is not unique',
  notUniq: '(Not unique name)',
  noKeyName: 'No name',
  fieldsList: 'Field List',
  addNewField: 'Add new field',
  editField: 'Edit Field',
  type: 'Type',
  errorOccurred: 'An error occurred',
  errorBulkUpdateFieldName:
    'Cannot commit the change because the number of items has been changed.',
  commitBulkUpdateFieldName: 'Commit Changes',
  bulkUpdateFieldName: 'Bulk update field names',
  barColor: 'Bar Color',
  textColor: 'Text Color',
  bgColor: 'Background Color',
};

const dictJa: { [key in keyof DictEn]: string } = {
  cancel: 'キャンセル',
  field: '入力項目',
  fieldName: '項目名',
  require: '必須',
  uniq: '他の項目名と同一不可',
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
  barColor: 'バーの色',
  textColor: 'テキストの色',
  bgColor: '背景色',
};

const dictAr: { [key in keyof DictEn]: string } = {
  cancel: 'إلغاء',
  field: 'الحقل',
  fieldName: 'اسم الحقل',
  require: 'مطلوب',
  uniq: 'يجب أن يكون فريداً',
  edit: 'تعديل',
  plsInputName: 'الرجاء إدخال الاسم',
  fieldMustUniq: 'يجب أن يكون الحقل فريداً',
  notUniq: '(غير فريد)',
  noKeyName: 'لا يوجد اسم للحقل',
  fieldsList: 'قائمة الحقول',
  addNewField: 'إضافة حقل جديد',
  editField: 'تعديل الحقل',
  type: 'النوع',
  errorOccurred: 'حدث خطأ',
  errorBulkUpdateFieldName: 'لا يمكن تنفيذ التغيير لأنه تم تغيير عدد العناصر.',
  commitBulkUpdateFieldName: 'تنفيذ التغييرات',
  bulkUpdateFieldName: 'تغيير الأسماء',
  barColor: 'لون الشريط',
  textColor: 'لون الخط',
  bgColor: 'لون الخلفية',
};

const dictTh: { [key in keyof DictEn]: string } = {
  cancel: 'ยกเลิก',
  field: 'ฟิลด์',
  fieldName: 'ชื่อฟิลด์',
  require: 'จำเป็น',
  uniq: 'ต้องไม่ซ้ำกัน',
  edit: 'แก้ไข',
  plsInputName: 'กรุณาใส่ชื่อ',
  fieldMustUniq: 'ชื่อฟิลด์ต้องไม่ซ้ำกัน',
  notUniq: '(ชื่อฟิลด์ซ้ำกัน)',
  noKeyName: 'ไม่มีชื่อ',
  fieldsList: 'รายการฟิลด์ทั้งหมด',
  addNewField: 'เพิ่มฟิลด์ใหม่',
  editField: 'แก้ไขฟิลด์',
  type: 'ประเภท',
  errorOccurred: 'เกิดข้อผิดพลาด',
  errorBulkUpdateFieldName: 'ไม่สามารถยืนยันการแก้ไขได้เนื่องจากจำนวนรายการมีการเปลี่ยนแปลง',
  commitBulkUpdateFieldName: 'ยืนยันการแก้ไข',
  bulkUpdateFieldName: 'แก้ไขชื่อฟิลด์เป็นชุด',
  barColor: 'สีบาร์',
  textColor: 'สีข้อความ',
  bgColor: 'สีพื้นหลัง',
};

const dictIt: { [key in keyof DictEn]: string } = {
  cancel: 'Annulla',
  field: 'Campo',
  fieldName: 'Nome',
  require: 'Richiesto',
  uniq: 'Univoco',
  edit: 'Modifica',
  plsInputName: 'Inserisci il nome per favore',
  fieldMustUniq: 'Il nome del campo non è univoco',
  notUniq: '(Nome non univoco)',
  noKeyName: 'Nessun nome',
  fieldsList: 'Lista campi',
  addNewField: 'Aggiungi un campo',
  editField: 'Modifica campo',
  type: 'Tipo',
  errorOccurred: 'Riscontrato errore',
  errorBulkUpdateFieldName:
    'Non è possibile salvare le modifiche perché il numero di elementi è cambiato.',
  commitBulkUpdateFieldName: 'Salva cambiamenti',
  bulkUpdateFieldName: 'Modifica nomi campi in blocco',
  barColor: 'Colore barra',
  textColor: 'Colore testo',
  bgColor: 'Colore sfondo',
};

const dictPl: { [key in keyof DictEn]: string } = {
  cancel: 'Anuluj',
  field: 'pole',
  fieldName: 'Klucz pola',
  require: 'wymagany',
  uniq: 'unikalny',
  edit: 'Edytuj',
  plsInputName: 'Wymagane wprowadzenie klucza pola',
  fieldMustUniq: 'Klucz pola nie jest unikalny',
  notUniq: '(Klucz pola nie jest unikalny)',
  noKeyName: 'Brak nazwy klucza pola',
  fieldsList: 'Lista pól',
  addNewField: 'Dodaj nowe pole',
  editField: 'Edytuj pole',
  type: 'Typ pola',
  errorOccurred: 'Wystąpił błąd',
  errorBulkUpdateFieldName: 'Nie można wprowadzić zmian ponieważ liczba elementów uległa zmianie.',
  commitBulkUpdateFieldName: 'Zaakceptuj zmiany',
  bulkUpdateFieldName: 'Masowo aktualizuj klucze pól',
  barColor: 'Kolor paska',
  textColor: 'Kolor tekstu',
  bgColor: 'Kolor tła',
};

const i18n = (lang: Lang, key: keyof DictEn) => {
  switch (lang) {
    case 'pl':
      return dictPl[key];
    case 'th':
      return dictTh[key];

    case 'ar':
      return dictAr[key];

    case 'ja':
      return dictJa[key];

    case 'it':
      return dictIt[key];

    default:
      return dictEn[key];
  }
};

export const curriedI18n = (lang: Lang) => (key: keyof DictEn) => i18n(lang, key);
