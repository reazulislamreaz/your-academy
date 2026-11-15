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

const MIN_SCALE = 0.35;
const MAX_SCALE = 4;
const SCALE_STEP = 0.15;
/** Must match Document `max-w-[1200px]` so Fit width cannot exceed the column. */
const CONTENT_MAX_WIDTH = 1200;
/** Horizontal/vertical padding inside the scroller (px-3/sm:px-6 + py-4) + ring. */
const SCROLLER_PAD_X = 48;
const SCROLLER_PAD_Y = 32;
const PAGE_CHROME = 4;

type PdfModules = {
  Document: ComponentType<Record<string, unknown>>;
  Page: ComponentType<Record<string, unknown>>;
};

type PageSize = { width: number; height: number };

type PageLayoutProps = { width: number } | { scale: number };

type PdfDocLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
  }>;
};

function LazyPdfPage({
  Page,
  pageNumber,
  layout,
  root,
}: {
  Page: ComponentType<Record<string, unknown>>;
  pageNumber: number;
  layout: PageLayoutProps;
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
      className="mx-auto max-w-full rounded-[var(--radius)] bg-white shadow-[var(--shadow-sm)] ring-1 ring-[var(--line)]"
    >
      {visible ? (
        <Page
          pageNumber={pageNumber}
          {...layout}
          renderAnnotationLayer={false}
          renderTextLayer
          className="mx-auto !bg-transparent"
          loading={
            <div className="flex h-[40vh] w-full max-w-3xl items-center justify-center bg-[var(--bg-muted)]">
              <PageLoader compact label={`Loading page ${pageNumber}`} />
            </div>
          }
        />
      ) : (
        <div className="flex h-[40vh] w-full items-center justify-center bg-[var(--bg-muted)] text-xs text-[var(--muted-strong)]">
          Page {pageNumber}
        </div>
      )}
    </div>
  );
}

function errorMessageForStatus(status: number): string {
  if (status === 404) return 'This PDF could not be found or is no longer published.';
  if (status === 401 || status === 403) return 'You do not have access to view this PDF.';
  if (status === 504 || status === 408) {
    return 'The PDF took too long to load. Please try again.';
  }
  return 'Could not open this PDF. Please try again in a moment.';
}

function clampScale(value: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value.toFixed(4))));
}

/**
 * Full-page in-app PDF reader. react-pdf/pdfjs are loaded only after mount
 * (never during SSR). Bytes are fetched via the API proxy as a Uint8Array
 * so the browser never receives a storage URL.
 */
