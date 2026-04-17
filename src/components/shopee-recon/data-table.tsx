import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '~/components/ui/table';

type Column<T> = {
  key: keyof T;
  header: string;
  format?: (v: T[keyof T]) => string;
  align?: 'left' | 'right';
};

type Props<T extends Record<string, unknown>> = {
  rows: T[];
  columns: Column<T>[];
  footer?: Partial<Record<keyof T, string>>;
};

export function DataTable<T extends Record<string, unknown>>({ rows, columns, footer }: Props<T>) {
  return (
    <div className="max-h-[65vh] overflow-auto rounded-xl border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <TableRow className="border-b">
            {columns.map((c) => (
              <TableHead
                key={String(c.key)}
                className={c.align === 'right' ? 'text-right' : 'text-left'}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="py-2 text-center text-sm text-muted-foreground"
              >
                No rows
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r, i) => (
              <TableRow key={i} className="even:bg-muted/30">
                {columns.map((c) => (
                  <TableCell
                    key={String(c.key)}
                    className={[
                      'py-2 tabular-nums',
                      c.align === 'right' ? 'text-right' : 'text-left',
                    ].join(' ')}
                  >
                    {c.format ? c.format(r[c.key]) : String(r[c.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
        {footer && (
          <TableFooter>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={String(c.key)}
                  className={[
                    'py-2 tabular-nums font-semibold',
                    c.align === 'right' ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  {footer[c.key] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
