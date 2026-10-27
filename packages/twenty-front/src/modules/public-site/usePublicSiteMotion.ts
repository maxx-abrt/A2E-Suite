import { useEffect, useRef } from 'react';

export const usePublicSiteMotion = (pathname: string) => {
  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.setAttribute(
            'data-in-view',
            String(entry.isIntersecting),
          );
        }
      },
      { root: page, rootMargin: '40px' },
    );
    page
      .querySelectorAll('[data-public-motion]')
      .forEach((element) => observer.observe(element));
    const syncVisibility = () =>
      page.setAttribute('data-background', String(document.hidden));
    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, [pathname]);
  return pageRef;
};
