import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

type Props = { count: number };

export function UnmatchedBanner({ count }: Props) {
  if (count === 0) return null;
  return (
    <Alert className="mt-4 border-yellow-300 bg-yellow-50 text-yellow-900">
      <div className="flex gap-3 items-start">
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
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="flex-1">
          <AlertTitle className="text-base font-medium">
            {count} unmatched income row{count === 1 ? '' : 's'}
          </AlertTitle>
          <AlertDescription>
            Some income rows did not match any order on (Order ID, Product Name).
            They are still included in totals, but verify the Orders export covers the same period.
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
