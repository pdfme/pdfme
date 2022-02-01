import { RefObject, useRef, useState, useCallback, useEffect } from 'react';
import { b64toBlob } from '../../../common/src/utils';
import { getB64BasePdf } from '../../../common/src/helper';
import { pdf2Pngs, getPdfPageSizes } from './helper';
import { Template, Size } from '../../../common/src/type';
import { RULER_HEIGHT, ZOOM } from '../../../common/src/constants';

export const usePrevious = <T>(value: T) => {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
};

const getScale = (n: number, paper: number) => (n / paper > 1 ? 1 : n / paper);

type UIPreProcessorProps = { template: Template; size: Size; offset?: number };

export const useUIPreProcessor = ({ template, size, offset = 0 }: UIPreProcessorProps) => {
  const [backgrounds, setBackgrounds] = useState<string[]>([]);
  const [pageSizes, setPageSizes] = useState<Size[]>([]);
  const [scale, setScale] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const init = useCallback(async () => {
    const _basePdf = await getB64BasePdf(template.basePdf);
    const pdfBlob = b64toBlob(_basePdf);
    const _pageSizes = await getPdfPageSizes(pdfBlob);
    const paperWidth = _pageSizes[0].width * ZOOM;
    const paperHeight = _pageSizes[0].height * ZOOM;
    const _backgrounds = await pdf2Pngs(pdfBlob, paperWidth);

    const _scale = Math.min(
      getScale(size.width, paperWidth),
      getScale(size.height - offset, paperHeight)
    );

    return { backgrounds: _backgrounds, pageSizes: _pageSizes, scale: _scale };
  }, [template, size, offset]);

  useEffect(() => {
    init()
      .then((data) => {
        setPageSizes(data.pageSizes);
        setScale(data.scale);
        setBackgrounds(data.backgrounds);
      })
      .catch((e: Error) => {
        console.error(e);
        setError(e);
      });
  }, [init]);

  return { backgrounds, pageSizes, scale, error };
};

type ScrollPageCursorProps = {
  rootRef: RefObject<HTMLDivElement>;
  pageSizes: Size[];
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
      let value = (cur.height * ZOOM + RULER_HEIGHT) * scale;
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
