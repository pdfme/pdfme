import PDFObject from '../objects/PDFObject.js';
import PDFNumber from '../objects/PDFNumber.js';
import PDFDict from '../objects/PDFDict.js';
import PDFName from '../objects/PDFName.js';
import PDFArray from '../objects/PDFArray.js';
import PDFRef from '../objects/PDFRef.js';

import PDFAcroField from './PDFAcroField.js';
import PDFAcroTerminal from './PDFAcroTerminal.js';
import PDFAcroNonTerminal from './PDFAcroNonTerminal.js';
import PDFAcroButton from './PDFAcroButton.js';
import PDFAcroSignature from './PDFAcroSignature.js';
import PDFAcroChoice from './PDFAcroChoice.js';
import PDFAcroText from './PDFAcroText.js';
import PDFAcroPushButton from './PDFAcroPushButton.js';
import PDFAcroRadioButton from './PDFAcroRadioButton.js';
import PDFAcroCheckBox from './PDFAcroCheckBox.js';
import PDFAcroComboBox from './PDFAcroComboBox.js';
import PDFAcroListBox from './PDFAcroListBox.js';
import { AcroButtonFlags, AcroChoiceFlags } from './flags.js';

export const createPDFAcroFields = (kidDicts?: PDFArray): [PDFAcroField, PDFRef][] => {
  if (!kidDicts) return [];

  const kids: [PDFAcroField, PDFRef][] = [];
  for (let idx = 0, len = kidDicts.size(); idx < len; idx++) {
    const ref = kidDicts.get(idx);
    const dict = kidDicts.lookup(idx);
    // if (dict instanceof PDFDict) kids.push(PDFAcroField.fromDict(dict));
    if (ref instanceof PDFRef && dict instanceof PDFDict) {
      kids.push([createPDFAcroField(dict, ref), ref]);
    }
  }

  return kids;
};

export const createPDFAcroField = (dict: PDFDict, ref: PDFRef): PDFAcroField => {
  const isNonTerminal = isNonTerminalAcroField(dict);
  if (isNonTerminal) return PDFAcroNonTerminal.fromDict(dict, ref);
  return createPDFAcroTerminal(dict, ref);
};

// TODO: Maybe just check if the dict is *not* a widget? That might be better.

// According to the PDF spec:
//
//   > A field's children in the hierarchy may also include widget annotations
//   > that define its appearance on the page. A field that has children that
//   > are fields is called a non-terminal field. A field that does not have
//   > children that are fields is called a terminal field.
//
// The spec is not entirely clear about how to determine whether a given
// dictionary represents an acrofield or a widget annotation. So we will assume
// that a dictionary is an acrofield if it is a member of the `/Kids` array
// and it contains a `/T` entry (widgets do not have `/T` entries). This isn't
// a bullet proof solution, because the `/T` entry is technically defined as
// optional for acrofields by the PDF spec. But in practice all acrofields seem
// to have a `/T` entry defined.
const isNonTerminalAcroField = (dict: PDFDict): boolean => {
  const kids = dict.lookup(PDFName.of('Kids'));

  if (kids instanceof PDFArray) {
    for (let idx = 0, len = kids.size(); idx < len; idx++) {
      const kid = kids.lookup(idx);
      const kidIsField = kid instanceof PDFDict && kid.has(PDFName.of('T'));
      if (kidIsField) return true;
    }
  }

  return false;
};

const createPDFAcroTerminal = (dict: PDFDict, ref: PDFRef): PDFAcroTerminal => {
  const ftNameOrRef = getInheritableAttribute(dict, PDFName.of('FT'));
  const type = dict.context.lookup(ftNameOrRef, PDFName);

  if (type === PDFName.of('Btn')) return createPDFAcroButton(dict, ref);
  if (type === PDFName.of('Ch')) return createPDFAcroChoice(dict, ref);
  if (type === PDFName.of('Tx')) return PDFAcroText.fromDict(dict, ref);
  if (type === PDFName.of('Sig')) return PDFAcroSignature.fromDict(dict, ref);

  // We should never reach this line. But there are a lot of weird PDFs out
  // there. So, just to be safe, we'll try to handle things gracefully instead
  // of throwing an error.
  return PDFAcroTerminal.fromDict(dict, ref);
};

const createPDFAcroButton = (dict: PDFDict, ref: PDFRef): PDFAcroButton => {
  const ffNumberOrRef = getInheritableAttribute(dict, PDFName.of('Ff'));
  const ffNumber = dict.context.lookupMaybe(ffNumberOrRef, PDFNumber);
  const flags = ffNumber?.asNumber() ?? 0;

  if (flagIsSet(flags, AcroButtonFlags.PushButton)) {
    return PDFAcroPushButton.fromDict(dict, ref);
  } else if (flagIsSet(flags, AcroButtonFlags.Radio)) {
    return PDFAcroRadioButton.fromDict(dict, ref);
  } else {
    return PDFAcroCheckBox.fromDict(dict, ref);
  }
};

const createPDFAcroChoice = (dict: PDFDict, ref: PDFRef): PDFAcroChoice => {
  const ffNumberOrRef = getInheritableAttribute(dict, PDFName.of('Ff'));
  const ffNumber = dict.context.lookupMaybe(ffNumberOrRef, PDFNumber);
  const flags = ffNumber?.asNumber() ?? 0;

  if (flagIsSet(flags, AcroChoiceFlags.Combo)) {
    return PDFAcroComboBox.fromDict(dict, ref);
  } else {
    return PDFAcroListBox.fromDict(dict, ref);
  }
};

const flagIsSet = (flags: number, flag: number): boolean => (flags & flag) !== 0;

const getInheritableAttribute = (startNode: PDFDict, name: PDFName) => {
  let attribute: PDFObject | undefined;
  ascend(startNode, (node) => {
    if (!attribute) attribute = node.get(name);
  });
  return attribute;
};

const ascend = (startNode: PDFDict, visitor: (node: PDFDict) => any) => {
  visitor(startNode);
  const Parent = startNode.lookupMaybe(PDFName.of('Parent'), PDFDict);
  if (Parent) ascend(Parent, visitor);
};
