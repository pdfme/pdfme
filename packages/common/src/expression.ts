import * as acorn from 'acorn';
import type { Node as AcornNode, Identifier, CallExpression, Property } from 'estree';
import type { SchemaPageArray } from './types';

const parseData = (data: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
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
    })
  );

const padZero = (num: number): string => String(num).padStart(2, '0');

const formatDate = (date: Date): string =>
  `${date.getFullYear()}/${padZero(date.getMonth() + 1)}/${padZero(date.getDate())}`;

const formatDateTime = (date: Date): string =>
  `${formatDate(date)} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;

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
      const code = content.slice(startIndex + 1, endIndex - 1);
      try {
        // Parse the code using Acorn
        const ast = acorn.parseExpressionAt(code, 0, {
          ecmaVersion: 'latest',
          locations: false,
          ranges: false,
        }) as AcornNode;
        // Validate the AST
        validateAST(ast);
        // Evaluate the AST
        const value = evaluateAST(ast, context);
        resultContent += String(value);
      } catch (e) {
        if (e instanceof Error) {
          console.log('content', content);
          console.log('context', context);
          throw new Error(`Replace placeholder failed: ${e.message}`);
        } else {
          throw new Error('Invalid placeholder');
        }
      }
      index = endIndex;
    } else {
      throw new Error('Invalid placeholder');
    }
  }

  return resultContent;
};

// Allowed global objects and functions
const allowedGlobals: Record<string, unknown> = {
  Math,
  String,
  Number,
  Boolean,
  Array,
  Object,
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

// Validate the AST to ensure only safe code is executed
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
        // Prevent access to dangerous properties
        const propName = (memberNode.property as Identifier).name;
        if (['constructor', '__proto__', 'prototype'].includes(propName)) {
          throw new Error('Access to prohibited property');
        }
      }
      break;
    }
    case 'CallExpression': {
      const callNode = node as CallExpression;
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
      // Validate parameters
      arrowFuncNode.params.forEach((param) => {
        if (param.type !== 'Identifier') {
          throw new Error('Only identifier parameters are supported in arrow functions');
        }
        validateAST(param);
      });
      // Validate body
      validateAST(arrowFuncNode.body);
      break;
    }
    default:
      throw new Error(`Unsupported syntax in placeholder: ${node.type}`);
  }
};

// Evaluate the AST in a safe context
const evaluateAST = (node: AcornNode, context: Record<string, unknown>): unknown => {
  switch (node.type) {
    case 'Literal': {
      const literalNode = node;
      return literalNode.value;
    }
    case 'Identifier': {
      const idNode = node;
      if (context.hasOwnProperty(idNode.name)) {
        return context[idNode.name];
      } else if (allowedGlobals.hasOwnProperty(idNode.name)) {
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
        // Prevent access to dangerous properties
        if (['constructor', '__proto__', 'prototype'].includes(String(prop))) {
          throw new Error('Access to prohibited property');
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
        // メンバー関数の場合は this をバインド
        if (callNode.callee.type === 'MemberExpression') {
          const memberExpr = callNode.callee;
          const obj = evaluateAST(memberExpr.object, context);
          if (obj && typeof obj === 'object') {
            return callee.apply(obj, args);
          } else {
            throw new Error('Invalid object in member function call');
          }
        } else {
          return callee(...args);
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
        if (params.length !== args.length) {
          throw new Error('Incorrect number of arguments in function call');
        }
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
        const key =
          propNode.key.type === 'Identifier'
            ? propNode.key.name
            : evaluateAST(propNode.key, context);
        const value = evaluateAST(propNode.value, context);
        // @ts-ignore
        objResult[key] = value;
      });
      return objResult;
    }
    default:
      throw new Error(`Unsupported syntax in placeholder: ${node.type}`);
  }
};

export const replacePlaceholders = (arg: {
  content: string;
  variables: Record<string, any>;
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
      schemas.flat().map((schema) => [schema.name, schema.readOnly ? schema.content || '' : ''])
    ),
    ...variables,
  };
  const parsedInput = parseData(data);

  const context: Record<string, unknown> = {
    date: formattedDate,
    dateTime: formattedDateTime,
    ...parsedInput,
  };

  // Process nested placeholders in variables
  Object.entries(context).forEach(([key, value]) => {
    if (typeof value === 'string' && value.includes('{') && value.includes('}')) {
      context[key] = evaluatePlaceholders({ content: value, context });
    }
  });

  return evaluatePlaceholders({ content, context });
};
