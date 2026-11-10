import { useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Download, Eye, FileArchive, FileText, FolderOpen, Grid2X2, List, Pencil, Plus, Share2,
  Sparkles, Trash2, UploadCloud,
} from 'lucide-react';
import { AiButton, AiCard, AiResult } from '../../components/common/AiAssistant';
import ResourceForm from '../../components/common/ResourceForm';
import { InfoGrid, MiniStat, SectionCard } from '../../components/common/Detail';
import {
  Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, ErrorState, IconButton, Input, Modal,
  PageHeader, SearchInput, Select, Skeleton, StatCard, Switch, Tabs, Textarea,
} from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { useAiInsight, useModuleStats, useResource, useResourceActions, useUpload } from '../../lib/hooks';
import { useLookups } from '../../lib/lookups';
import { useAuth } from '../../contexts/AuthContext';
import { absoluteUrl, api, unwrap } from '../../lib/api';
import { cn, currency, formatDate, formatDateTime, statusTone, timeAgo } from '../../lib/utils';

const CATEGORIES = [
  'Quotations', 'Contracts', 'Invoices', 'Project Documents', 'Client Documents', 'Team Documents', 'Other Documents',
];

const QUOTATION_STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'];
const CONTRACT_STATUSES = ['active', 'expiring', 'completed', 'cancelled'];

