import { useState, useCallback, useEffect } from 'react';
import { b64toBlob, pdf2Pngs, getPdfPageSizes, getB64BasePdf, getA4 } from './utils';
import { Template, PageSize } from './type';
import { zoom } from './constants';

export const useUiPreProcessor = ({
  template,
  size,
  basePdf,
  offset = 0,
}: {
  template: Template;
  size: PageSize;
  basePdf?: string;
  offset?: number;
}) => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([getA4()]);
  const [scale, setScale] = useState(0);

  const init = useCallback(async () => {
    const basePdf = await getB64BasePdf(template);
    const pdfBlob = b64toBlob(basePdf);
    const pageSizes = await getPdfPageSizes(pdfBlob);
    const pageSize = pageSizes[0];
    const paperWidth = pageSize.width * zoom;
    const paperHeight = pageSize.height * zoom;
    const backgrounds = await pdf2Pngs(pdfBlob, paperWidth);

    const getScale = (size: number, paper: number) => (size / paper > 1 ? 1 : size / paper);
    const scale = Math.min(
      getScale(size.width, paperWidth),
      getScale(size.height - offset, paperHeight)
    );

    return { backgrounds, pageSizes, scale };
  }, [template, size, basePdf]);

  useEffect(() => {
    let isMounted = true;
    init().then((data) => {
      if (isMounted) {
        setPageSizes(data.pageSizes);
        setScale(data.scale);
        setBackgrounds(data.backgrounds);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [template, size, basePdf, offset]);

  return { backgrounds, pageSizes, scale };
};
