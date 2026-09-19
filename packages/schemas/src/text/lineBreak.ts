/**
 * UAX #14 pair-table engine (foliojs linebreak algorithm) plus a UCD class
 * lookup. foliojs `linebreak` is not a runtime dependency: its published
 * package loads the class trie via Node `fs` / brfs, which is unacceptable
 * for the browser Viewer path. The pair table and LB1/LB8a/LB21a/LB30a
 * handling below follow foliojs/linebreak (MIT); classes come from a
 * UCD-generated range table (LineBreak.txt).
 *
 * LB1 remaps used here:
 *   AI, SA, SG, XX → AL
 *   CJ → NS  (CSS `line-break: strict` / Japanese kinsoku starters)
 *
 * SA (Thai / Lao / Khmer) is remapped to AL for the pair table, then wrap.ts
 * injects extra break opportunities from `Intl.Segmenter` word dictionaries.
 */

import { LINE_BREAK_RANGE_COUNT, LINE_BREAK_RANGE_DATA } from './lineBreakClasses.generated.js';

export const OP = 0;
export const CL = 1;
export const CP = 2;
export const QU = 3;
export const GL = 4;
export const NS = 5;
export const EX = 6;
export const SY = 7;
export const IS = 8;
export const PR = 9;
export const PO = 10;
export const NU = 11;
export const AL = 12;
export const HL = 13;
export const ID = 14;
export const IN = 15;
export const HY = 16;
export const BA = 17;
export const BB = 18;
export const B2 = 19;
export const ZW = 20;
export const CM = 21;
export const WJ = 22;
export const H2 = 23;
export const H3 = 24;
export const JL = 25;
export const JV = 26;
export const JT = 27;
export const RI = 28;
export const EB = 29;
export const EM = 30;
export const ZWJ = 31;
export const CB = 32;
export const AI = 33;
export const BK = 34;
export const CJ = 35;
export const CR = 36;
export const LF = 37;
export const NL = 38;
export const SA = 39;
export const SG = 40;
export const SP = 41;
export const XX = 42;

const DI_BRK = 0;
const IN_BRK = 1;
const CI_BRK = 2;
const CP_BRK = 3;
const PR_BRK = 4;

// foliojs/linebreak pair table (UAX #14 example Table 2 + LB8a / LB20 / LB22).
const PAIR_TABLE: number[][] = [
  [
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    CP_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    PR_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    IN_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    IN_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
  [
    DI_BRK,
    PR_BRK,
    PR_BRK,
    IN_BRK,
    IN_BRK,
    DI_BRK,
    PR_BRK,
    PR_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    PR_BRK,
    CI_BRK,
    PR_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    DI_BRK,
    IN_BRK,
    DI_BRK,
  ],
];

export type LineBreakOpportunity = {
  position: number;
  required: boolean;
};

export const getRawLineBreakClass = (codePoint: number): number => {
  let low = 0;
  let high = LINE_BREAK_RANGE_COUNT - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const offset = mid * 3;
    const start = LINE_BREAK_RANGE_DATA[offset];
    const end = LINE_BREAK_RANGE_DATA[offset + 1];
    if (codePoint < start) {
      high = mid - 1;
    } else if (codePoint > end) {
      low = mid + 1;
    } else {
      return LINE_BREAK_RANGE_DATA[offset + 2];
    }
  }
  return XX;
};

const mapClass = (lineBreakClass: number): number => {
  switch (lineBreakClass) {
    case AI:
    case SA:
    case SG:
    case XX:
      return AL;
    case CJ:
      return NS;
    default:
      return lineBreakClass;
  }
};

const mapFirst = (lineBreakClass: number): number => {
  switch (lineBreakClass) {
    case LF:
    case NL:
      return BK;
    case SP:
      return WJ;
    default:
      return lineBreakClass;
  }
};

const nextCodePoint = (text: string, index: { value: number }): number => {
  const code = text.charCodeAt(index.value++);
  const next = text.charCodeAt(index.value);
  if (code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
    index.value += 1;
    return (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000;
  }
  return code;
};

/**
 * UAX #14 break opportunities using the foliojs pair-table engine.
 * Positions are string indexes (UTF-16) at the start of the next unit.
 */
export const collectUax14Breaks = (text: string): LineBreakOpportunity[] => {
  const breaks: LineBreakOpportunity[] = [];
  const index = { value: 0 };
  let lastPos = 0;
  let curClass: number | null = null;
  let nextClass = 0;
  let lb8a = false;
  let lb21a = false;
  let lb30a = 0;

  const nextCharClass = () => mapClass(getRawLineBreakClass(nextCodePoint(text, index)));

  const getSimpleBreak = (): boolean | null => {
    switch (nextClass) {
      case SP:
        return false;
      case BK:
      case LF:
      case NL:
        curClass = BK;
        return false;
      case CR:
        curClass = CR;
        return false;
      default:
        return null;
    }
  };

  const getPairTableBreak = (lastClass: number): boolean => {
    if (curClass === null) return false;
    const pairRow = PAIR_TABLE[curClass];
    const pair = pairRow ? pairRow[nextClass] : undefined;
    let shouldBreak = false;

    switch (pair) {
      case DI_BRK:
        shouldBreak = true;
        break;
      case IN_BRK:
        shouldBreak = lastClass === SP;
        break;
      case CI_BRK:
        shouldBreak = lastClass === SP;
        if (!shouldBreak) {
          return false;
        }
        break;
      case CP_BRK:
        if (lastClass !== SP) {
          return false;
        }
        break;
      case PR_BRK:
        break;
      default:
        shouldBreak = true;
        break;
    }

    if (lb8a) {
      shouldBreak = false;
    }

    if (lb21a && (curClass === HY || curClass === BA)) {
      shouldBreak = false;
      lb21a = false;
    } else {
      lb21a = curClass === HL;
    }

    if (curClass === RI) {
      lb30a += 1;
      if (lb30a === 2 && nextClass === RI) {
        shouldBreak = true;
        lb30a = 0;
      }
    } else {
      lb30a = 0;
    }

    curClass = nextClass;
    return shouldBreak;
  };

  if (text.length === 0) {
    return [{ position: 0, required: true }];
  }

  const firstClass = nextCharClass();
  curClass = mapFirst(firstClass);
  nextClass = firstClass;
  lb8a = firstClass === ZWJ;

  while (index.value < text.length) {
    lastPos = index.value;
    const lastClass = nextClass;
    nextClass = nextCharClass();

    if (curClass === BK || (curClass === CR && nextClass !== LF)) {
      curClass = mapFirst(mapClass(nextClass));
      breaks.push({ position: lastPos, required: true });
      continue;
    }

    let shouldBreak = getSimpleBreak();
    if (shouldBreak === null) {
      shouldBreak = getPairTableBreak(lastClass);
    }

    lb8a = nextClass === ZWJ;

    if (shouldBreak) {
      breaks.push({ position: lastPos, required: false });
    }
  }

  breaks.push({ position: text.length, required: true });
  return breaks;
};

export const isSaCodePoint = (codePoint: number): boolean => getRawLineBreakClass(codePoint) === SA;
