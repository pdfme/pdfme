import { Schema } from '@pdfme/common';

export const getCacheKey = (schema: Schema, input: string) => `${schema.type}${input}`;
