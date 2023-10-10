import { Schema, mm2pt } from '@pdfme/common';
import { convertForPdfLayoutProps } from '../src/renderUtils';

// npm run test:single -- "convertForPdfLayoutProps"

// FIXME add unit tests
describe('convertForPdfLayoutProps', () => {
    it.only('should return correct value', () => {
        const schema: Schema = {
            type: 'image',
            width: 100,
            height: 100,
            position: { x: 100, y: 100 },
            rotate: 0
        };
        const pageHeight = 1000;

        const { position: { x, y }, height, width, rotate } = convertForPdfLayoutProps({ schema, pageHeight });

        expect(height).toEqual(mm2pt(schema.height));
        expect(width).toEqual(mm2pt(schema.width));

        expect(x).toEqual(mm2pt(schema.position.x));
        expect(y).toEqual(pageHeight - mm2pt(schema.position.y) - mm2pt(schema.height));

        expect(rotate).toEqual({ "angle": 0, "type": "degrees" });
    });
});