import { useState, useCallback, useEffect } from 'react';
import { b64toBlob, pdf2Pngs, getPdfPageSizes, getB64BasePdf, getA4 } from './utils';
import { Template, PageSize } from './type';
import { zoom } from './constants';

const getScale = (n: number, paper: number) => (n / paper > 1 ? 1 : n / paper);

type Props = { template: Template; size: PageSize; basePdf?: string; offset?: number };

export const useUiPreProcessor = ({ template, size, basePdf, offset = 0 }: Props) => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([getA4()]);
  const [scale, setScale] = useState(0);

  const init = useCallback(async () => {
    const _basePdf = await getB64BasePdf(template);
    const pdfBlob = b64toBlob(_basePdf);
    const _pageSizes = await getPdfPageSizes(pdfBlob);
    const paperWidth = _pageSizes[0].width * zoom;
    const paperHeight = _pageSizes[0].height * zoom;
    const _backgrounds = await pdf2Pngs(pdfBlob, paperWidth);

    const _scale = Math.min(
      getScale(size.width, paperWidth),
      getScale(size.height - offset, paperHeight)
    );

    return { backgrounds: _backgrounds, pageSizes: _pageSizes, scale: _scale };
  }, [template, size, offset]);

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
  }, [template, size, basePdf, offset, init]);

  return { backgrounds, pageSizes, scale };
};
