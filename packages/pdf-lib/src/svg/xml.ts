/**
 * A tiny XML/SVG parser.
 *
 * The renderer runs in environments that may not have a DOM (Node, workers,
 * headless browsers), so SVG markup is parsed into a minimal node tree that
 * exposes exactly the surface the converter needs: `nodeName`, `nodeValue`,
 * `nodeType`, `attributes`, `childNodes`, `parentNode`, `id`, `classList`,
 * `textContent`, `getAttribute`, `getElementById` and `getElementsByTagName`.
 */

export const ELEMENT_NODE = 1;
export const TEXT_NODE = 3;
export const CDATA_SECTION_NODE = 4;

export class SvgNode {
  error: boolean;
  nodeName: string | null;
  nodeValue: string | null;
  nodeType: number;
  attributes: Record<string, string>;
  childNodes: SvgNode[];
  parentNode: SvgNode | null;
  id: string;
  textContent: string;
  classList: string[];

  constructor(tag: string | null, type: number, value: string | null, error: boolean) {
    this.error = error;
    this.nodeName = tag;
    this.nodeValue = value;
    this.nodeType = type;
    this.attributes = Object.create(null);
    this.childNodes = [];
    this.parentNode = null;
    this.id = '';
    this.textContent = '';
    this.classList = [];
  }

  getAttribute(attr: string): string | null {
    return this.attributes[attr] != null ? this.attributes[attr] : null;
  }

  getElementById(id: string): SvgNode | null {
    let result: SvgNode | null = null;
    const visit = (node: SvgNode): void => {
      if (result) return;
      if (node.nodeType !== ELEMENT_NODE) return;
      if (node.id === id) result = node;
      for (const child of node.childNodes) visit(child);
    };
    visit(this);
    return result;
  }

  getElementsByTagName(tag: string): SvgNode[] {
    const result: SvgNode[] = [];
    const visit = (node: SvgNode): void => {
      if (node.nodeType !== ELEMENT_NODE) return;
      if (node.nodeName === tag) result.push(node);
      for (const child of node.childNodes) visit(child);
    };
    visit(this);
    return result;
  }
}

/** Regex-based cursor over a string, used by the XML and value parsers. */
export class StringParser {
  private str: string;

  constructor(str: string) {
    this.str = str;
  }

  match(exp: RegExp, all = false): RegExpMatchArray | string | undefined {
    const temp = this.str.match(exp);
    if (!temp || temp.index !== 0) return undefined;
    this.str = this.str.substring(temp[0].length);
    return all ? temp : temp[0];
  }

  matchSeparator(): string | undefined {
    return this.match(/^(?:\s*,\s*|\s*|)/) as string | undefined;
  }

  matchSpace(): string | undefined {
    return this.match(/^(?:\s*)/) as string | undefined;
  }

  matchLengthUnit(): string | undefined {
    return this.match(/^(?:px|pt|cm|mm|in|pc|em|ex|%|)/) as string | undefined;
  }

  matchNumber(): string | undefined {
    return this.match(
      /^(?:[-+]?(?:[0-9]+[.][0-9]+|[0-9]+[.]|[.][0-9]+|[0-9]+)(?:[eE][-+]?[0-9]+)?)/,
    ) as string | undefined;
  }

  matchAll(): string | undefined {
    return this.match(/^[\s\S]+/) as string | undefined;
  }
}

