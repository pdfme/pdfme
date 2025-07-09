import * as acorn from 'acorn';
import type { Node as AcornNode, Identifier, Property } from 'estree';
import type { SchemaPageArray } from './types.js';

const expressionCache = new Map<string, (context: Record<string, unknown>) => unknown>();
const parseDataCache = new Map<string, Record<string, unknown>>();

const parseData = (data: Record<string, unknown>): Record<string, unknown> => {
  const key = JSON.stringify(data);
  if (parseDataCache.has(key)) {
    return parseDataCache.get(key)!;
  }

  const parsed = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (typeof value === 'string') {
        try {
          const parsedValue = JSON.parse(value) as unknown;
          return [key, parsedValue];
        } catch {
          return [key, value];
        }
      }
      return [key, value];
    }),
  );

  parseDataCache.set(key, parsed);
  return parsed;
};

const padZero = (num: number): string => String(num).padStart(2, '0');

const formatDate = (date: Date): string =>
  `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}`;

const formatDateTime = (date: Date): string =>
  `${formatDate(date)} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;

// Safe assign function that prevents prototype pollution
const safeAssign = (
  target: Record<string, unknown>,
  ...sources: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> => {
  if (target == null) {
    throw new TypeError('Cannot convert undefined or null to object');
  }
  
  const to = { ...target };
  
  for (const source of sources) {
    if (source != null) {
      for (const key in source) {
        // Skip prototype pollution keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          continue;
        }
        // Only copy own properties
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          to[key] = source[key];
        }
      }
    }
  }
  
  return to;
};

// Create a safe copy of Object with dangerous methods excluded
const safeObject = {
  keys: Object.keys,
  values: Object.values,
  entries: Object.entries,
  fromEntries: Object.fromEntries,
  is: Object.is,
  hasOwnProperty: Object.hasOwnProperty,
  assign: safeAssign, // Safe version of Object.assign
  // The following methods are excluded due to security concerns:
  // - Side effects: create, freeze, seal (can still be used for attacks)
  // - Prototype access: getOwnPropertyDescriptor, getPrototypeOf, setPrototypeOf,
  //   defineProperty, defineProperties, getOwnPropertyNames, getOwnPropertySymbols
};

const allowedGlobals: Record<string, unknown> = {
  Math,
  String,
  Number,
  Boolean,
  Array,
  Object: safeObject,
  Date,
  JSON,
  isNaN,
  parseFloat,
  parseInt,
  decodeURI,
  decodeURIComponent,
  encodeURI,
  encodeURIComponent,
};

const validateAST = (node: AcornNode): void => {
  switch (node.type) {
    case 'Literal':
    case 'Identifier':
      break;
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const binaryNode = node;
      validateAST(binaryNode.left);
      validateAST(binaryNode.right);
      break;
    }
    case 'UnaryExpression': {
      const unaryNode = node;
      validateAST(unaryNode.argument);
      break;
    }
    case 'ConditionalExpression': {
      const condNode = node;
      validateAST(condNode.test);
      validateAST(condNode.consequent);
      validateAST(condNode.alternate);
      break;
    }
    case 'MemberExpression': {
      const memberNode = node;
      validateAST(memberNode.object);
      if (memberNode.computed) {
        validateAST(memberNode.property);
      } else {
        const propName = (memberNode.property as Identifier).name;
        if (['constructor', '__proto__', 'prototype'].includes(propName)) {
          throw new Error('Access to prohibited property');
        }
        // Block prototype pollution methods
        if (['__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'].includes(propName)) {
          throw new Error(`Access to prohibited method: ${propName}`);
        }
        const prohibitedMethods = ['toLocaleString', 'valueOf'];
        if (typeof propName === 'string' && prohibitedMethods.includes(propName)) {
          throw new Error(`Access to prohibited method: ${propName}`);
        }
      }
      break;
    }
    case 'CallExpression': {
      const callNode = node;
      validateAST(callNode.callee);
      callNode.arguments.forEach(validateAST);
      break;
    }
    case 'ArrayExpression': {
      const arrayNode = node;
      arrayNode.elements.forEach((elem) => {
        if (elem) validateAST(elem);
      });
      break;
    }
    case 'ObjectExpression': {
      const objectNode = node;
      objectNode.properties.forEach((prop) => {
        const propNode = prop as Property;
        validateAST(propNode.key);
        validateAST(propNode.value);
      });
      break;
    }
    case 'ArrowFunctionExpression': {
      const arrowFuncNode = node;
      arrowFuncNode.params.forEach((param) => {
        if (param.type !== 'Identifier') {
          throw new Error('Only identifier parameters are supported in arrow functions');
        }
        validateAST(param);
      });
      validateAST(arrowFuncNode.body);
      break;
    }
    default:
      throw new Error(`Unsupported syntax in placeholder: ${node.type}`);
  }
};

const evaluateAST = (node: AcornNode, context: Record<string, unknown>): unknown => {
  switch (node.type) {
    case 'Literal': {
      const literalNode = node;
      return literalNode.value;
    }
    case 'Identifier': {
      const idNode = node;
      if (Object.prototype.hasOwnProperty.call(context, idNode.name)) {
        return context[idNode.name];
      } else if (Object.prototype.hasOwnProperty.call(allowedGlobals, idNode.name)) {
        return allowedGlobals[idNode.name];
      } else {
        throw new Error(`Undefined variable: ${idNode.name}`);
      }
    }
    case 'BinaryExpression': {
      const binaryNode = node;
      const left = evaluateAST(binaryNode.left, context) as number;
      const right = evaluateAST(binaryNode.right, context) as number;
      switch (binaryNode.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '%':
          return left % right;
        case '**':
          return left ** right;
        case '==':
          return left == right;
        case '!=':
          return left != right;
        case '===':
          return left === right;
        case '!==':
          return left !== right;
        case '<':
          return left < right;
        case '>':
          return left > right;
        case '<=':
          return left <= right;
        case '>=':
          return left >= right;
        default:
          throw new Error(`Unsupported operator: ${binaryNode.operator}`);
      }
    }
    case 'LogicalExpression': {
      const logicalNode = node;
      const leftLogical = evaluateAST(logicalNode.left, context);
      const rightLogical = evaluateAST(logicalNode.right, context);
      switch (logicalNode.operator) {
        case '&&':
          return leftLogical && rightLogical;
        case '||':
          return leftLogical || rightLogical;
        default:
          throw new Error(`Unsupported operator: ${logicalNode.operator}`);
      }
    }
    case 'UnaryExpression': {
      const unaryNode = node;
      const arg = evaluateAST(unaryNode.argument, context) as number;
      switch (unaryNode.operator) {
        case '+':
          return +arg;
        case '-':
          return -arg;
        case '!':
          return !arg;
        default:
          throw new Error(`Unsupported operator: ${unaryNode.operator}`);
      }
    }
    case 'ConditionalExpression': {
      const condNode = node;
      const test = evaluateAST(condNode.test, context);
      return test
        ? evaluateAST(condNode.consequent, context)
        : evaluateAST(condNode.alternate, context);
    }
    case 'MemberExpression': {
      const memberNode = node;
      const obj = evaluateAST(memberNode.object, context) as Record<string, unknown>;
      let prop: string | number;
      if (memberNode.computed) {
        prop = evaluateAST(memberNode.property, context) as string | number;
      } else {
        prop = (memberNode.property as Identifier).name;
      }
      if (typeof prop === 'string' || typeof prop === 'number') {
        if (typeof prop === 'string' && ['constructor', '__proto__', 'prototype'].includes(prop)) {
          throw new Error('Access to prohibited property');
        }
        // Block prototype pollution methods
        if (typeof prop === 'string' && ['__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'].includes(prop)) {
          throw new Error(`Access to prohibited method: ${prop}`);
        }
        return obj[prop];
      } else {
        throw new Error('Invalid property access');
      }
    }
    case 'CallExpression': {
      const callNode = node;
      const callee = evaluateAST(callNode.callee, context);
      const args = callNode.arguments.map((argNode) => evaluateAST(argNode, context));
      if (typeof callee === 'function') {
        if (callNode.callee.type === 'MemberExpression') {
          const memberExpr = callNode.callee;
          const obj = evaluateAST(memberExpr.object, context);
          if (
            obj !== null &&
            (typeof obj === 'object' ||
              typeof obj === 'number' ||
              typeof obj === 'string' ||
              typeof obj === 'boolean')
          ) {
            return callee.call(obj, ...args);
          } else {
            throw new Error('Invalid object in member function call');
          }
        } else {
          // Use a type assertion to tell TypeScript this is a safe function call
          return (callee as (...args: unknown[]) => unknown)(...args);
        }
      } else {
        throw new Error('Attempted to call a non-function');
      }
    }
    case 'ArrowFunctionExpression': {
      const arrowFuncNode = node;
      const params = arrowFuncNode.params.map((param) => (param as Identifier).name);
      const body = arrowFuncNode.body;

      return (...args: unknown[]) => {
        const newContext = { ...context };
        params.forEach((param, index) => {
          newContext[param] = args[index];
        });
        return evaluateAST(body, newContext);
      };
    }
    case 'ArrayExpression': {
      const arrayNode = node;
      return arrayNode.elements.map((elem) => (elem ? evaluateAST(elem, context) : null));
    }
    case 'ObjectExpression': {
      const objectNode = node;
      const objResult: Record<string, unknown> = {};
      objectNode.properties.forEach((prop) => {
        const propNode = prop as Property;
        let key: string;
        if (propNode.key.type === 'Identifier') {
          key = propNode.key.name;
        } else {
          const evaluatedKey = evaluateAST(propNode.key, context);
          if (typeof evaluatedKey !== 'string' && typeof evaluatedKey !== 'number') {
            throw new Error('Object property keys must be strings or numbers');
          }
          key = String(evaluatedKey);
        }
        const value = evaluateAST(propNode.value, context);
        objResult[key] = value;
      });
      return objResult;
    }
    default:
      throw new Error(`Unsupported syntax in placeholder: ${node.type}`);
  }
};

const evaluatePlaceholders = (arg: {
  content: string;
  context: Record<string, unknown>;
}): string => {
  const { content, context } = arg;

  let resultContent = '';
  let index = 0;

  while (index < content.length) {
    const startIndex = content.indexOf('{', index);
    if (startIndex === -1) {
      resultContent += content.slice(index);
      break;
    }

    resultContent += content.slice(index, startIndex);
    let braceCount = 1;
    let endIndex = startIndex + 1;

    while (endIndex < content.length && braceCount > 0) {
      if (content[endIndex] === '{') {
        braceCount++;
      } else if (content[endIndex] === '}') {
        braceCount--;
      }
      endIndex++;
    }

    if (braceCount === 0) {
      const code = content.slice(startIndex + 1, endIndex - 1).trim();

      if (expressionCache.has(code)) {
        const evalFunc = expressionCache.get(code)!;
        try {
          const value = evalFunc(context);
          resultContent += String(value);
        } catch {
          resultContent += content.slice(startIndex, endIndex);
        }
      } else {
        try {
          const ast = acorn.parseExpressionAt(code, 0, { ecmaVersion: 'latest' }) as AcornNode;
          validateAST(ast);
          const evalFunc = (ctx: Record<string, unknown>) => evaluateAST(ast, ctx);
          expressionCache.set(code, evalFunc);
          const value = evalFunc(context);
          resultContent += String(value);
        } catch {
          resultContent += content.slice(startIndex, endIndex);
        }
      }

      index = endIndex;
    } else {
      throw new Error('Invalid placeholder');
    }
  }

  return resultContent;
};

export const replacePlaceholders = (arg: {
  content: string;
  variables: Record<string, unknown>;
  schemas: SchemaPageArray;
}): string => {
  const { content, variables, schemas } = arg;
  if (!content || typeof content !== 'string' || !content.includes('{') || !content.includes('}')) {
    return content;
  }

  const date = new Date();
  const formattedDate = formatDate(date);
  const formattedDateTime = formatDateTime(date);

  const data = {
    ...Object.fromEntries(
      schemas.flat().map((schema) => [schema.name, schema.readOnly ? schema.content || '' : '']),
    ),
    ...variables,
  };
  const parsedInput = parseData(data);

  const context: Record<string, unknown> = {
    date: formattedDate,
    dateTime: formattedDateTime,
    ...parsedInput,
  };

  Object.entries(context).forEach(([key, value]) => {
    if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
      context[key] = evaluatePlaceholders({ content: value, context });
    }
  });

  return evaluatePlaceholders({ content, context });
};
