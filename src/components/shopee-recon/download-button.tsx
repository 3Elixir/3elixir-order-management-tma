import { Button } from '~/components/ui/button';

export function DownloadButton({ href, filename }: { href: string; filename: string }) {
  return (
    <a href={href} download={filename}>
      <Button size="lg" className="font-bold gap-2">
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
    </a>
  );
}
