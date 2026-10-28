import { useEffect, useState } from 'react';

export type BilanElementSize = {
  width: number;
  height: number;
};

export const useBilanElementSize = (fallback: BilanElementSize) => {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState<BilanElementSize>(fallback);

  useEffect(() => {
    if (element === null) {
      return;
    }

    const measure = () => {
      const bounds = element.getBoundingClientRect();

      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);

      setSize((currentSize) =>
        currentSize.width === width && currentSize.height === height
          ? currentSize
          : { width, height },
      );
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [element]);

  return [setElement, size] as const;
};
