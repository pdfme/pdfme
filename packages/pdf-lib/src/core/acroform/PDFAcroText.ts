import PDFContext from '../PDFContext.js';
import PDFDict from '../objects/PDFDict.js';
import PDFNumber from '../objects/PDFNumber.js';
import PDFString from '../objects/PDFString.js';
import PDFHexString from '../objects/PDFHexString.js';
import PDFName from '../objects/PDFName.js';
import PDFRef from '../objects/PDFRef.js';
import PDFAcroTerminal from './PDFAcroTerminal.js';

class PDFAcroText extends PDFAcroTerminal {
  static fromDict = (dict: PDFDict, ref: PDFRef) => new PDFAcroText(dict, ref);

  static create = (context: PDFContext) => {
    const dict = context.obj({
      FT: 'Tx',
      Kids: [],
    });
    const ref = context.register(dict);
    return new PDFAcroText(dict, ref);
  };

  MaxLen(): PDFNumber | undefined {
    const maxLen = this.dict.lookup(PDFName.of('MaxLen'));
    if (maxLen instanceof PDFNumber) return maxLen;
    return undefined;
  }

  Q(): PDFNumber | undefined {
    const q = this.dict.lookup(PDFName.of('Q'));
    if (q instanceof PDFNumber) return q;
    return undefined;
  }

  setMaxLength(maxLength: number) {
    this.dict.set(PDFName.of('MaxLen'), PDFNumber.of(maxLength));
  }

  removeMaxLength() {
    this.dict.delete(PDFName.of('MaxLen'));
  }

  getMaxLength(): number | undefined {
    return this.MaxLen()?.asNumber();
  }

  setQuadding(quadding: 0 | 1 | 2) {
    this.dict.set(PDFName.of('Q'), PDFNumber.of(quadding));
  }

  getQuadding(): number | undefined {
    return this.Q()?.asNumber();
  }

  setValue(value: PDFHexString | PDFString) {
    this.dict.set(PDFName.of('V'), value);

    // const widgets = this.getWidgets();
    // for (let idx = 0, len = widgets.length; idx < len; idx++) {
    //   const widget = widgets[idx];
    //   const state = widget.getOnValue() === value ? value : PDFName.of('Off');
    //   widget.setAppearanceState(state);
    // }
  }

  removeValue() {
    this.dict.delete(PDFName.of('V'));
  }

  getValue(): PDFString | PDFHexString | undefined {
    const v = this.V();
    if (v instanceof PDFString || v instanceof PDFHexString) return v;
    return undefined;
  }
}

export default PDFAcroText;
