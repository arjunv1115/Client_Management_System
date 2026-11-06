import { ArrowDownUp, ChevronDown, Download, FileJson, Inbox, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { downloadExport } from '../../lib/api';
import { cn } from '../../lib/utils';
import {
  Button, Dropdown, DropdownItem, EmptyState, ErrorState, Pagination, SearchInput, TableSkeleton,
} from '../ui';

/**
 * Shared table surface with server-side search, filters, sorting, pagination and export.
 * All columns are render functions so every module can keep its own visual language.
 */
export default function DataTable({
  columns = [],
  rows = [],
  loading = false,
  error = null,
  onRetry,
  pagination,
  onPageChange,
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  toolbar,
  actions,
  exportResource,
  exportParams = {},
  sort,
  onSortChange,
  onRowClick,
  emptyTitle = 'No records yet',
  emptyDescription = 'Create your first record to get started.',
  emptyIcon = Inbox,
  emptyAction,
  className,
  footer,
  rowKey = (row) => row.id,
}) {
  const sorting = Boolean(onSortChange);

  const toggleSort = (column) => {
    if (!sorting || !column.sortable) return;
    const key = column.sortKey || column.key;
    if (!key) return;
    if (sort === key) onSortChange(`-${key}`);
    else if (sort === `-${key}`) onSortChange(key);
    else onSortChange(`-${key}`);
  };

  const sortIcon = (column) => {
    if (!column.sortable) return null;
    const key = column.sortKey || column.key;
    const active = sort === key || sort === `-${key}`;
    return <ArrowDownUp className={cn('h-3 w-3 transition', active ? 'text-primary' : 'text-muted/50')} />;
  };

  const handleExport = async (format) => {
    if (!exportResource) return;
    try {
      await downloadExport(exportResource, { format, params: { ...exportParams, q: search, sort } });
      toast.success(`Exported ${format.toUpperCase()} file.`);
    } catch (err) {
      toast.error(err.message || 'Export failed.');
    }
  };

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {onSearchChange ? (
            <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} className="w-full sm:max-w-xs" />
          ) : null}
          {filters}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {actions}
          {exportResource ? (
            <Dropdown
              trigger={(
                <Button variant="secondary" size="sm">
                  <Download className="h-3.5 w-3.5" /> Export <ChevronDown className="h-3 w-3" />
                </Button>
              )}
            >
              <DropdownItem icon={Download} onClick={() => handleExport('csv')}>Download CSV</DropdownItem>
              <DropdownItem icon={FileJson} onClick={() => handleExport('json')}>Download JSON</DropdownItem>
            </Dropdown>
          ) : null}
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={Math.min(columns.length, 6)} />
      ) : error ? (
        <ErrorState message={error.message} onRetry={onRetry} />
      ) : !rows.length ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key || column.header}
                      className={cn(column.headerClassName, column.sortable && 'cursor-pointer select-none hover:text-ink')}
                      onClick={() => toggleSort(column)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {column.header}
                        {sortIcon(column)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={cn(onRowClick && 'cursor-pointer')}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key || column.header}
                        className={column.className}
                        onClick={column.stopPropagation ? (event) => event.stopPropagation() : undefined}
                      >
                        {column.render ? column.render(row) : row[column.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {footer}
          {pagination ? <Pagination pagination={pagination} onPageChange={onPageChange} /> : null}
        </>
      )}
    </div>
  );
}

export function TableLoading({ label = 'Loading records…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
