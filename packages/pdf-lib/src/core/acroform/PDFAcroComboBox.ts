import PDFDict from '../objects/PDFDict.js';
import PDFAcroChoice from './PDFAcroChoice.js';
import PDFContext from '../PDFContext.js';
import PDFRef from '../objects/PDFRef.js';
import { AcroChoiceFlags } from './flags.js';

class PDFAcroComboBox extends PDFAcroChoice {
  static fromDict = (dict: PDFDict, ref: PDFRef) => new PDFAcroComboBox(dict, ref);

  static create = (context: PDFContext) => {
    const dict = context.obj({
      FT: 'Ch',
      Ff: AcroChoiceFlags.Combo,
      Kids: [],
    });
    const ref = context.register(dict);
    return new PDFAcroComboBox(dict, ref);
  };
}

export default PDFAcroComboBox;
