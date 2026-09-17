import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
   pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfScrollViewerProps {
  fileUrl: string;
  mode: 'live' | 'replay';
  preferIframe?: boolean;
  className?: string;
  controlledPage?: number;
  controlledScrollRatio?: number;
  onPageChange?: (page: number) => void;
  onScrollRatioChange?: (ratio: number) => void;
}

const PAGE_CHUNK = 3;

export default function PdfScrollViewer({
  fileUrl,
  mode,
  preferIframe = false,
  className,
  controlledPage,
  controlledScrollRatio,
  onPageChange,
  onScrollRatioChange,
}: PdfScrollViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeRef = useRef<ResizeObserver | null>(null);
  const lastPageRef = useRef(1);
  const isApplyingControlledScrollRef = useRef(false);
  console.log('fileUrl', fileUrl)
  console.log('i am here doing nothing')

  const [numPages, setNumPages] = useState(0);
  const [renderedPages, setRenderedPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null); // width / height
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const isReplay = mode === 'replay';
  const pageNumbers = Array.from({ length: renderedPages }, (_, i) => i + 1);
  const fallbackBaseParams = `page=${Math.max(1, controlledPage ?? 1)}&toolbar=0&navpanes=0&view=FitH`;
  const fallbackSrc = isReplay
    ? `${fileUrl}#${fallbackBaseParams}`
    : `${fileUrl}#${fallbackBaseParams}&scrollbar=0`;

  const isSinglePage = numPages === 1;

  const resolveCurrentPage = useCallback((container: HTMLDivElement): number => {
    const pages = container.querySelectorAll<HTMLElement>('[data-pdf-page]');
    if (pages.length === 0) return 1;

    const probe = container.scrollTop + 24;
    let current = 1;
    for (const page of pages) {
      const pageNumber = Number(page.dataset.pdfPage || '1');
      if (page.offsetTop <= probe) current = pageNumber;
      else break;
    }
    return current;
  }, []);

  const updatePageIfChanged = useCallback(() => {
    const container = containerRef.current;
    if (!container || !onPageChange) return;

    const page = resolveCurrentPage(container);
    if (page !== lastPageRef.current) {
      lastPageRef.current = page;
      onPageChange(page);
    }
  }, [onPageChange, resolveCurrentPage]);

  const onScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (isReplay) {
      if (isApplyingControlledScrollRef.current) {
        isApplyingControlledScrollRef.current = false;
        return;
      }

      if (onScrollRatioChange) {
        const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
        const ratio = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
        onScrollRatioChange(Math.max(0, Math.min(1, ratio)));
      }
      return;
    }

    // Progressive rendering: append pages as user approaches the bottom.
    if (
      !isSinglePage &&
      renderedPages < numPages &&
      container.scrollTop + container.clientHeight >= container.scrollHeight - 600
    ) {
      setRenderedPages((prev) => Math.min(numPages, prev + PAGE_CHUNK));
    }

    // Update page indicator on scroll
    updatePageIfChanged();

    if (onScrollRatioChange) {
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
      const ratio = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
      onScrollRatioChange(Math.max(0, Math.min(1, ratio)));
    }
  }, [isReplay, isSinglePage, onScrollRatioChange, updatePageIfChanged, numPages, renderedPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      setContainerWidth(Math.max(300, Math.floor(container.clientWidth - 20)));
      setContainerHeight(Math.max(200, Math.floor(container.clientHeight - 16)));
    };

    measure();
    resizeRef.current = new ResizeObserver(measure);
    resizeRef.current.observe(container);

    return () => {
      resizeRef.current?.disconnect();
      resizeRef.current = null;
    };
  }, []);

  useEffect(() => {
    setNumPages(0);
    setRenderedPages(0);
    setPageAspectRatio(null);
    setUseIframeFallback(preferIframe);
    lastPageRef.current = 1;
  }, [fileUrl, preferIframe]);

  useEffect(() => {
    if (!isReplay) return;

    const container = containerRef.current;
    if (!container || controlledPage == null) return;

    const target = container.querySelector<HTMLElement>(`[data-pdf-page="${controlledPage}"]`);
    if (!target) return;

    isApplyingControlledScrollRef.current = true;
    container.scrollTop = target.offsetTop;
  }, [isReplay, controlledPage, renderedPages]);

  useEffect(() => {
    if (!isReplay) return;

    const container = containerRef.current;
    if (!container || controlledScrollRatio == null) return;

    const clamped = Math.max(0, Math.min(1, controlledScrollRatio));
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    isApplyingControlledScrollRef.current = true;
    container.scrollTop = clamped * maxScroll;
  }, [isReplay, controlledScrollRatio, renderedPages]);

  if (useIframeFallback) {
    return (
      <div className={`h-full w-full bg-white ${className ?? ''}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
          <p className="text-xs text-slate-500">Using PDF fallback viewer</p>
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-blue-600 hover:underline"
          >
            Open in new tab
          </a>
        </div>
        <div className="h-[calc(100%-37px)] w-full">
          <object
            data={fileUrl}
            type="application/pdf"
            className="h-full w-full"
          >
            <iframe
              src={fallbackSrc}
              title="PDF Viewer"
              className="h-full w-full border-0"
            />
          </object>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={`${isSinglePage ? 'h-full w-full overflow-hidden' : 'h-full w-full overflow-y-auto'} bg-white ${className ?? ''}`}
    >
      <Document
        file={fileUrl}
        loading={<div className="p-4 text-sm text-gray-500">Loading PDF...</div>}
        error={<div className="p-4 text-sm text-red-500">Failed to open PDF.</div>}
        onLoadSuccess={async (pdf) => {
          const loaded = pdf.numPages;
          setNumPages(loaded);
          setRenderedPages(isReplay ? loaded : Math.min(loaded, PAGE_CHUNK));

          if (loaded > 0) {
            try {
              const firstPage = await pdf.getPage(1);
              const viewport = firstPage.getViewport({ scale: 1 });
              if (viewport.height > 0) {
                setPageAspectRatio(viewport.width / viewport.height);
              }
            } catch {
              // Keep default sizing if first-page metadata cannot be read.
            }
          }
        }}
        onLoadError={(err) => {
          console.error('PDF.js load error:', err);
          setUseIframeFallback(true);
        }}
      >
        <div className={`${isSinglePage ? 'h-full w-full flex items-center justify-center p-2' : 'space-y-3 p-2'}`}>
          {pageNumbers.map((page) => {
            // For single-page: fit page to container using aspect ratio.
            // Use height-based sizing if the page at full container width would exceed the container height.
            let pageWidth: number | undefined = containerWidth > 0 ? containerWidth : undefined;
            let pageHeight: number | undefined = undefined;
            if (isSinglePage && containerWidth > 0 && containerHeight > 0 && pageAspectRatio && pageAspectRatio > 0) {
              const heightIfFullWidth = containerWidth / pageAspectRatio;
              if (heightIfFullWidth > containerHeight) {
                // Page is taller than container — constrain by height instead
                pageWidth = undefined;
                pageHeight = containerHeight;
              }
            }
            return (
              <div
                key={page}
                data-pdf-page={page}
                className={`${isSinglePage ? 'h-full w-full flex items-center justify-center' : 'rounded border border-slate-200 bg-white shadow-sm'}`}
              >
                <Page
                  pageNumber={page}
                  width={pageWidth}
                  height={pageHeight}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                />
              </div>
            );
          })}
        </div>
      </Document>
    </div>
  );
}

