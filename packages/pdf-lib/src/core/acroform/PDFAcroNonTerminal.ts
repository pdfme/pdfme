import PDFDict from '../objects/PDFDict.js';
import PDFRef from '../objects/PDFRef.js';
import PDFName from '../objects/PDFName.js';
import PDFContext from '../PDFContext.js';
import PDFAcroField from './PDFAcroField.js';

class PDFAcroNonTerminal extends PDFAcroField {
  static fromDict = (dict: PDFDict, ref: PDFRef) => new PDFAcroNonTerminal(dict, ref);

  static create = (context: PDFContext) => {
    const dict = context.obj({});
    const ref = context.register(dict);
    return new PDFAcroNonTerminal(dict, ref);
  };

  addField(field: PDFRef) {
    const { Kids } = this.normalizedEntries();
    Kids?.push(field);
  }

  normalizedEntries() {
    let Kids = this.Kids();

    if (!Kids) {
      Kids = this.dict.context.obj([]);
      this.dict.set(PDFName.of('Kids'), Kids);
    }

    return { Kids };
  }
}

export default PDFAcroNonTerminal;