const ENTITIES: Record<string, number> = {
  quot: 34,
  amp: 38,
  lt: 60,
  gt: 62,
  apos: 39,
  OElig: 338,
  oelig: 339,
  Scaron: 352,
  scaron: 353,
  Yuml: 376,
  circ: 710,
  tilde: 732,
  ensp: 8194,
  emsp: 8195,
  thinsp: 8201,
  zwnj: 8204,
  zwj: 8205,
  lrm: 8206,
  rlm: 8207,
  ndash: 8211,
  mdash: 8212,
  lsquo: 8216,
  rsquo: 8217,
  sbquo: 8218,
  ldquo: 8220,
  rdquo: 8221,
  bdquo: 8222,
  dagger: 8224,
  Dagger: 8225,
  permil: 8240,
  lsaquo: 8249,
  rsaquo: 8250,
  euro: 8364,
  nbsp: 160,
  iexcl: 161,
  cent: 162,
  pound: 163,
  curren: 164,
  yen: 165,
  brvbar: 166,
  sect: 167,
  uml: 168,
  copy: 169,
  ordf: 170,
  laquo: 171,
  not: 172,
  shy: 173,
  reg: 174,
  macr: 175,
  deg: 176,
  plusmn: 177,
  sup2: 178,
  sup3: 179,
  acute: 180,
  micro: 181,
  para: 182,
  middot: 183,
  cedil: 184,
  sup1: 185,
  ordm: 186,
  raquo: 187,
  frac14: 188,
  frac12: 189,
  frac34: 190,
  iquest: 191,
  Agrave: 192,
  Aacute: 193,
  Acirc: 194,
  Atilde: 195,
  Auml: 196,
  Aring: 197,
  AElig: 198,
  Ccedil: 199,
  Egrave: 200,
  Eacute: 201,
  Ecirc: 202,
  Euml: 203,
  Igrave: 204,
  Iacute: 205,
  Icirc: 206,
  Iuml: 207,
  ETH: 208,
  Ntilde: 209,
  Ograve: 210,
  Oacute: 211,
  Ocirc: 212,
  Otilde: 213,
  Ouml: 214,
  times: 215,
  Oslash: 216,
  Ugrave: 217,
  Uacute: 218,
  Ucirc: 219,
  Uuml: 220,
  Yacute: 221,
  THORN: 222,
  szlig: 223,
  agrave: 224,
  aacute: 225,
  acirc: 226,
  atilde: 227,
  auml: 228,
  aring: 229,
  aelig: 230,
  ccedil: 231,
  egrave: 232,
  eacute: 233,
  ecirc: 234,
  euml: 235,
  igrave: 236,
  iacute: 237,
  icirc: 238,
  iuml: 239,
  eth: 240,
  ntilde: 241,
  ograve: 242,
  oacute: 243,
  ocirc: 244,
  otilde: 245,
  ouml: 246,
  divide: 247,
  oslash: 248,
  ugrave: 249,
  uacute: 250,
  ucirc: 251,
  uuml: 252,
  yacute: 253,
  thorn: 254,
  yuml: 255,
  fnof: 402,
  Alpha: 913,
  Beta: 914,
  Gamma: 915,
  Delta: 916,
  Epsilon: 917,
  Zeta: 918,
  Eta: 919,
  Theta: 920,
  Iota: 921,
  Kappa: 922,
  Lambda: 923,
  Mu: 924,
  Nu: 925,
  Xi: 926,
  Omicron: 927,
  Pi: 928,
  Rho: 929,
  Sigma: 931,
  Tau: 932,
  Upsilon: 933,
  Phi: 934,
  Chi: 935,
  Psi: 936,
  Omega: 937,
  alpha: 945,
  beta: 946,
  gamma: 947,
  delta: 948,
  epsilon: 949,
  zeta: 950,
  eta: 951,
  theta: 952,
  iota: 953,
  kappa: 954,
  lambda: 955,
  mu: 956,
  nu: 957,
  xi: 958,
  omicron: 959,
  pi: 960,
  rho: 961,
  sigmaf: 962,
  sigma: 963,
  tau: 964,
  upsilon: 965,
  phi: 966,
  chi: 967,
  psi: 968,
  omega: 969,
  thetasym: 977,
  upsih: 978,
  piv: 982,
  bull: 8226,
  hellip: 8230,
  prime: 8242,
  Prime: 8243,
  oline: 8254,
  frasl: 8260,
  weierp: 8472,
  image: 8465,
  real: 8476,
  trade: 8482,
  alefsym: 8501,
  larr: 8592,
  uarr: 8593,
  rarr: 8594,
  darr: 8595,
  harr: 8596,
  crarr: 8629,
  lArr: 8656,
  uArr: 8657,
  rArr: 8658,
  dArr: 8659,
  hArr: 8660,
  forall: 8704,
  part: 8706,
  exist: 8707,
  empty: 8709,
  nabla: 8711,
  isin: 8712,
  notin: 8713,
  ni: 8715,
  prod: 8719,
  sum: 8721,
  minus: 8722,
  lowast: 8727,
  radic: 8730,
  prop: 8733,
  infin: 8734,
  ang: 8736,
  and: 8743,
  or: 8744,
  cap: 8745,
  cup: 8746,
  int: 8747,
  there4: 8756,
  sim: 8764,
  cong: 8773,
  asymp: 8776,
  ne: 8800,
  equiv: 8801,
  le: 8804,
  ge: 8805,
  sub: 8834,
  sup: 8835,
  nsub: 8836,
  sube: 8838,
  supe: 8839,
  oplus: 8853,
  otimes: 8855,
  perp: 8869,
  sdot: 8901,
  lceil: 8968,
  rceil: 8969,
  lfloor: 8970,
  rfloor: 8971,
  lang: 9001,
  rang: 9002,
  loz: 9674,
  spades: 9824,
  clubs: 9827,
  hearts: 9829,
  diams: 9830,
};