function fileIcon(document) {
  const name = String(document.name || document.file_url || '').toLowerCase();
  if (name.endsWith('.zip') || name.endsWith('.rar')) return FileArchive;
  return FileText;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function download(document) {
  const target = absoluteUrl(document.file_url);
  if (!target || (!target.startsWith('/uploads') && !/^https?:/i.test(target))) {
    toast.info('This seed record has no stored binary. Upload a new file to test downloads.');
    return;
  }
  window.open(target, '_blank', 'noopener,noreferrer');
}

function UploadModal({ open, onClose }) {
  const { options } = useLookups();
  const queryClient = useQueryClient();
  const upload = useUpload();
  const [file, setFile] = useState(null);
  const [values, setValues] = useState({
    name: '', category: 'Project Documents', client_id: '', project_id: '', shared_with_client: false,
  });
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setValues({ name: '', category: 'Project Documents', client_id: '', project_id: '', shared_with_client: false });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return toast.error('Choose a file to upload.');
    try {
      await upload.mutateAsync({
        file,
        fields: {
          attach_to_documents: 'true',
          name: values.name || file.name,
          category: values.category,
          client_id: values.client_id || '',
          project_id: values.project_id || '',
          shared_with_client: values.shared_with_client ? 'true' : 'false',
        },
      });
      queryClient.invalidateQueries({ queryKey: ['resource', 'documents'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Document uploaded.');
      reset();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Upload failed.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Upload document"
      description="Files up to 10 MB. Share with the client when it is ready."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button loading={upload.isPending} onClick={submit}><UploadCloud className="h-4 w-4" /> Upload</Button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line bg-surface2/40 px-4 py-7 text-center transition hover:border-primary/40 hover:bg-primary-soft/20"
        >
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"><UploadCloud className="h-5 w-5" /></span>
          <span className="text-sm font-semibold text-ink">{file ? file.name : 'Click to choose a file'}</span>
          <span className="text-[11px] text-muted">{file ? formatBytes(file.size) : 'PDF, ZIP, images and documents · max 10 MB'}</span>
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />

        <Input
          label="Document name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder={file?.name || 'Acme proposal'}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={values.category}
            onChange={(event) => setValues((current) => ({ ...current, category: event.target.value }))}
            options={CATEGORIES}
          />
          <Select
            label="Client"
            value={values.client_id}
            onChange={(event) => setValues((current) => ({ ...current, client_id: event.target.value }))}
            placeholder="No client"
            options={(options.clients || []).map((client) => ({ value: client.id, label: client.label || client.name }))}
          />
        </div>
        <Select
          label="Project"
          value={values.project_id}
          onChange={(event) => setValues((current) => ({ ...current, project_id: event.target.value }))}
          placeholder="No project"
          options={(options.projects || []).map((project) => ({ value: project.id, label: project.name }))}
        />
        <div className="rounded-xl border border-line p-3">
          <Switch
            checked={values.shared_with_client}
            onChange={(checked) => setValues((current) => ({ ...current, shared_with_client: checked }))}
            label="Share with client portal"
            description="Only shared documents are visible to the linked client."
          />
        </div>
      </form>
    </Modal>
  );
}

function DocumentDrawer({ document, onClose, canDelete }) {
  const queryClient = useQueryClient();
  const { names } = useLookups();
  const { update, remove } = useResourceActions('documents');
  const summary = useAiInsight({ url: `/ai/documents/${document?.id}/summary` });
  const [confirm, setConfirm] = useState(false);

  if (!document) return null;

  const toggleShare = async () => {
    try {
      await update.mutateAsync({ id: document.id, shared_with_client: !document.shared_with_client });
      toast.success(document.shared_with_client ? 'Removed from client portal.' : 'Shared with client portal.');
      queryClient.invalidateQueries({ queryKey: ['resource', 'documents'] });
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not update sharing.');
    }
  };

  const destroy = async () => {
    try {
      await remove.mutateAsync(document.id);
      toast.success('Document deleted.');
      setConfirm(false);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not delete this document.');
    }
  };

  return (
    <>
      <Drawer open={Boolean(document)} onClose={onClose} title="Document details" width="w-full max-w-lg">
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
              {(() => { const Icon = fileIcon(document); return <Icon className="h-6 w-6" />; })()}
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-ink">{document.name}</h2>
              <p className="text-xs text-muted">{document.category} · {formatBytes(document.file_size)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone={document.shared_with_client ? 'success' : 'neutral'} dot>{document.shared_with_client ? 'Shared with client' : 'Internal only'}</Badge>
                <Badge tone="info">{document.mime_type || 'file'}</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Uploaded" value={formatDate(document.created_at)} hint={timeAgo(document.created_at)} />
            <MiniStat label="File size" value={formatBytes(document.file_size)} hint={document.mime_type || 'Unknown type'} />
          </div>

          <SectionCard title="Metadata" icon={FolderOpen}>
            <InfoGrid
              items={[
                { label: 'Client', value: names.client(document.client_id) },
                { label: 'Project', value: names.project(document.project_id) },
                { label: 'Uploaded by', value: names.person(document.uploaded_by) },
                { label: 'Updated', value: formatDateTime(document.updated_at) },
              ]}
            />
          </SectionCard>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => download(document)}><Download className="h-3.5 w-3.5" /> Download</Button>
            <Button size="sm" variant="secondary" onClick={toggleShare} loading={update.isPending}>
              <Share2 className="h-3.5 w-3.5" /> {document.shared_with_client ? 'Stop sharing' : 'Share with client'}
            </Button>
            {canDelete ? (
              <Button size="sm" variant="danger" onClick={() => setConfirm(true)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
            ) : null}
          </div>

          <AiCard
            title="AI document assistant"
            subtitle="Summaries are suggestions and require human review"
            action={<AiButton onClick={() => summary.mutate({})} loading={summary.isPending}>Summarise</AiButton>}
          >
            <AiResult
              result={summary.data}
              loading={summary.isPending}
              error={summary.error}
              onRetry={() => summary.mutate({})}
              feature="document_assistant"
              entity="documents"
              entityId={document.id}
              useLabel="Accept summary"
            />
            <p className="mt-2 text-[11px] text-muted">Full text extraction depends on the uploaded file. Metadata summary works in local mode.</p>
          </AiCard>
        </div>
      </Drawer>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={destroy}
        loading={remove.isPending}
        title="Delete this document?"
        description="The record will be removed from the library. This does not delete the stored file automatically."
      />
    </>
  );
}

function QuotationBuilder({ open, onClose }) {
  const { options } = useLookups();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ title: '', client_id: '', description: '', quantity: 1, rate: 50000, tax_rate: 18, discount: 0 });
  const [draft, setDraft] = useState(null);
  const generate = useAiInsight({ url: '/ai/quotation' });
  const save = useMutation({
    mutationFn: async () => {
      return unwrap(await api.post('/ai/quotation/save', { approved: true, draft: draft.draft }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource', 'quotations'] });
      toast.success('Quotation approved and saved.');
      setDraft(null);
      onClose();
    },
    onError: (error) => toast.error(error.message || 'Could not save quotation.'),
  });

  const run = () => {
    if (!values.title.trim()) return toast.error('Add a quotation title.');
    generate.mutate({
      title: values.title,
      client_id: values.client_id || undefined,
      services: [{ description: values.description || values.title, quantity: Number(values.quantity || 1), rate: Number(values.rate || 0) }],
      tax_rate: Number(values.tax_rate || 0),
      discount: Number(values.discount || 0),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="AI quotation builder" description="Draft pricing and copy, review it, then approve before saving." size="lg">
      <div className="grid gap-4 lg:grid-cols-2">
        <ResourceForm
          fields={[
            { name: 'title', label: 'Quotation title', required: true, span: 2 },
            { name: 'client_id', label: 'Client', type: 'select', options: (options.clients || []).map((client) => ({ value: client.id, label: client.label || client.name })) },
            { name: 'quantity', label: 'Quantity', type: 'number', min: 1 },
            { name: 'description', label: 'Service / scope', span: 2, placeholder: 'Website design and build' },
            { name: 'rate', label: 'Rate (₹)', type: 'number', min: 0 },
            { name: 'tax_rate', label: 'Tax rate (%)', type: 'number', min: 0 },
            { name: 'discount', label: 'Discount (₹)', type: 'number', min: 0 },
          ]}
          defaultValues={values}
          onSubmit={(next) => { setValues({ ...values, ...next }); run(); }}
          submitLabel="Generate draft"
          loading={generate.isPending}
        />
        <div className="space-y-3">
          <AiResult
            result={generate.data}
            loading={generate.isPending}
            error={generate.error}
            onRetry={run}
            feature="quotation_builder"
            entity="quotations"
            useLabel="Approve draft"
            onUse={() => setDraft(generate.data)}
          />
          {generate.data?.draft ? (
            <div className="rounded-xl border border-line bg-surface2/40 p-3 text-xs text-muted">
              <p className="font-semibold text-ink">Draft totals</p>
              <div className="mt-2 space-y-1">
                <p className="flex justify-between"><span>Subtotal</span><span className="font-semibold text-ink">{currency(generate.data.draft.subtotal)}</span></p>
                <p className="flex justify-between"><span>Tax</span><span className="font-semibold text-ink">{currency(generate.data.draft.tax)}</span></p>
                <p className="flex justify-between"><span>Discount</span><span className="font-semibold text-ink">{currency(generate.data.draft.discount)}</span></p>
                <p className="flex justify-between border-t border-line pt-1"><span>Total</span><span className="font-bold text-ink">{currency(generate.data.draft.total)}</span></p>
              </div>
            </div>
          ) : null}
          <Button className="w-full" disabled={!generate.data?.draft} loading={save.isPending} onClick={() => (draft || generate.data ? save.mutate() : null)}>
            <Sparkles className="h-4 w-4" /> Approve & save quotation
          </Button>
          <p className="text-[11px] text-muted">Approval is required before any AI draft is written to the database.</p>
        </div>
      </div>
    </Modal>
  );
}

function QuotationForm({ editing, open, onClose }) {
  const { options } = useLookups();
  const { create, update } = useResourceActions('quotations');
  const fields = useMemo(() => [
    { name: 'title', label: 'Title', required: true, span: 2 },
    { name: 'client_id', label: 'Client', type: 'select', required: true, options: (options.clients || []).map((client) => ({ value: client.id, label: client.label || client.name })) },
    { name: 'project_id', label: 'Project', type: 'select', options: (options.projects || []).map((project) => ({ value: project.id, label: project.name })) },
    { name: 'subtotal', label: 'Subtotal (₹)', type: 'number', min: 0 },
    { name: 'discount', label: 'Discount (₹)', type: 'number', min: 0 },
    { name: 'tax', label: 'Tax (₹)', type: 'number', min: 0 },
    { name: 'total', label: 'Total (₹)', type: 'number', min: 0 },
    { name: 'valid_until', label: 'Valid until', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: QUOTATION_STATUSES },
    { name: 'content', label: 'Proposal content', type: 'textarea', span: 2, rows: 5 },
    { name: 'terms', label: 'Terms', type: 'textarea', span: 2, rows: 3 },
  ], [options.clients, options.projects]);

  const submit = async (values) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...values });
      else await create.mutateAsync(values);
      toast.success(editing ? 'Quotation updated.' : 'Quotation created.');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not save this quotation.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit quotation' : 'New quotation'} size="lg">
      <ResourceForm
        fields={fields}
        defaultValues={editing || { status: 'draft', subtotal: 0, tax: 0, discount: 0, total: 0 }}
        onSubmit={submit}
        onCancel={onClose}
        loading={create.isPending || update.isPending}
        submitLabel={editing ? 'Save changes' : 'Create quotation'}
      />
    </Modal>
  );
}

function ContractForm({ editing, open, onClose }) {
  const { options } = useLookups();
  const { create, update } = useResourceActions('contracts');
  const fields = [
    { name: 'title', label: 'Contract title', required: true, span: 2 },
    { name: 'client_id', label: 'Client', type: 'select', required: true, options: (options.clients || []).map((client) => ({ value: client.id, label: client.label || client.name })) },
    { name: 'value', label: 'Contract value (₹)', type: 'number', min: 0 },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'end_date', label: 'Expiry date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: CONTRACT_STATUSES },
    { name: 'file_url', label: 'File URL', placeholder: '/uploads/contract.pdf or https://…', span: 2 },
  ];

  const submit = async (values) => {
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...values });
      else await create.mutateAsync(values);
      toast.success(editing ? 'Contract updated.' : 'Contract created.');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not save this contract.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit contract' : 'New contract'} size="lg">
      <ResourceForm
        fields={fields}
        defaultValues={editing || { status: 'active', value: 0 }}
        onSubmit={submit}
        onCancel={onClose}
        loading={create.isPending || update.isPending}
        submitLabel={editing ? 'Save changes' : 'Create contract'}
      />
    </Modal>
  );
}

export function DocumentsPage() {
  const { isManager } = useAuth();
  const { names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.documents || {};
  const [tab, setTab] = useState('library');
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const [category, setCategory] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [quotationForm, setQuotationForm] = useState(null);
  const [contractForm, setContractForm] = useState(null);

  const documentParams = useMemo(() => {
    const params = { limit: 60, sort: '-created_at' };
    if (debounced) params.q = debounced;
    if (category) params.category = category;
    return params;
  }, [debounced, category]);

  const documentsQuery = useResource('documents', documentParams);
  const quotationsQuery = useResource('quotations', { limit: 100, sort: '-created_at' });
  const contractsQuery = useResource('contracts', { limit: 100, sort: '-created_at' });
  const documents = documentsQuery.data?.items || [];
  const quotations = quotationsQuery.data?.items || [];
  const contracts = contractsQuery.data?.items || [];

  const quotationStats = useMemo(() => ({
    total: quotations.reduce((sum, row) => sum + Number(row.total || 0), 0),
    accepted: quotations.filter((row) => row.status === 'accepted').length,
    pending: quotations.filter((row) => ['draft', 'sent'].includes(row.status)).length,
  }), [quotations]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Delivery"
        title="Documents"
        subtitle="A secure library for proposals, contracts, invoices and client files — with reviewed AI summaries."
        actions={(
          <>
            <Button variant="secondary" onClick={() => setBuilderOpen(true)}><Sparkles className="h-4 w-4" /> AI quotation</Button>
            <Button onClick={() => setUploadOpen(true)}><UploadCloud className="h-4 w-4" /> Upload</Button>
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documents" value={stats.total ?? documents.length} hint="In the library" icon={FileText} loading={statsQuery.isLoading} />
        <StatCard label="Shared with clients" value={stats.shared ?? 0} hint="Visible in portal" icon={Share2} tone="success" loading={statsQuery.isLoading} />
        <StatCard label="Quotations" value={quotations.length} hint={`${quotationStats.accepted} accepted`} icon={FolderOpen} tone="info" loading={quotationsQuery.isLoading} />
        <StatCard label="Contracts" value={contracts.length} hint={`${contracts.filter((row) => row.status === 'active').length} active`} icon={FileArchive} tone="warning" loading={contractsQuery.isLoading} />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'library', label: 'Document library', count: documents.length },
          { value: 'quotations', label: 'Quotations', count: quotations.length },
          { value: 'contracts', label: 'Contracts', count: contracts.length },
        ]}
      />

      {tab === 'library' ? (
        <>
          <Card className="mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search documents…" className="w-full sm:max-w-xs" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="select h-9 w-auto min-w-[170px] text-xs" aria-label="Document category">
              <option value="">All categories</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-line p-0.5">
              <IconButton label="Grid view" onClick={() => setView('grid')} className={cn('h-7 w-7', view === 'grid' && 'bg-primary-soft text-primary')}><Grid2X2 className="h-3.5 w-3.5" /></IconButton>
              <IconButton label="List view" onClick={() => setView('list')} className={cn('h-7 w-7', view === 'list' && 'bg-primary-soft text-primary')}><List className="h-3.5 w-3.5" /></IconButton>
            </div>
          </Card>

          {documentsQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
            </div>
          ) : documentsQuery.isError ? (
            <ErrorState message={documentsQuery.error?.message} onRetry={documentsQuery.refetch} />
          ) : !documents.length ? (
            <Card><EmptyState icon={FileText} title="No documents found" description="Upload a file or adjust the category filter." action={<Button size="sm" variant="secondary" onClick={() => setUploadOpen(true)}>Upload document</Button>} /></Card>
          ) : view === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {documents.map((document) => {
                const Icon = fileIcon(document);
                return (
                  <Card key={document.id} hover className="cursor-pointer p-4" onClick={() => setDetail(document)}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{document.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">{document.category} · {formatBytes(document.file_size)}</p>
                      </div>
                      <IconButton label="View document" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); setDetail(document); }}><Eye className="h-3.5 w-3.5" /></IconButton>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <span className="truncate text-[11px] text-muted">{names.client(document.client_id)}</span>
                      <div className="flex items-center gap-1.5">
                        {document.shared_with_client ? <Badge tone="success" dot>Shared</Badge> : <Badge tone="neutral">Internal</Badge>}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                      <span>{formatDate(document.created_at)}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" className="icon-btn h-6 w-6" aria-label="Download" onClick={(event) => { event.stopPropagation(); download(document); }}><Download className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="overflow-hidden">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Document</th><th>Category</th><th>Client</th><th>Size</th><th>Shared</th><th>Added</th><th /></tr></thead>
                  <tbody>
                    {documents.map((document) => (
                      <tr key={document.id} className="cursor-pointer" onClick={() => setDetail(document)}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">{(() => { const Icon = fileIcon(document); return <Icon className="h-4 w-4" />; })()}</span>
                            <span className="max-w-[260px] truncate font-semibold text-ink">{document.name}</span>
                          </div>
                        </td>
                        <td className="text-muted">{document.category}</td>
                        <td className="text-muted">{names.client(document.client_id)}</td>
                        <td className="whitespace-nowrap text-muted">{formatBytes(document.file_size)}</td>
                        <td>{document.shared_with_client ? <Badge tone="success">Shared</Badge> : <Badge tone="neutral">Internal</Badge>}</td>
                        <td className="whitespace-nowrap text-muted">{formatDate(document.created_at)}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <IconButton label="Download" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); download(document); }}><Download className="h-3.5 w-3.5" /></IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : null}

      {tab === 'quotations' ? (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Quotation register</p>
              <p className="text-[11px] text-muted">{quotationStats.pending} awaiting a decision · {currency(quotationStats.total)} total value</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBuilderOpen(true)}><Sparkles className="h-3.5 w-3.5" /> AI draft</Button>
              <Button size="sm" onClick={() => setQuotationForm({ editing: null })}><Plus className="h-3.5 w-3.5" /> New quotation</Button>
            </div>
          </div>
          {quotationsQuery.isLoading ? (
            <div className="grid place-items-center py-12"><Skeleton className="h-8 w-40" /></div>
          ) : quotations.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Number</th><th>Title</th><th>Client</th><th>Total</th><th>Valid until</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {quotations.map((row) => (
                    <tr key={row.id}>
                      <td className="font-mono text-[11px] font-semibold text-ink">{row.number}</td>
                      <td className="max-w-[240px] truncate font-medium text-ink">{row.title}</td>
                      <td className="text-muted">{names.client(row.client_id)}</td>
                      <td className="whitespace-nowrap font-semibold text-ink">{currency(row.total)}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(row.valid_until)}</td>
                      <td><Badge tone={statusTone(row.status)} dot>{row.status}</Badge></td>
                      <td>
                        <div className="flex justify-end">
                          <IconButton label="Edit quotation" className="h-7 w-7" onClick={() => setQuotationForm({ editing: row })}><Pencil className="h-3.5 w-3.5" /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={FileText} title="No quotations yet" description="Create a quotation manually or generate one with the AI builder." action={<Button size="sm" variant="secondary" onClick={() => setBuilderOpen(true)}>Build with AI</Button>} />
          )}
        </Card>
      ) : null}

      {tab === 'contracts' ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-3">
            <div>
              <p className="text-sm font-semibold text-ink">Contracts</p>
              <p className="text-[11px] text-muted">{contracts.filter((row) => row.status === 'expiring').length} expiring soon · {isManager ? 'You can manage contracts' : 'Read only'}</p>
            </div>
            {isManager ? <Button size="sm" onClick={() => setContractForm({ editing: null })}><Plus className="h-3.5 w-3.5" /> New contract</Button> : null}
          </div>
          {contractsQuery.isLoading ? (
            <div className="grid place-items-center py-12"><Skeleton className="h-8 w-40" /></div>
          ) : contracts.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Contract</th><th>Client</th><th>Value</th><th>Start</th><th>Expiry</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {contracts.map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-[260px] truncate font-semibold text-ink">{row.title}</td>
                      <td className="text-muted">{names.client(row.client_id)}</td>
                      <td className="whitespace-nowrap font-semibold text-ink">{currency(row.value)}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(row.start_date)}</td>
                      <td className="whitespace-nowrap text-muted">{formatDate(row.end_date)}</td>
                      <td><Badge tone={statusTone(row.status)} dot>{row.status}</Badge></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {row.file_url ? <IconButton label="Open contract" className="h-7 w-7" onClick={() => download(row)}><Download className="h-3.5 w-3.5" /></IconButton> : null}
                          {isManager ? <IconButton label="Edit contract" className="h-7 w-7" onClick={() => setContractForm({ editing: row })}><Pencil className="h-3.5 w-3.5" /></IconButton> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={FileArchive} title="No contracts yet" description="Add a contract to track renewals and expiry." action={isManager ? <Button size="sm" variant="secondary" onClick={() => setContractForm({ editing: null })}>New contract</Button> : null} />
          )}
        </Card>
      ) : null}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <DocumentDrawer document={detail} onClose={() => setDetail(null)} canDelete={isManager} />
      <QuotationBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
      <QuotationForm
        open={Boolean(quotationForm)}
        editing={quotationForm?.editing}
        onClose={() => setQuotationForm(null)}
      />
      <ContractForm
        open={Boolean(contractForm)}
        editing={contractForm?.editing}
        onClose={() => setContractForm(null)}
      />
    </div>
  );
}

export default DocumentsPage;
