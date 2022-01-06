import { StandardFonts } from 'pdf-lib';
import ean8 from '../assets/barcodeExamples/ean8.png';
import ean13 from '../assets/barcodeExamples/ean13.png';
import code39 from '../assets/barcodeExamples/code39.png';
import code128 from '../assets/barcodeExamples/code128.png';
import nw7 from '../assets/barcodeExamples/nw7.png';
import itf14 from '../assets/barcodeExamples/itf14.png';
import japanpost from '../assets/barcodeExamples/japanpost.png';
import qrcode from '../assets/barcodeExamples/qrcode.png';
import upca from '../assets/barcodeExamples/upca.png';
import upce from '../assets/barcodeExamples/upce.png';
import _imageExample from '../assets/imageExample.png';
import { BarCodeType, Lang } from './type';

// TODO: 小文字と大文字が混在している。inputTypeList,barcodeListは本当に必要か考える
// 本当に使い回すような定数以外が入っているがおかしい

export const destroyedErrMsg = 'this instance is already destroyed';

export const TOOL_NAME = 'pdfme (https://github.com/hand-dot/pdfme)' as const;

export const DEFAULT_FONT_NAME = StandardFonts.Helvetica as string;

export const DEFAULT_LANG: Lang = 'en' as const;

export const DEFAULT_FONT_SIZE = 13;
export const DEFAULT_ALIGNMENT = 'left';
export const DEFAULT_LINE_HEIGHT = 1;
export const DEFAULT_CHARACTER_SPACING = 0;

export const zoom = 3.7795275591;

export const rulerHeight = 30;

export const selectableClassName = 'selectable';

export const imageExample = _imageExample;

export const barcodeExampleImageObj: { [key: string]: string } = {
  qrcode,
  japanpost,
  ean13,
  ean8,
  code39,
  code128,
  nw7,
  itf14,
  upca,
  upce,
};

export const barcodeList: BarCodeType[] = [
  'qrcode',
  'ean13',
  'ean8',
  'japanpost',
  'code39',
  'code128',
  'nw7',
  'itf14',
  'upca',
  'upce',
];

export const inputTypeList = ['text', 'image'].concat(barcodeList);

export const blankPdf =
  'data:application/pdf;base64,JVBERi0xLjcKJeLjz9MKNSAwIG9iago8PAovRmlsdGVyIC9GbGF0ZURlY29kZQovTGVuZ3RoIDM4Cj4+CnN0cmVhbQp4nCvkMlAwUDC1NNUzMVGwMDHUszRSKErlCtfiyuMK5AIAXQ8GCgplbmRzdHJlYW0KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL01lZGlhQm94IFswIDAgNTk1LjQ0IDg0MS45Ml0KL1Jlc291cmNlcyA8PAo+PgovQ29udGVudHMgNSAwIFIKL1BhcmVudCAyIDAgUgo+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgWzQgMCBSXQovQ291bnQgMQo+PgplbmRvYmoKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL3RyYXBwZWQgKGZhbHNlKQovQ3JlYXRvciAoU2VyaWYgQWZmaW5pdHkgRGVzaWduZXIgMS4xMC40KQovVGl0bGUgKFVudGl0bGVkLnBkZikKL0NyZWF0aW9uRGF0ZSAoRDoyMDIyMDEwNjE0MDg1OCswOScwMCcpCi9Qcm9kdWNlciAoaUxvdmVQREYpCi9Nb2REYXRlIChEOjIwMjIwMTA2MDUwOTA5WikKPj4KZW5kb2JqCjYgMCBvYmoKPDwKL1NpemUgNwovUm9vdCAxIDAgUgovSW5mbyAzIDAgUgovSUQgWzwyODhCM0VENTAyOEU0MDcyNERBNzNCOUE0Nzk4OUEwQT4gPEY1RkJGNjg4NkVERDZBQUNBNDRCNEZDRjBBRDUxRDlDPl0KL1R5cGUgL1hSZWYKL1cgWzEgMiAyXQovRmlsdGVyIC9GbGF0ZURlY29kZQovSW5kZXggWzAgN10KL0xlbmd0aCAzNgo+PgpzdHJlYW0KeJxjYGD4/5+RUZmBgZHhFZBgDAGxakAEP5BgEmFgAABlRwQJCmVuZHN0cmVhbQplbmRvYmoKc3RhcnR4cmVmCjUzMgolJUVPRgo=';
