import { Schema } from '@pdfme/common/dist/esm/index.js';

export const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
