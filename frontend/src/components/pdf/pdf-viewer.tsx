'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/loading';
import { LoadError } from '@/components/loading';
import { cn } from '@/lib/utils';

type FitMode = 'width' | 'page' | 'custom';

type Props = {
  /** Same-origin API path that streams PDF bytes (controlled proxy). */
  fileUrl: string;
  title?: string;
  className?: string;
  toolbarExtra?: ReactNode;
};

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.15;

type PdfModules = {
  Document: ComponentType<Record<string, unknown>>;
  Page: ComponentType<Record<string, unknown>>;
};

function LazyPdfPage({
  Page,
  pageNumber,
  pageProps,
  root,
}: {
  Page: ComponentType<Record<string, unknown>>;
  pageNumber: number;
  pageProps: { width?: number; height?: number; scale?: number };
  root: HTMLElement | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { root: root ?? null, rootMargin: '800px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  return (
    <div
      ref={ref}
      data-pdf-page={pageNumber}
      className="min-h-[40vh] w-full overflow-hidden rounded-[var(--radius)] bg-white shadow-[var(--shadow-sm)] ring-1 ring-[var(--line)]"
    >
      {visible ? (
        <Page
          pageNumber={pageNumber}
          {...pageProps}
          renderAnnotationLayer={false}
          renderTextLayer
          loading={
            <div className="flex h-[50vh] w-full max-w-3xl items-center justify-center bg-[var(--bg-muted)]">
              <PageLoader compact label={`Loading page ${pageNumber}`} />
            </div>
          }
        />
      ) : (
        <div className="flex h-[50vh] w-full items-center justify-center bg-[var(--bg-muted)] text-xs text-[var(--muted-strong)]">
          Page {pageNumber}
        </div>
      )}
    </div>
  );
}

/**
 * Full-page in-app PDF reader. react-pdf/pdfjs are loaded only after mount
 * (never during SSR). Bytes are fetched via the API proxy as an ArrayBuffer
 * so the browser never receives a storage URL.
 */
export function PdfViewer({ fileUrl, title, className, toolbarExtra }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [mods, setMods] = useState<PdfModules | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [fit, setFit] = useState<FitMode>('width');
  const [scale, setScale] = useState(1);
  const [pageWidth, setPageWidth] = useState<number | undefined>(undefined);
  const [pageHeight, setPageHeight] = useState<number | undefined>(undefined);
  const [fullscreen, setFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [libReady, setLibReady] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [reactPdf] = await Promise.all([
          import('react-pdf'),
          import('./pdf-viewer-styles'),
        ]);
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        if (!cancelled) {
          setMods({
            Document: reactPdf.Document as unknown as ComponentType<Record<string, unknown>>,
            Page: reactPdf.Page as unknown as ComponentType<Record<string, unknown>>,
          });
          setLibReady(true);
        }
      } catch {
        if (!cancelled) setLoadError('Could not initialize the PDF viewer.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!libReady) return;
    let cancelled = false;
    const ctrl = new AbortController();
    setPdfData(null);
    setLoadError(null);
    setNumPages(0);
    setFetchProgress(0);

    void (async () => {
      try {
        const res = await fetch(fileUrl, {
          credentials: 'include',
          signal: ctrl.signal,
          headers: { Accept: 'application/pdf' },
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const total = Number(res.headers.get('content-length') || 0);
        if (!res.body) {
          const buf = await res.arrayBuffer();
          if (!cancelled) {
            setPdfData(buf.slice(0));
            setFetchProgress(100);
          }
          return;
        }

        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (!cancelled && total > 0) {
              setFetchProgress(Math.min(99, Math.round((received / total) * 100)));
            }
          }
        }
        const merged = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        if (!cancelled) {
          setPdfData(merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength));
          setFetchProgress(100);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setLoadError('Could not open this PDF. It may still be loading — try again in a moment.');
        setFetchProgress(null);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [fileUrl, libReady, reloadKey]);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const pad = 32;
    setPageWidth(Math.max(280, el.clientWidth - pad));
    setPageHeight(Math.max(320, el.clientHeight - pad));
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (scrollerRef.current) ro.observe(scrollerRef.current);
    return () => ro.disconnect();
  }, [measure, fullscreen, pdfData]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 's' || key === 'p') e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pageProps = useMemo(() => {
    if (fit === 'width' && pageWidth) return { width: pageWidth } as const;
    if (fit === 'page' && pageHeight) return { height: pageHeight } as const;
    return { scale } as const;
  }, [fit, pageWidth, pageHeight, scale]);

  const goPage = (next: number) => {
    if (numPages < 1) return;
    const clamped = Math.min(numPages, Math.max(1, next));
    setPage(clamped);
    const target = scrollerRef.current?.querySelector(`[data-pdf-page="${clamped}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const zoomBy = (delta: number) => {
    setFit('custom');
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((s + delta).toFixed(2)))));
  };

  const toggleFullscreen = async () => {
    const root = containerRef.current;
    if (!root) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch {
      /* fullscreen may be blocked */
    }
  };

  const onScroll = () => {
    const root = scrollerRef.current;
    if (!root || numPages < 1) return;
    const pages = root.querySelectorAll<HTMLElement>('[data-pdf-page]');
    let best = 1;
    let bestDist = Number.POSITIVE_INFINITY;
    const mid = root.scrollTop + root.clientHeight * 0.25;
    pages.forEach((el) => {
      const n = Number(el.dataset.pdfPage);
      const dist = Math.abs(el.offsetTop - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = n;
      }
    });
    setPage(best);
  };

  const Document = mods?.Document;
  const Page = mods?.Page;
  const ready = Boolean(Document && Page && pdfData);

  return (
    <div
      ref={containerRef}
      className={cn(
        'ya-pdf-viewer flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-desk)] shadow-[var(--shadow)]',
        fullscreen && 'rounded-none border-0',
        className,
      )}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-2 py-2 sm:gap-2 sm:px-4">
        <div className="mr-auto min-w-0 max-w-[40%] sm:max-w-none">
          {title ? (
            <p className="truncate font-display text-xs font-semibold text-[var(--ink)] sm:text-sm">
              {title}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[4.25rem] text-center text-xs font-semibold tabular-nums text-[var(--muted-strong)] sm:min-w-[5.5rem]">
            {numPages ? `${page} / ${numPages}` : '—'}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10"
            aria-label="Next page"
            disabled={!numPages || page >= numPages}
            onClick={() => goPage(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10"
            aria-label="Zoom out"
            onClick={() => zoomBy(-SCALE_STEP)}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10"
            aria-label="Zoom in"
            onClick={() => zoomBy(SCALE_STEP)}
          >
            <ZoomIn className="size-4" />
          </Button>
          <div className="ya-pdf-toolbar-fit hidden items-center gap-1 sm:flex">
            <Button
              type="button"
              size="sm"
              variant={fit === 'width' ? 'soft' : 'outline'}
              onClick={() => setFit('width')}
            >
              Fit width
            </Button>
            <Button
              type="button"
              size="sm"
              variant={fit === 'page' ? 'soft' : 'outline'}
              onClick={() => setFit('page')}
            >
              Fit page
            </Button>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-10"
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>
        </div>
        {toolbarExtra}
      </div>

      <div
        ref={scrollerRef}
        className="ya-pdf-scroller min-h-0 flex-1 overflow-auto overscroll-contain px-3 py-4 sm:px-6"
        onScroll={onScroll}
      >
        {loadError ? (
          <LoadError
            message={loadError}
            onRetry={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        ) : !ready || !Document || !Page ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
            <PageLoader
              compact
              label={
                fetchProgress != null && fetchProgress < 100
                  ? `Loading PDF${fetchProgress > 0 ? ` · ${fetchProgress}%` : '…'}`
                  : 'Loading PDF'
              }
            />
            {fetchProgress != null && fetchProgress > 0 && fetchProgress < 100 ? (
              <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                  style={{ width: `${fetchProgress}%` }}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <Document
            key={`${fileUrl}-${reloadKey}`}
            file={{ data: pdfData }}
            loading={<PageLoader compact label="Rendering PDF" />}
            error={
              <LoadError
                message="Could not render this PDF."
                onRetry={() => setReloadKey((k) => k + 1)}
              />
            }
            onLoadSuccess={(info: { numPages: number }) => {
              setNumPages(info.numPages);
              setPage(1);
              setLoadError(null);
            }}
            onLoadError={() => setLoadError('Could not render this PDF.')}
            className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, i) => {
              const n = i + 1;
              return (
                <LazyPdfPage
                  key={n}
                  Page={Page}
                  pageNumber={n}
                  pageProps={pageProps}
                  root={scrollerRef.current}
                />
              );
            })}
          </Document>
        )}
      </div>
    </div>
  );
}
