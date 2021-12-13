import { RefObject, useState, useCallback, useEffect } from 'react';
import { b64toBlob, pdf2Pngs, getPdfPageSizes, getB64BasePdf, getA4 } from './utils';
import { Template, PageSize } from './type';
import { rulerHeight, zoom } from './constants';

const getScale = (n: number, paper: number) => (n / paper > 1 ? 1 : n / paper);

type UiPreProcessorProps = { template: Template; size: PageSize; offset?: number };

export const useUiPreProcessor = ({ template, size, offset = 0 }: UiPreProcessorProps) => {
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
    init().then((data) => {
      setPageSizes(data.pageSizes);
      setScale(data.scale);
      setBackgrounds(data.backgrounds);
    });
  }, [init]);

  return { backgrounds, pageSizes, scale };
};

type ScrollPageCursorProps = {
  rootRef: RefObject<HTMLDivElement>;
  pageSizes: PageSize[];
  scale: number;
  pageCursor: number;
  onChangePageCursor: (page: number) => void;
};

export const useScrollPageCursor = ({
  rootRef,
  pageSizes,
  scale,
  pageCursor,
  onChangePageCursor,
}: ScrollPageCursorProps) => {
  const onScroll = useCallback(() => {
    if (!pageSizes[0] || !rootRef.current) {
      return;
    }

    const scroll = rootRef.current.scrollTop;
    const { top } = rootRef.current.getBoundingClientRect();
    const pageHeights = pageSizes.reduce((acc, cur, i) => {
      let value = (cur.height * zoom + rulerHeight) * scale;
      if (i === 0) {
        value += top - value / 2;
      } else {
        value += acc[i - 1];
      }

      return acc.concat(value);
    }, [] as number[]);
    let _pageCursor = 0;
    pageHeights.forEach((ph, i) => {
      if (scroll > ph) {
        _pageCursor = i + 1 >= pageHeights.length ? pageHeights.length - 1 : i + 1;
      }
    });
    if (_pageCursor !== pageCursor) {
      onChangePageCursor(_pageCursor);
    }
  }, [onChangePageCursor, pageCursor, pageSizes, rootRef, scale]);

  useEffect(() => {
    rootRef.current?.addEventListener('scroll', onScroll);

    return () => {
      rootRef.current?.removeEventListener('scroll', onScroll);
    };
  }, [rootRef, onScroll]);
};
