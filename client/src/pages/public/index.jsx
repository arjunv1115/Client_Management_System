import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, Copy, ExternalLink, Globe2,
  Instagram, Layers, Linkedin, Mail, MapPin, Menu, Palette, Pencil, Phone, Plus, Rocket,
  ShieldCheck, Sparkles, Star, Trash2, TrendingUp, Users, X,
} from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { useResource, useResourceActions } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { cn, currency, formatDate, resolveImage, statusTone } from '../../lib/utils';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Input, Modal, PageHeader,
  Skeleton, Switch, Textarea,
} from '../../components/ui';

/* ================================================================ manager */
const toJson = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
};

const blankPage = {
  business_name: '', slug: '', tagline: '', description: '', email: '', phone: '', website: '',
  address: '', logo_url: '', published: false, services: [], portfolio: [], socials: {},
};

function PageEditor({ open, page, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...blankPage,
    ...(page || {}),
    servicesText: JSON.stringify(page?.services || [], null, 2),
    portfolioText: JSON.stringify(page?.portfolio || [], null, 2),
    socialsText: JSON.stringify(page?.socials || {}, null, 2),
  }));
  const [saving, setSaving] = useState(false);
  const { create, update } = useResourceActions('public_pages');

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        business_name: form.business_name,
        slug: String(form.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
        tagline: form.tagline,
        description: form.description,
        email: form.email,
        phone: form.phone,
        website: form.website,
        address: form.address,
        logo_url: form.logo_url,
        published: Boolean(form.published),
        services: toJson(form.servicesText, []),
        portfolio: toJson(form.portfolioText, []),
        socials: toJson(form.socialsText, {}),
      };
      if (!payload.business_name || !payload.slug) throw new Error('Business name and slug are required.');
      if (page) await update.mutateAsync({ id: page.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(page ? 'Public page updated.' : 'Public page created.');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not save the public page.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={page ? 'Edit public page' : 'Create public page'} description="This page is public and can capture leads without a login." size="xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" required><Input value={form.business_name} onChange={(event) => set('business_name', event.target.value)} required placeholder="PixelForge Studio" /></Field>
          <Field label="Slug" required help="Public URL: /p/your-slug"><Input value={form.slug} onChange={(event) => set('slug', event.target.value)} required placeholder="pixelforge" /></Field>
          <Field label="Tagline" className="sm:col-span-2"><Input value={form.tagline || ''} onChange={(event) => set('tagline', event.target.value)} placeholder="Design that turns attention into growth." /></Field>
          <Field label="About" className="sm:col-span-2"><Textarea rows={3} value={form.description || ''} onChange={(event) => set('description', event.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email || ''} onChange={(event) => set('email', event.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone || ''} onChange={(event) => set('phone', event.target.value)} /></Field>
          <Field label="Website"><Input value={form.website || ''} onChange={(event) => set('website', event.target.value)} /></Field>
          <Field label="Logo URL"><Input value={form.logo_url || ''} onChange={(event) => set('logo_url', event.target.value)} /></Field>
          <Field label="Address" className="sm:col-span-2"><Input value={form.address || ''} onChange={(event) => set('address', event.target.value)} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Services (JSON)" help='[{"title":"Brand Identity","description":"…"}]'>
            <Textarea rows={6} value={form.servicesText} onChange={(event) => set('servicesText', event.target.value)} className="font-mono text-[11px]" />
          </Field>
          <Field label="Portfolio (JSON)" help='[{"title":"Acme Studios","description":"…"}]'>
            <Textarea rows={6} value={form.portfolioText} onChange={(event) => set('portfolioText', event.target.value)} className="font-mono text-[11px]" />
          </Field>
        </div>
        <Field label="Social links (JSON)" help='{"linkedin":"https://…","instagram":"https://…"}'>
          <Textarea rows={3} value={form.socialsText} onChange={(event) => set('socialsText', event.target.value)} className="font-mono text-[11px]" />
        </Field>
        <label className="flex items-center justify-between rounded-xl border border-line p-3">
          <span>
            <span className="block text-xs font-semibold text-ink">Publish this page</span>
            <span className="block text-[11px] text-muted">Unpublished pages return a friendly 404.</span>
          </span>
          <Switch checked={Boolean(form.published)} onChange={(value) => set('published', value)} />
        </label>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>{page ? 'Save changes' : 'Create page'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function PublicPageManager() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const query = useResource('public_pages', { limit: 50, sort: '-created_at' });
  const { remove } = useResourceActions('public_pages');
  const [editor, setEditor] = useState({ open: false, page: null });
  const [deleting, setDeleting] = useState(null);

  const pages = query.data?.items || [];
  const publicUrl = (slug) => `${window.location.origin}/p/${slug}`;

  const copy = async (slug) => {
    try {
      await navigator.clipboard.writeText(publicUrl(slug));
      toast.success('Public link copied.');
    } catch {
      toast.error('Copy failed. You can copy the URL from the browser.');
    }
  };

  const del = useMutation({
    mutationFn: async (page) => remove.mutateAsync(page.id),
    onSuccess: () => {
      toast.success('Public page deleted.');
      setDeleting(null);
      queryClient.invalidateQueries({ queryKey: ['resource', 'public_pages'] });
    },
    onError: (error) => toast.error(error.message || 'Could not delete the page.'),
  });

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Public page"
        subtitle="Your shareable agency page — publish services, portfolio and a lead form."
        eyebrow="Growth"
        actions={isAdmin ? <Button onClick={() => setEditor({ open: true, page: null })}><Plus className="h-4 w-4" /> New public page</Button> : null}
      />

      {query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : query.isError ? (
        <ErrorState message={query.error?.message} onRetry={query.refetch} />
      ) : !pages.length ? (
        <Card><EmptyState icon={Globe2} title="No public page yet" description="Create a public page to start capturing leads." action={isAdmin ? <Button size="sm" onClick={() => setEditor({ open: true, page: null })}><Plus className="h-3.5 w-3.5" /> Create page</Button> : null} /></Card>
      ) : (
        <div className="space-y-4">
          {pages.map((page) => (
            <Card key={page.id} className="overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-glow"><Globe2 className="h-5 w-5" /></span>
                    <div>
                      <h3 className="font-display text-base font-bold text-ink">{page.business_name}</h3>
                      <p className="text-[11px] text-muted">/p/{page.slug}</p>
                    </div>
                    <Badge tone={page.published ? 'success' : 'warning'} dot>{page.published ? 'published' : 'draft'}</Badge>
                    <Badge tone="neutral">{page.services?.length || 0} services</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted">{page.tagline || page.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted">
                    {page.email ? <span className="inline-flex items-center gap-1 rounded-lg bg-surface2 px-2 py-1"><Mail className="h-3 w-3" /> {page.email}</span> : null}
                    {page.phone ? <span className="inline-flex items-center gap-1 rounded-lg bg-surface2 px-2 py-1"><Phone className="h-3 w-3" /> {page.phone}</span> : null}
                    {page.address ? <span className="inline-flex items-center gap-1 rounded-lg bg-surface2 px-2 py-1"><MapPin className="h-3 w-3" /> {page.address}</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => window.open(`/p/${page.slug}`, '_blank', 'noopener')}><ExternalLink className="h-3.5 w-3.5" /> Open page</Button>
                    <Button size="sm" variant="secondary" onClick={() => copy(page.slug)}><Copy className="h-3.5 w-3.5" /> Copy link</Button>
                    {isAdmin ? <Button size="sm" variant="soft" onClick={() => setEditor({ open: true, page })}><Pencil className="h-3.5 w-3.5" /> Edit</Button> : null}
                    {isAdmin ? <Button size="sm" variant="ghost" className="text-danger" onClick={() => setDeleting(page)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button> : null}
                  </div>
                </div>
                <div className="relative hidden overflow-hidden border-l border-line bg-gradient-to-br from-primary-soft via-surface to-violet-500/10 p-5 lg:block">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Live preview</p>
                  <p className="mt-2 font-display text-lg font-bold text-ink">{page.business_name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{page.tagline}</p>
                  <div className="mt-3 grid gap-2">
                    {(page.services || []).slice(0, 3).map((service) => (
                      <div key={service.title} className="rounded-lg border border-line bg-surface/80 px-3 py-2 text-[11px]">
                        <span className="font-semibold text-ink">{service.title}</span>
                        <span className="mt-0.5 block line-clamp-1 text-muted">{service.description}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] text-muted">Last updated {formatDate(page.updated_at)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Rocket, title: 'Capture leads', text: 'Every enquiry becomes a scored lead in your pipeline automatically.' },
          { icon: Users, title: 'No login needed', text: 'Share a clean public URL with prospects and partners.' },
          { icon: ShieldCheck, title: 'You control visibility', text: 'Publish when ready. Unpublished pages are hidden instantly.' },
        ].map((item) => (
          <div key={item.title} className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><item.icon className="h-4 w-4" /></span>
            <div><p className="text-xs font-semibold text-ink">{item.title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-muted">{item.text}</p></div>
          </div>
        ))}
      </div>

      <PageEditor
        key={editor.page?.id || 'new'}
        open={editor.open}
        page={editor.page}
        onClose={() => setEditor({ open: false, page: null })}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['resource', 'public_pages'] })}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => del.mutate(deleting)}
        loading={del.isPending}
        title="Delete this public page?"
        description="The public URL will stop working immediately. Captured leads stay in your pipeline."
      />
    </div>
  );
}

/* ============================================================ public page */
function PublicNav({ page }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2">
          {page.logo_url ? (
            <img src={resolveImage(page.logo_url)} alt="" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 font-display text-sm font-extrabold text-white">{page.business_name?.[0] || 'P'}</span>
          )}
          <span className="font-display text-sm font-bold tracking-tight text-ink">{page.business_name}</span>
        </a>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-muted md:flex">
          <a href="#services" className="hover:text-ink">Services</a>
          <a href="#work" className="hover:text-ink">Work</a>
          <a href="#contact" className="hover:text-ink">Contact</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden text-xs font-semibold text-muted hover:text-ink sm:block">Client sign in</Link>
          <a href="#contact" className="btn-primary btn-sm hidden sm:inline-flex">Start a project</a>
          <button type="button" className="icon-btn md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <a href="#services" className="nav-link" onClick={() => setOpen(false)}>Services</a>
          <a href="#work" className="nav-link" onClick={() => setOpen(false)}>Work</a>
          <a href="#contact" className="nav-link" onClick={() => setOpen(false)}>Contact</a>
        </div>
      ) : null}
    </header>
  );
}

export function PublicBusinessPage() {
  const { slug } = useParams();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', service: '', message: '' });
  const [sending, setSending] = useState(false);

  const query = useQuery({
    queryKey: ['public-page', slug],
    queryFn: async () => {
      const response = await api.get(`/public/pages/${slug}`);
      return unwrap(response);
    },
    retry: 1,
  });

  const page = query.data?.page;
  const organization = query.data?.organization;

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      const response = await api.post(`/public/pages/${slug}/contact`, form);
      toast.success(response.data?.data?.message || 'Thanks — your enquiry has been received.');
      setForm({ name: '', email: '', phone: '', company: '', service: '', message: '' });
    } catch (error) {
      toast.error(error.message || 'Could not send your enquiry.');
    } finally {
      setSending(false);
    }
  };

  if (query.isLoading) {
    return <div className="mx-auto max-w-6xl space-y-4 px-4 py-20"><Skeleton className="h-8 w-40" /><Skeleton className="h-28" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div></div>;
  }
  if (query.isError || !page) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Globe2 className="h-6 w-6" /></span>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink">This page isn't available</h1>
          <p className="mt-2 text-sm text-muted">The page may be unpublished, or the link may be incorrect.</p>
          <Link to="/" className="btn-primary btn-md mt-5">Go to homepage</Link>
        </div>
      </div>
    );
  }

  const socialLinks = Object.entries(page.socials || {}).filter(([, value]) => value);

  return (
    <div id="top" className="min-h-screen bg-canvas">
      <PublicNav page={page} />

      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
          <div>
            <Badge tone="primary">Available for new projects</Badge>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              {page.business_name}
            </h1>
            <p className="mt-4 max-w-2xl font-display text-xl font-medium leading-snug text-ink/90 sm:text-2xl">{page.tagline}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{page.description}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              <a href="#contact" className="btn-primary btn-lg">Start a project <ArrowRight className="h-4 w-4" /></a>
              <a href="#work" className="btn-secondary btn-lg">See our work</a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-5 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-warning" /> Trusted by {new Set((page.portfolio || []).map((p) => p.title)).size || 8}+ teams</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /> {organization?.name || page.business_name}</span>
              {page.website ? <a href={page.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">{page.website.replace(/^https?:\/\//, '')} <ArrowUpRight className="h-3 w-3" /></a> : null}
            </div>
          </div>
          <div className="relative">
            <div className="card overflow-hidden p-5">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                <span className="ml-2 text-[10px] text-muted">{page.slug}.studio</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-gradient-to-br from-primary to-violet-500 p-4 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Featured work</p>
                  <p className="mt-1 font-display text-lg font-bold">{(page.portfolio || [])[0]?.title || 'A brand built to last'}</p>
                  <p className="mt-1 text-[11px] text-white/80">{(page.portfolio || [])[0]?.description || 'Strategy, design and build.'}</p>
                  <div className="mt-3 flex gap-1.5">
                    <span className="h-1 w-10 rounded-full bg-white/80" />
                    <span className="h-1 w-5 rounded-full bg-white/30" />
                    <span className="h-1 w-5 rounded-full bg-white/30" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line p-3"><Layers className="h-4 w-4 text-primary" /><p className="mt-2 text-[10px] text-muted">Services</p><p className="font-display text-lg font-bold text-ink">{page.services?.length || 0}</p></div>
                  <div className="rounded-xl border border-line p-3"><TrendingUp className="h-4 w-4 text-success" /><p className="mt-2 text-[10px] text-muted">Avg. growth</p><p className="font-display text-lg font-bold text-ink">+38%</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">What we do</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Services built around outcomes.</h2>
          <p className="mt-2 text-sm text-muted">A focused team for design, build and growth — no hand-offs, no bloat.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(page.services || []).map((service, index) => (
            <div key={service.title} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-float">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Palette className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">{service.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{service.description}</p>
                </div>
                <span className="ml-auto text-[10px] font-bold text-muted">0{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="work" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Selected work</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Proof, not promises.</h2>
            </div>
            <a href="#contact" className="text-xs font-semibold text-primary hover:underline">Work with us <ChevronRight className="inline h-3 w-3" /></a>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(page.portfolio || []).map((project) => (
              <div key={project.title} className="card overflow-hidden">
                <div className="grid h-28 place-items-center bg-gradient-to-br from-primary/15 to-violet-500/20">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface text-primary shadow-soft"><Sparkles className="h-5 w-5" /></span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-ink">{project.title}</p>
                  <p className="mt-1 text-[11px] text-muted">{project.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Let's talk</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Tell us what you're building.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Share a little context and we'll reply within one business day with next steps. Enquiries land directly in our pipeline.</p>
            <div className="mt-6 space-y-3">
              {page.email ? <a href={`mailto:${page.email}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/30"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Mail className="h-4 w-4" /></span><span className="text-xs font-medium text-ink">{page.email}</span></a> : null}
              {page.phone ? <a href={`tel:${page.phone}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/30"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><Phone className="h-4 w-4" /></span><span className="text-xs font-medium text-ink">{page.phone}</span></a> : null}
              {page.address ? <div className="flex items-center gap-3 rounded-xl border border-line p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><MapPin className="h-4 w-4" /></span><span className="text-xs font-medium text-ink">{page.address}</span></div> : null}
            </div>
            {socialLinks.length ? (
              <div className="mt-5 flex gap-2">
                {socialLinks.map(([key, value]) => (
                  <a key={key} href={value} target="_blank" rel="noreferrer" className="icon-btn" aria-label={key}>
                    {key === 'linkedin' ? <Linkedin className="h-4 w-4" /> : key === 'instagram' ? <Instagram className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
          <Card className="p-5 sm:p-6">
            <form onSubmit={submit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Your name" required><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="Maya Rao" /></Field>
                <Field label="Work email" required><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="maya@company.com" /></Field>
                <Field label="Company"><Input value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} placeholder="Company name" /></Field>
                <Field label="Phone"><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+91 …" /></Field>
              </div>
              <Field label="What do you need?">
                <select className="select" value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })}>
                  <option value="">Choose a service</option>
                  {(page.services || []).map((service) => <option key={service.title} value={service.title}>{service.title}</option>)}
                  <option value="Something else">Something else</option>
                </select>
              </Field>
              <Field label="Project details"><Textarea rows={4} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Goals, timeline, budget range…" /></Field>
              <Button type="submit" className="w-full" loading={sending}>Send enquiry <ArrowRight className="h-4 w-4" /></Button>
              <p className="text-center text-[10px] text-muted">By sending this enquiry you agree to be contacted about your project.</p>
            </form>
          </Card>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-[11px] text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {page.business_name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-ink">Client sign in</Link>
            <Link to="/" className="hover:text-ink">Powered by PixelForge</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =============================================================== landing */
export function LandingPage() {
  const plansQuery = useQuery({
    queryKey: ['public-plans'],
    queryFn: async () => unwrap(await api.get('/public/plans')),
    staleTime: 5 * 60 * 1000,
  });
  const plans = plansQuery.data || [];

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 font-display text-base font-extrabold text-white shadow-glow">P</span>
            <span className="font-display text-sm font-bold tracking-tight text-ink">PixelForge Client OS</span>
          </Link>
          <nav className="hidden items-center gap-6 text-xs font-semibold text-muted md:flex">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#workflow" className="hover:text-ink">Workflow</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-primary btn-sm">Sign in</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:py-28">
          <Badge tone="primary"><Sparkles className="mr-1 h-3 w-3" /> Built for modern agencies</Badge>
          <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Run your entire client business from one calm workspace.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Leads, clients, projects, retainers, payments, payroll and a client portal — connected by a finance ledger and an AI assistant that never acts without approval.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <Link to="/login" className="btn-primary btn-lg">Open the demo <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/p/pixelforge" className="btn-secondary btn-lg">View a public agency page</Link>
          </div>
          <p className="mt-4 text-[11px] text-muted">Demo accounts included · Local-first · No external services required</p>

          <div className="mx-auto mt-14 max-w-4xl">
            <div className="card overflow-hidden p-2 shadow-float">
              <div className="rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 text-left sm:p-6">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/80" /><span className="h-2.5 w-2.5 rounded-full bg-warning/80" /><span className="h-2.5 w-2.5 rounded-full bg-success/80" />
                  <span className="ml-3 rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-white/70">app.pixelforge.studio/dashboard</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Revenue', value: '₹4.86L', tone: 'text-emerald-400' },
                    { label: 'Active clients', value: '8', tone: 'text-indigo-300' },
                    { label: 'Open projects', value: '6', tone: 'text-sky-300' },
                    { label: 'MRR', value: '₹2.1L', tone: 'text-violet-300' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-white/50">{item.label}</p>
                      <p className={`mt-1 font-display text-xl font-bold ${item.tone}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-end gap-1.5">
                      {[38, 52, 44, 68, 58, 76, 64, 88, 72, 92, 80, 98].map((height, index) => (
                        <span key={index} className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/40 to-indigo-400" style={{ height: `${height * 0.8}px` }} />
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] text-white/40">Revenue vs expenses · last 6 months</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[10px] uppercase tracking-wide text-white/50">AI assistant</p>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/80">Three payments are overdue. The largest is Brightline Media at ₹45,000.</p>
                    <span className="mt-3 inline-flex rounded-md bg-emerald-500/20 px-2 py-1 text-[9px] font-semibold text-emerald-300">Human approval required</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Everything connected</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">One system instead of seven tabs.</h2>
            <p className="mt-2 text-sm text-muted">Every module writes to the same records, so numbers reconcile and clients see the right things.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: TrendingUp, title: 'Pipeline & clients', text: 'Score leads, move deals through stages, and convert to clients without re-typing data.' },
              { icon: Layers, title: 'Delivery & docs', text: 'Projects, tasks, meetings, messages, quotations, contracts and shared documents.' },
              { icon: ShieldCheck, title: 'Finance that adds up', text: 'Payments and expenses post to a single ledger. Retainers, payroll and invoices stay aligned.' },
              { icon: Sparkles, title: 'AI with a brake', text: 'Draft follow-ups, quotations and summaries. Nothing is saved or sent without human approval.' },
              { icon: Users, title: 'Client portal', text: 'Clients see their projects, invoices, documents, meetings and announcements — nothing else.' },
              { icon: Globe2, title: 'Public presence', text: 'A polished agency page with a lead form that drops enquiries straight into your pipeline.' },
            ].map((feature) => (
              <div key={feature.title} className="card p-5 transition hover:-translate-y-0.5 hover:shadow-float">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><feature.icon className="h-5 w-5" /></span>
                <p className="mt-3 text-sm font-semibold text-ink">{feature.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">From first touch to renewal</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">A workflow your team will actually follow.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Capture an enquiry, qualify it, convert to a client, deliver the project, invoice on time and renew the retainer. Each step updates the next automatically.</p>
            <div className="mt-6 space-y-3">
              {[
                ['Capture', 'Public page, referrals or manual entry create a scored lead.'],
                ['Convert', 'Won leads become clients with a project and retainer attached.'],
                ['Deliver', 'Tasks, meetings, messages and documents stay in one client context.'],
                ['Get paid', 'Payments post to the ledger; invoices and billing records reconcile.'],
                ['Grow', 'AI highlights risk, follow-ups and pipeline gaps for review.'],
              ].map(([title, text], index) => (
                <div key={title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">{index + 1}</span>
                  <div><p className="text-xs font-semibold text-ink">{title}</p><p className="text-[11px] text-muted">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <p className="text-xs font-semibold text-ink">Client portal preview</p>
              <Badge tone="success" dot>Shared securely</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-ink">Acme Website Redesign</p><Badge tone="warning">Ongoing</Badge></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2"><div className="h-full w-[65%] rounded-full bg-primary" /></div>
                <p className="mt-1.5 text-[10px] text-muted">65% complete · next milestone in 6 days</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between"><p className="text-xs font-semibold text-ink">INV-2026-013</p><Badge tone="warning">Pending</Badge></div>
                <p className="mt-1 text-[10px] text-muted">Milestone 3 · due 12 Nov</p>
              </div>
              <div className="rounded-xl border border-line p-3">
                <p className="text-xs font-semibold text-ink">Shared documents</p>
                <p className="mt-1 text-[10px] text-muted">Homepage proposal, brand assets and reports — visible only to this client.</p>
              </div>
            </div>
            <p className="mt-4 rounded-lg bg-primary-soft/50 p-3 text-[10px] text-muted">Clients never see other clients, payroll, expenses or internal notes.</p>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Simple pricing</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">Start free. Grow when you're ready.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.id} className={cn('card flex flex-col p-5', plan.highlight && 'border-primary/40 shadow-glow')}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-ink">{plan.name}</h3>
                  {plan.highlight ? <Badge tone="primary">Popular</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted">{plan.description}</p>
                <p className="mt-4 text-3xl font-extrabold text-ink">{Number(plan.price) === 0 ? 'Free' : currency(plan.price)}<span className="text-xs font-medium text-muted">{Number(plan.price) > 0 ? '/month' : ''}</span></p>
                <ul className="mt-4 flex-1 space-y-2">
                  {(plan.features || []).map((feature) => <li key={feature} className="flex items-start gap-2 text-xs text-muted"><Check className="mt-0.5 h-3.5 w-3.5 text-success" />{feature}</li>)}
                </ul>
                <Link to="/login" className={cn('mt-5 w-full', plan.highlight ? 'btn-primary btn-md' : 'btn-secondary btn-md')}>{Number(plan.price) === 0 ? 'Get started' : 'Start with Pro'}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-glow"><Rocket className="h-6 w-6" /></span>
        <h2 className="mt-5 font-display text-3xl font-bold tracking-tight text-ink">Your next client deserves a calmer workspace.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">Explore the full demo with realistic data across every role. No setup, no credit card.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/login" className="btn-primary btn-lg">Sign in to the demo <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/p/pixelforge" className="btn-secondary btn-lg">See the public page</Link>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-[11px] text-muted sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} PixelForge Client OS. Local demo.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-ink">Client sign in</Link>
            <Link to="/help" className="hover:text-ink">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
