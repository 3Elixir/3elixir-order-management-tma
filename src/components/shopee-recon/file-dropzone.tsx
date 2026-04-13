import { useRef, useState } from 'react';
import { Card } from '~/components/ui/card';

type Props = {
  label: string;
  file: File | null;
  onFile: (f: File | null) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({ label, file, onFile }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground">{label}</span>
        {file && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Selected
          </span>
        )}
      </div>
      <Card
        className={[
          'w-full cursor-pointer border border-dashed',
          'transition-[transform,box-shadow,background-color] duration-200',
          dragActive
            ? 'ring-2 ring-foreground/40 scale-[1.01] bg-muted/40'
            : 'hover:bg-neutral-50 dark:hover:bg-muted/20',
        ].join(' ')}
        onClick={() => ref.current?.click()}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={ref}
          type="file"
          accept=".xlsx"
          aria-label={`Upload ${label}`}
          className="hidden"
          onChange={(e) => onFile(e.currentTarget.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex min-w-0 items-center gap-3 px-5 py-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 shrink-0 text-muted-foreground"
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
              <p className="truncate font-mono text-sm text-foreground">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatBytes(file.size)}{' '}
                <button
                  type="button"
                  className="ml-1 underline underline-offset-2 hover:text-foreground transition-colors duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    ref.current?.click();
                  }}
                >
                  Replace
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-5 py-8 text-muted-foreground">
            <span className="text-2xl leading-none" aria-hidden="true">
              ⬆
            </span>
            <p className="text-sm">Click or drop an .xlsx file</p>
          </div>
        )}
      </Card>
    </div>
  );
}
