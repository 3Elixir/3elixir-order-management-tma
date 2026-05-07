import { useState, useEffect, useRef } from 'react';
import { useInitData } from '@tma.js/sdk-react';
import { FileDropzone } from '~/components/shopee-recon/file-dropzone';
import { ResultTabs } from '~/components/shopee-recon/result-tabs';
import { UnmatchedBanner } from '~/components/shopee-recon/unmatched-banner';
import { ErrorDisplay, type ApiError } from '~/components/shopee-recon/error-display';
import { DownloadButton } from '~/components/shopee-recon/download-button';
import { SummaryCards } from '~/components/shopee-recon/summary-cards';
import { Button } from '~/components/ui/button';
import type { CompiledRow, SummaryRow, ProductBreakdownRow } from '~/lib/recon/schema';

type Result = {
  reconId: string;
  previews: { compiled: CompiledRow[]; breakdown: ProductBreakdownRow[]; summary: SummaryRow };
  unmatched: { count: number };
  download: { id: string; url: string; filename: string };
};

type Phase = 'idle' | 'running' | 'review';

const STATUS_MESSAGES = [
  'Reading inputs…',
  'Validating columns…',
  'Joining records…',
  'Building workbook…',
];

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-foreground/70" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Home() {
  const tmaInitData = useInitData();
  const chatId = tmaInitData?.user?.id;
  const [orders, setOrders] = useState<File | null>(null);
  const [ordersPrev, setOrdersPrev] = useState<File | null>(null);
  const [income, setIncome] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase: Phase = running ? 'running' : result ? 'review' : 'idle';

  useEffect(() => {
    if (running) {
      setStatusIdx(0);
      intervalRef.current = setInterval(() => {
        setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
      }, 350);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  async function run() {
    if (!orders || !ordersPrev || !income) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('orders', orders);
      fd.append('ordersPrev', ordersPrev);
      fd.append('income', income);
      const res = await fetch('/api/shopee-recon/reconcile', { method: 'POST', body: fd });
      const body = await res.json();
      if (!res.ok) {
        setError(body as ApiError);
      } else {
        setResult(body as Result);
      }
    } catch (e) {
      setError({ kind: 'pipeline', message: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setOrders(null);
    setOrdersPrev(null);
    setIncome(null);
  }

  /* ── REVIEW phase ─────────────────────────────────────────────────── */
  if (phase === 'review' && result) {
    return (
      <div className="min-h-screen bg-background">
        {/* Compact header bar */}
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
            <span className="text-base font-semibold tracking-tight">ShopeeRecon</span>
            <button
              type="button"
              onClick={reset}
              className="text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors duration-150"
            >
              New reconciliation
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-8 md:pb-8">
          {/* Recon ID */}
          <div className="flex min-w-0 items-baseline gap-2 text-sm">
            <span className="shrink-0 font-medium text-foreground">Recon ID:</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {result.reconId}
            </code>
          </div>

          {/* File summary — stack on mobile, inline on sm+ */}
          <div className="mt-2 flex min-w-0 flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            <p className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 font-medium text-foreground">Orders (T):</span>
              <span className="truncate font-mono text-xs">{orders?.name ?? '—'}</span>
            </p>
            <span className="hidden text-border sm:inline">·</span>
            <p className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 font-medium text-foreground">Orders (T-1):</span>
              <span className="truncate font-mono text-xs">{ordersPrev?.name ?? '—'}</span>
            </p>
            <span className="hidden text-border sm:inline">·</span>
            <p className="flex min-w-0 items-baseline gap-1">
              <span className="shrink-0 font-medium text-foreground">Income:</span>
              <span className="truncate font-mono text-xs">{income?.name ?? '—'}</span>
            </p>
          </div>

          {/* Summary cards */}
          <div className="mt-4">
            <SummaryCards summary={result.previews.summary} />
          </div>

          {/* Unmatched banner */}
          {result.unmatched.count > 0 && (
            <UnmatchedBanner count={result.unmatched.count} />
          )}

          {/* Tabs */}
          <ResultTabs
            compiled={result.previews.compiled}
            breakdown={result.previews.breakdown}
            summary={result.previews.summary}
          />

          {/* Download — sticky on mobile, inline on md+ */}
          <div className="fixed inset-x-4 bottom-4 z-30 md:static md:mt-4 md:inset-auto md:flex md:justify-start [&_button]:w-full md:[&_button]:w-auto [&_button]:shadow-xl md:[&_button]:shadow-none [&_button]:ring-1 [&_button]:ring-white/10 md:[&_button]:ring-0">
            <DownloadButton downloadId={result.download.id} chatId={chatId} />
          </div>
        </main>
      </div>
    );
  }

  /* ── RUNNING phase ────────────────────────────────────────────────── */
  if (phase === 'running') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-8">
            <span className="text-base font-semibold tracking-tight">ShopeeRecon</span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-8">
          {/* File pills */}
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { label: 'Orders export (current month)', file: orders },
              { label: 'Orders export (previous month)', file: ordersPrev },
              { label: 'Income Released export', file: income },
            ].map(({ label, file }) => (
              <div
                key={label}
                className="flex min-w-0 items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className="truncate font-mono text-sm text-foreground">{file?.name ?? '—'}</p>
                  {file && (
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status block */}
          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <Spinner />
            <p className="text-sm font-medium text-foreground/80 tabular-nums">
              {STATUS_MESSAGES[statusIdx]}
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* ── IDLE phase ───────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-8 sm:pt-16">
        {/* Hero */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">ShopeeRecon</h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
            Reconcile two months of Shopee Orders exports with an Income Released export.
          </p>
        </header>

        {/* Dropzones */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FileDropzone label="Orders export (current month, T)" file={orders} onFile={setOrders} />
          <FileDropzone label="Orders export (previous month, T-1)" file={ordersPrev} onFile={setOrdersPrev} />
          <FileDropzone label="Income Released export" file={income} onFile={setIncome} />
        </div>

        {/* Reconcile button */}
        <div className="mt-6">
          <Button
            onClick={run}
            disabled={!orders || !ordersPrev || !income || running}
            className="h-11 w-full sm:w-auto"
          >
            Reconcile
          </Button>
        </div>

        {/* Error */}
        {error && <ErrorDisplay error={error} />}
      </main>
    </div>
  );
}