export function decodeEntities(str: string): string {
  return str.replace(
    /&(?:#([0-9]+)|#[xX]([0-9A-Fa-f]+)|([0-9A-Za-z]+));/g,
    (match, dec, hex, name) => {
      if (dec) return String.fromCharCode(parseInt(dec, 10));
      if (hex) return String.fromCharCode(parseInt(hex, 16));
      if (name && ENTITIES[name]) return String.fromCharCode(ENTITIES[name]);
      return match;
    },
  );
}

export type WarningCallback = (message: string, error?: unknown) => void;

/** Parse an SVG document string into a node tree. */
export function parseXml(xml: string, warningCallback: WarningCallback): SvgNode | null {
  const parser = new StringParser(xml.trim());
  let error = false;

  const parseNode = (): SvgNode | null => {
    let temp: RegExpMatchArray | string | undefined;
    if ((temp = parser.match(/^<([\w:.-]+)\s*/, true))) {
      const node = new SvgNode((temp as RegExpMatchArray)[1], ELEMENT_NODE, null, error);
      while ((temp = parser.match(/^([\w:.-]+)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?\s*/, true))) {
        const match = temp as RegExpMatchArray;
        const attr = match[1];
        const value = decodeEntities(match[2] || match[3] || '');
        if (!node.attributes[attr]) {
          node.attributes[attr] = value;
          if (attr === 'id') node.id = value;
          if (attr === 'class') node.classList = value.split(' ');
        } else {
          warningCallback(`parseXml: duplicate attribute "${attr}"`);
          error = true;
        }
      }
      if (parser.match(/^>/)) {
        let child: SvgNode | null;
        while ((child = parseNode())) {
          node.childNodes.push(child);
          child.parentNode = node;
          if (child.nodeType === TEXT_NODE || child.nodeType === CDATA_SECTION_NODE) {
            node.textContent += child.nodeValue;
          } else {
            node.textContent += child.textContent;
          }
        }
        if ((temp = parser.match(/^<\/([\w:.-]+)\s*>/, true))) {
          const closing = (temp as RegExpMatchArray)[1];
          if (closing === node.nodeName) return node;
          warningCallback(
            `parseXml: tag not matching, opening "${node.nodeName}" & closing "${closing}"`,
          );
          error = true;
          return node;
        }
        warningCallback(`parseXml: tag not matching, opening "${node.nodeName}" & not closing`);
        error = true;
        return node;
      }
      if (parser.match(/^\/>/)) return node;
      warningCallback(`parseXml: tag could not be parsed "${node.nodeName}"`);
      error = true;
      return null;
    }
    if ((temp = parser.match(/^<!--[\s\S]*?-->/))) {
      return new SvgNode(null, 8, temp as string, error);
    }
    if ((temp = parser.match(/^<\?[\s\S]*?\?>/))) {
      return new SvgNode(null, 7, temp as string, error);
    }
    if ((temp = parser.match(/^<!DOCTYPE[^<[]+?\[[\s\S]*?\]>/))) {
      return new SvgNode(null, 10, temp as string, error);
    }
    if ((temp = parser.match(/^<!DOCTYPE\s*([\s\S]*?)>/))) {
      return new SvgNode(null, 10, temp as string, error);
    }
    if ((temp = parser.match(/^<!\[CDATA\[([\s\S]*?)\]\]>/, true))) {
      return new SvgNode(
        '#cdata-section',
        CDATA_SECTION_NODE,
        (temp as RegExpMatchArray)[1],
        error,
      );
    }
    if ((temp = parser.match(/^([^<]+)/, true))) {
      return new SvgNode('#text', TEXT_NODE, decodeEntities((temp as RegExpMatchArray)[1]), error);
    }
    return null;
  };

  let result: SvgNode | null = null;
  let child: SvgNode | null;
  while ((child = parseNode())) {
    if (child.nodeType === ELEMENT_NODE && !result) {
      result = child;
    } else if (
      child.nodeType === ELEMENT_NODE ||
      (child.nodeType === TEXT_NODE && child.nodeValue!.trim() !== '')
    ) {
      warningCallback('parseXml: data after document end has been discarded');
    }
  }
  if (parser.matchAll()) warningCallback('parseXml: parsing error');
  return result;
}