export function PdfViewer({ fileUrl, title, className, toolbarExtra }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocLike | null>(null);
  const [mods, setMods] = useState<PdfModules | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [fit, setFit] = useState<FitMode>('width');
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [basePage, setBasePage] = useState<PageSize | null>(null);
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
    setPdfBytes(null);
    setLoadError(null);
    setNumPages(0);
    setBasePage(null);
    pdfDocRef.current = null;
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
          throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        }

        const total = Number(res.headers.get('content-length') || 0);
        let bytes: Uint8Array;

        if (!res.body) {
          bytes = new Uint8Array(await res.arrayBuffer());
        } else {
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
          bytes = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.length;
          }
        }

        if (bytes.byteLength < 5) {
          throw new Error('Empty PDF response');
        }
        const magic = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!);
        if (magic !== '%PDF-') {
          throw new Error('Invalid PDF payload');
        }

        if (!cancelled) {
          setPdfBytes(bytes.slice());
          setFetchProgress(100);
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0;
        setLoadError(status ? errorMessageForStatus(status) : errorMessageForStatus(0));
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
    // Fit against the visible column, not a wider scroller that Document clamps.
    const width = Math.max(
      200,
      Math.min(CONTENT_MAX_WIDTH, el.clientWidth - SCROLLER_PAD_X) - PAGE_CHROME,
    );
    const height = Math.max(200, el.clientHeight - SCROLLER_PAD_Y - PAGE_CHROME);
    setViewport((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  useEffect(() => {
    measure();
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, fullscreen, pdfBytes]);

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

  const readPageSize = useCallback(async (pageNumber: number) => {
    const doc = pdfDocRef.current;
    if (!doc || pageNumber < 1) return;
    try {
      const pdfPage = await doc.getPage(pageNumber);
      const vp = pdfPage.getViewport({ scale: 1 });
      if (vp.width > 0 && vp.height > 0) {
        setBasePage({ width: vp.width, height: vp.height });
      }
    } catch {
      /* keep last known size */
    }
  }, []);

  useEffect(() => {
    if (numPages < 1) return;
    void readPageSize(page);
  }, [numPages, page, readPageSize]);

  // Stable identity so react-pdf does not reload on every parent render.
  const file = useMemo(
    () => (pdfBytes ? { data: pdfBytes } : null),
    [pdfBytes],
  );

  /**
   * Fit width → exact CSS width via react-pdf `width` (no max-scale clamp).
   * Fit page → min(widthScale, heightScale), unclamped so the page letterboxes.
   * Custom → manual zoom with min/max guards.
   */
  const fitScale = useMemo(() => {
    if (!basePage || viewport.width <= 0 || viewport.height <= 0) return 1;
    const widthScale = viewport.width / basePage.width;
    const heightScale = viewport.height / basePage.height;
    if (fit === 'page') return Number(Math.min(widthScale, heightScale).toFixed(4));
    return Number(widthScale.toFixed(4));
  }, [basePage, viewport, fit]);

  const renderScale = fit === 'custom' ? clampScale(scale) : fitScale;

  const pageLayout: PageLayoutProps = useMemo(() => {
    if (fit === 'width' && viewport.width > 0) {
      // react-pdf sizes the canvas to this width and preserves aspect ratio.
      return { width: viewport.width };
    }
    return { scale: renderScale };
  }, [fit, viewport.width, renderScale]);

  const goPage = (next: number) => {
    if (numPages < 1) return;
    const clamped = Math.min(numPages, Math.max(1, next));
    setPage(clamped);
    const target = scrollerRef.current?.querySelector(`[data-pdf-page="${clamped}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const zoomBy = (delta: number) => {
    setFit('custom');
    setScale(clampScale(renderScale + delta));
  };

  const applyFit = (mode: FitMode) => {
    setFit(mode);
    if (mode !== 'custom' && basePage && viewport.width > 0) {
      const widthScale = viewport.width / basePage.width;
      const heightScale = viewport.height / basePage.height;
      // Seed custom zoom from the fit result (still allow zooming past MAX later via clamp).
      setScale(
        clampScale(mode === 'width' ? widthScale : Math.min(widthScale, heightScale)),
      );
    }
    requestAnimationFrame(() => {
      measure();
      const target = scrollerRef.current?.querySelector(`[data-pdf-page="${page}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: mode === 'page' ? 'center' : 'start' });
    });
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
  const ready = Boolean(Document && Page && file);

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
          <span className="hidden min-w-[3.25rem] text-center text-xs font-semibold tabular-nums text-[var(--muted-strong)] sm:inline">
            {Math.round(renderScale * 100)}%
          </span>
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
              onClick={() => applyFit('width')}
            >
              Fit width
            </Button>
            <Button
              type="button"
              size="sm"
              variant={fit === 'page' ? 'soft' : 'outline'}
              onClick={() => applyFit('page')}
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
          <div className="flex min-h-[50vh] items-center justify-center">
            <LoadError
              message={loadError}
              onRetry={() => {
                setLoadError(null);
                setReloadKey((k) => k + 1);
              }}
            />
          </div>
        ) : !ready || !Document || !Page || !file ? (
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
            file={file}
            suspense={false}
            loading={<PageLoader compact label="Rendering PDF" />}
            error={
              <div className="flex min-h-[50vh] items-center justify-center">
                <LoadError
                  message="Could not render this PDF."
                  onRetry={() => setReloadKey((k) => k + 1)}
                />
              </div>
            }
            onLoadSuccess={(pdf: PdfDocLike) => {
              pdfDocRef.current = pdf;
              setNumPages(pdf.numPages);
              setPage(1);
              setLoadError(null);
              void (async () => {
                try {
                  const first = await pdf.getPage(1);
                  const vp = first.getViewport({ scale: 1 });
                  setBasePage({ width: vp.width, height: vp.height });
                } catch {
                  /* scale falls back until page size is known */
                }
                // Remeasure after layout settles so Fit page has a real viewport.
                requestAnimationFrame(() => measure());
              })();
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
                  layout={pageLayout}
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
