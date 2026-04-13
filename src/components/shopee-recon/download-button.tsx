import { Button } from '~/components/ui/button';

type TelegramWebApp = {
  downloadFile?: (
    params: { url: string; file_name: string },
    callback?: (ok: boolean) => void,
  ) => void;
  openLink?: (url: string, opts?: { try_instant_view?: boolean }) => void;
};

function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { Telegram?: { WebApp?: TelegramWebApp } };
  return w.Telegram?.WebApp ?? null;
}

function absoluteUrl(path: string): string {
  if (typeof window === 'undefined') return path;
  return new URL(path, window.location.origin).toString();
}

export function DownloadButton({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    const abs = absoluteUrl(url);
    const webApp = getWebApp();

    if (webApp?.downloadFile) {
      webApp.downloadFile({ url: abs, file_name: filename });
      return;
    }

    if (webApp?.openLink) {
      webApp.openLink(abs);
      return;
    }

    const a = document.createElement('a');
    a.href = abs;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Button size="lg" className="font-bold gap-2" onClick={handleClick}>
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
      Download {filename}
    </Button>
  );
}
