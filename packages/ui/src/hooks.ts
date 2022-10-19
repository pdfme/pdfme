import { RefObject, useRef, useState, useCallback, useEffect } from 'react';
import { Template, Size, getB64BasePdf } from '@pdfme/common';
import { pdf2Pngs, getPdfPageSizes, b64toBlob } from './helper';
import { ZOOM, RULER_HEIGHT } from './constants';

export const usePrevious = <T>(value: T) => {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
};

const getScale = (n: number, paper: number) =>
  Math.floor((n / paper > 1 ? 1 : n / paper) * 100) / 100;

type UIPreProcessorProps = { template: Template; size: Size; zoomLevel: number };

export const useUIPreProcessor = ({ template, size, zoomLevel }: UIPreProcessorProps) => {
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
      getScale(size.height - RULER_HEIGHT, paperHeight)
    );

    return { backgrounds: _backgrounds, pageSizes: _pageSizes, scale: _scale };
  }, [template, size]);

  useEffect(() => {
    init()
      .then(({ pageSizes, scale, backgrounds }) => {
        setPageSizes(pageSizes), setScale(scale), setBackgrounds(backgrounds);
      })
      .catch((e: Error) => {
        console.error(e);
        setError(e);
      });
  }, [init]);

  return { backgrounds, pageSizes, scale: scale * zoomLevel, error };
};

type ScrollPageCursorProps = {
  ref: RefObject<HTMLDivElement>;
  pageSizes: Size[];
  scale: number;
  pageCursor: number;
  onChangePageCursor: (page: number) => void;
};

export const useScrollPageCursor = ({
  ref,
  pageSizes,
  scale,
  pageCursor,
  onChangePageCursor,
}: ScrollPageCursorProps) => {
  const onScroll = useCallback(() => {
    if (!pageSizes[0] || !ref.current) {
      return;
    }

    const scroll = ref.current.scrollTop;
    const { top } = ref.current.getBoundingClientRect();
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
  }, [onChangePageCursor, pageCursor, pageSizes, ref, scale]);

  useEffect(() => {
    ref.current?.addEventListener('scroll', onScroll);

    return () => {
      ref.current?.removeEventListener('scroll', onScroll);
    };
  }, [ref, onScroll]);
};

export const useMountStatus = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
};
