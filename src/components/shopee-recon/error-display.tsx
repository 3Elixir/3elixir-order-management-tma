import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

export type ApiError =
  | { kind: 'schema'; sheet: string; missing: string[] }
  | { kind: 'parse'; message: string }
  | { kind: 'pipeline'; message: string };

function XCircleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6 shrink-0 mt-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

export function ErrorDisplay({ error }: { error: ApiError }) {
  if (error.kind === 'schema') {
    return (
      <Alert variant="destructive" className="mt-4">
        <div className="flex gap-3 items-start">
          <XCircleIcon />
          <div className="flex-1">
            <AlertTitle>Sheet &quot;{error.sheet}&quot; is missing required columns</AlertTitle>
            <AlertDescription>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {error.missing.map((m) => (
                  <code
                    key={m}
                    className="inline-flex rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs"
                  >
                    {m}
                  </code>
                ))}
              </div>
              <p className="mt-2">Re-export from Shopee or check that you uploaded the right file.</p>
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }
  if (error.kind === 'parse') {
    return (
      <Alert variant="destructive" className="mt-4">
        <div className="flex gap-3 items-start">
          <XCircleIcon />
          <div className="flex-1">
            <AlertTitle>Could not read the file</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" className="mt-4">
      <div className="flex gap-3 items-start">
        <XCircleIcon />
        <div className="flex-1">
          <AlertTitle>Pipeline error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
