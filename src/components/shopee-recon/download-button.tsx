import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '~/components/ui/button';

type SummaryStats = {
  totalReleased: number;
  commissionFee: number;
  transactionFee: number;
  totalShippingFee: number;
  uniqueOrders: number;
  skuCount: number;
  compiledRows: number;
  unmatchedCount: number;
};

export function DownloadButton({
  downloadId,
  filename: _filename,
  chatId,
  workbookB64,
  summaryStats,
}: {
  downloadId: string;
  filename: string;
  chatId: number | undefined;
  workbookB64: string;
  summaryStats: SummaryStats;
}) {
  const [sending, setSending] = useState(false);

  async function handleClick() {
    if (!chatId) {
      toast.error('Missing Telegram chat — reopen the mini app.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/shopee-recon/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: downloadId, chatId, workbookB64, summaryStats }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(body.error ?? 'Failed to send file.');
        return;
      }
      toast.success('Sent to your Telegram chat.');
    } catch (err) {
      toast.error((err as Error).message ?? 'Failed to send file.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Button
      size="lg"
      className="font-bold gap-2"
      onClick={handleClick}
      disabled={sending || !chatId}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {sending ? 'Sending…' : 'Send to Telegram'}
    </Button>
  );
}
