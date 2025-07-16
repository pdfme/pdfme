import PDFDict from '../objects/PDFDict.js';
import PDFRef from '../objects/PDFRef.js';
import PDFAcroTerminal from './PDFAcroTerminal.js';

class PDFAcroSignature extends PDFAcroTerminal {
  static fromDict = (dict: PDFDict, ref: PDFRef) => new PDFAcroSignature(dict, ref);
}

export default PDFAcroSignature;
