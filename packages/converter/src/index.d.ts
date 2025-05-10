declare module '@pdfme/converter' {
  export function pdf2img(pdf: ArrayBuffer | Uint8Array, options?: { scale?: number; range?: { start?: number; end?: number }; imageType?: string }): Promise<ArrayBuffer[]>;
  export function pdf2size(pdf: ArrayBuffer | Uint8Array, options?: { scale?: number }): Promise<{ width: number; height: number }[]>;
  export function img2pdf(images: ArrayBuffer[], options?: { scale?: number; size?: { width: number; height: number }; margin?: [number, number, number, number] }): Promise<ArrayBuffer>;
}
