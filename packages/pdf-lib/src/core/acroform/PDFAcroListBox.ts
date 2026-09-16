import PDFDict from '../objects/PDFDict.js';
import PDFAcroChoice from './PDFAcroChoice.js';
import PDFContext from '../PDFContext.js';
import PDFRef from '../objects/PDFRef.js';

class PDFAcroListBox extends PDFAcroChoice {
  static fromDict = (dict: PDFDict, ref: PDFRef) => new PDFAcroListBox(dict, ref);

  static create = (context: PDFContext) => {
    const dict = context.obj({
      FT: 'Ch',
      Kids: [],
    });
    const ref = context.register(dict);
    return new PDFAcroListBox(dict, ref);
  };
}

export default PDFAcroListBox;
