import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '../../hooks/useDebounce';
import { useResource, useResourceActions } from '../../lib/hooks';
import DataTable from './DataTable';
import ResourceForm from './ResourceForm';
import {
  Button, ConfirmDialog, Dropdown, DropdownItem, Modal, PageHeader,
} from '../ui';

/**
 * Generic list + create/edit/delete page. Module pages provide columns, fields,
 * stat cards and optional filters while the plumbing stays consistent.
 */
export default function CrudPage({
  title,
  subtitle,
  eyebrow,
  resource,
  columns,
  fields,
  initialValues = {},
  stats,
  filterDefs = [],
  canWrite = true,
  canDelete = canWrite,
  addLabel = 'Add record',
  editLabel = 'Edit',
  searchPlaceholder = 'Search…',
  defaultSort = '-created_at',
  pageSize = 10,
  headerActions,
  toolbar,
  rowActions,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  modalSize = 'lg',
  formClassName,
  beforeSubmit,
  onSaved,
  extraParams = {},
}) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);
  const [sort, setSort] = useState(defaultSort);
  const [filters, setFilters] = useState(() => Object.fromEntries(filterDefs.map((d) => [d.key, d.defaultValue || ''])));
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const params = useMemo(() => {
    const next = { page, limit: pageSize, sort, ...extraParams };
    if (search) next.q = search;
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) next[key] = value;
    });
    return next;
  }, [page, pageSize, sort, search, filters, extraParams]);

  const query = useResource(resource, params);
  const { create, update, remove } = useResourceActions(resource);
  const rows = query.data?.items || [];
  const pagination = query.data?.pagination;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setModalOpen(true);
  };

  const defaultValues = useMemo(() => (editing ? { ...initialValues, ...editing } : initialValues), [editing, initialValues]);

  const handleSubmit = async (values) => {
    const payload = beforeSubmit ? beforeSubmit(values, editing) : values;
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success(`${title.replace(/s$/, '')} updated.`);
      } else {
        await create.mutateAsync(payload);
        toast.success(`${title.replace(/s$/, '')} created.`);
      }
      setModalOpen(false);
      setEditing(null);
      onSaved?.();
    } catch (error) {
      toast.error(error.message || 'Could not save this record.');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Record deleted.');
      setDeleting(null);
    } catch (error) {
      toast.error(error.message || 'Could not delete this record.');
    }
  };

  const tableColumns = useMemo(() => {
    const base = [...columns];
    if (canWrite || canDelete) {
      base.push({
        key: 'actions',
        header: '',
        className: 'w-10 text-right',
        stopPropagation: true,
        render: (row) => (
          <div className="flex justify-end">
            <Dropdown
              trigger={(
                <button type="button" className="icon-btn h-8 w-8" aria-label="Row actions" onClick={(event) => event.stopPropagation()}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
            >
              {canWrite ? <DropdownItem icon={Pencil} onClick={() => openEdit(row)}>{editLabel}</DropdownItem> : null}
              {rowActions ? rowActions(row, { openEdit }) : null}
              {canDelete ? (
                <DropdownItem icon={Trash2} danger onClick={() => setDeleting(row)}>Delete</DropdownItem>
              ) : null}
            </Dropdown>
          </div>
        ),
      });
    }
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, canWrite, canDelete, rowActions]);

  const filterNodes = filterDefs.length ? filterDefs.map((definition) => (
    <select
      key={definition.key}
      value={filters[definition.key]}
      onChange={(event) => {
        setFilters((current) => ({ ...current, [definition.key]: event.target.value }));
        setPage(1);
      }}
      className="select h-9 w-auto min-w-[140px] text-xs"
      aria-label={definition.label}
    >
      <option value="">{definition.allLabel || `All ${definition.label.toLowerCase()}`}</option>
      {definition.options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        return <option key={value} value={value}>{label}</option>;
      })}
    </select>
  )) : null;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={title}
        subtitle={subtitle}
        eyebrow={eyebrow}
        actions={(
          <>
            {headerActions}
            {canWrite ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> {addLabel}
              </Button>
            ) : null}
          </>
        )}
      />

      {stats ? <div className="mb-5 animate-stagger">{stats}</div> : null}

      <DataTable
        columns={tableColumns}
        rows={rows}
        loading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        pagination={pagination}
        onPageChange={setPage}
        search={searchInput}
        onSearchChange={(value) => { setSearchInput(value); setPage(1); }}
        searchPlaceholder={searchPlaceholder}
        filters={filterNodes}
        toolbar={toolbar}
        sort={sort}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        exportResource={resource}
        exportParams={{ ...filters, ...extraParams }}
        onRowClick={onRowClick}
        emptyTitle={emptyTitle || `No ${title.toLowerCase()} found`}
        emptyDescription={emptyDescription || 'Try changing your filters, or add a new record.'}
        emptyIcon={emptyIcon}
        emptyAction={canWrite ? (
          <Button variant="secondary" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </Button>
        ) : null}
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? `${editLabel} ${title.replace(/s$/, '').toLowerCase()}` : addLabel}
        description={editing ? 'Update the details below.' : 'Fill in the details to add this record.'}
        size={modalSize}
      >
        <ResourceForm
          fields={fields}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
          loading={create.isPending || update.isPending}
          submitLabel={editing ? 'Save changes' : 'Create'}
          className={formClassName}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={remove.isPending}
        title="Delete this record?"
        description="This will remove the record from the workspace. Administrators may restore it from the API."
      />
    </div>
  );
}
