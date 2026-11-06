-- ============================================================================
-- PixelForge Client OS - Supabase helper functions, triggers and reporting views
-- Run after schema.sql, before policies.sql.
-- ============================================================================

-- ---------------------------------------------------------------- identity helpers
create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()::text
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_org_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid()::text limit 1;
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()::text limit 1;
$$;

create or replace function public.current_client_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid()::text limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('super_admin', 'admin', 'manager', 'team_member'), false);
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('super_admin', 'admin', 'manager'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('super_admin', 'admin'), false);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'super_admin', false);
$$;

create or replace function public.has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.role_permissions rp
      where rp.role = public.current_role_name()
        and rp.permission = p_code
    );
$$;

-- ---------------------------------------------------------------- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations','profiles','leads','clients','projects','retainers','payments','expenses',
    'transactions','invoices','payroll','meetings','reminders','tasks','documents','team_members',
    'billing_records','notifications','announcements','client_activities','quotations','contracts',
    'support_tickets','public_pages','user_preferences','ai_conversations','lead_notes',
    'message_attachments','project_activities','ai_generated_reports','ai_suggestions'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------- auth signup hook
-- Creates a public profile and organization membership when a Supabase Auth user
-- signs up. Optionally pass org_id / role / client_id in raw_user_meta_data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id text := coalesce(new.raw_user_meta_data ->> 'org_id', 'org_demo');
  v_name text := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'team_member');
  v_client_id text := new.raw_user_meta_data ->> 'client_id';
begin
  insert into public.profiles (id, org_id, name, email, phone, avatar_url, role, client_id, status, email_verified)
  values (
    new.id::text,
    v_org_id,
    v_name,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'avatar_url',
    v_role,
    v_client_id,
    'active',
    new.email_confirmed_at is not null
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        email_verified = excluded.email_verified,
        updated_at = now();

  insert into public.organization_members (id, org_id, profile_id, role, status, joined_at)
  values (gen_random_uuid()::text, v_org_id, new.id::text, v_role, 'active', now())
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Attach only if the auth schema trigger is not already present.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- invoice sequencing
create or replace function public.next_invoice_number(p_prefix text default 'INV')
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_next integer;
begin
  select coalesce(
    max(nullif(regexp_replace(invoice_number, '^.*-', ''), '')::integer),
    0
  ) + 1
  into v_next
  from public.invoices
  where org_id = public.current_org_id()
    and invoice_number like p_prefix || '-' || v_year || '-%';

  return p_prefix || '-' || v_year || '-' || lpad(v_next::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------- reporting views
create or replace view public.v_dashboard_summary
with (security_invoker = true)
as
select
  public.current_org_id() as org_id,
  (select count(*) from public.leads where org_id = public.current_org_id() and deleted_at is null and status = 'open') as open_leads,
  (select count(*) from public.leads where org_id = public.current_org_id() and deleted_at is null and status = 'won') as won_leads,
  (select coalesce(sum(estimated_budget), 0) from public.leads where org_id = public.current_org_id() and deleted_at is null and status = 'open') as pipeline_value,
  (select count(*) from public.clients where org_id = public.current_org_id() and deleted_at is null and status = 'active') as active_clients,
  (select count(*) from public.projects where org_id = public.current_org_id() and deleted_at is null and status in ('ongoing', 'review')) as active_projects,
  (select count(*) from public.tasks where org_id = public.current_org_id() and deleted_at is null and status <> 'Completed') as open_tasks,
  (select count(*) from public.tasks where org_id = public.current_org_id() and deleted_at is null and status <> 'Completed' and due_date < current_date) as overdue_tasks,
  (select coalesce(sum(amount), 0) from public.transactions where org_id = public.current_org_id() and deleted_at is null and type = 'income' and transaction_date >= date_trunc('month', current_date)) as revenue_this_month,
  (select coalesce(sum(amount), 0) from public.expenses where org_id = public.current_org_id() and deleted_at is null and expense_date >= date_trunc('month', current_date)) as expenses_this_month,
  (select coalesce(sum(total), 0) from public.invoices where org_id = public.current_org_id() and deleted_at is null and status in ('pending', 'overdue')) as outstanding_invoices,
  (select count(*) from public.notifications where org_id = public.current_org_id() and is_read = false) as unread_notifications;

create or replace view public.v_financial_overview
with (security_invoker = true)
as
select
  public.current_org_id() as org_id,
  date_trunc('month', transaction_date)::date as month,
  coalesce(sum(case when type = 'income' then amount else 0 end), 0) as revenue,
  coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as expenses,
  coalesce(sum(case when type = 'income' then amount else -amount end), 0) as net_profit,
  count(*) filter (where type = 'income') as income_entries,
  count(*) filter (where type = 'expense') as expense_entries
from public.transactions
where org_id = public.current_org_id()
  and deleted_at is null
group by date_trunc('month', transaction_date)
order by month desc;

create or replace view public.v_client_portal_summary
with (security_invoker = true)
as
select
  c.id as client_id,
  c.org_id,
  c.name,
  (select count(*) from public.projects p where p.client_id = c.id and p.deleted_at is null) as projects,
  (select count(*) from public.documents d where d.client_id = c.id and d.deleted_at is null and d.shared_with_client = true) as shared_documents,
  (select coalesce(sum(i.total), 0) from public.invoices i where i.client_id = c.id and i.deleted_at is null and i.status in ('pending', 'overdue')) as outstanding_amount,
  (select coalesce(sum(p.amount), 0) from public.payments p where p.client_id = c.id and p.deleted_at is null and p.status = 'completed') as lifetime_paid
from public.clients c
where c.deleted_at is null;

create or replace view public.v_project_profitability
with (security_invoker = true)
as
select
  p.id as project_id,
  p.org_id,
  p.client_id,
  p.name,
  p.budget,
  coalesce(pay.paid, 0) as collected,
  p.budget - coalesce(pay.paid, 0) as balance_due,
  case when p.budget > 0 then round((coalesce(pay.paid, 0) / p.budget) * 100, 1) else 0 end as collection_percent
from public.projects p
left join (
  select project_id, sum(amount) as paid
  from public.payments
  where deleted_at is null and status = 'completed'
  group by project_id
) pay on pay.project_id = p.id
where p.deleted_at is null;

-- ---------------------------------------------------------------- global search
create or replace function public.search_workspace(p_query text)
returns table (kind text, id text, title text, subtitle text, link text)
language sql
stable
security_invoker = true
set search_path = public
as $$
  select 'lead'::text, l.id, l.name, coalesce(l.company, l.email),
         '/leads/' || l.id
  from public.leads l
  where l.org_id = public.current_org_id() and l.deleted_at is null
    and (l.name ilike '%' || p_query || '%' or l.company ilike '%' || p_query || '%' or l.email ilike '%' || p_query || '%')
  union all
  select 'client', c.id, c.name, coalesce(c.company, c.email), '/clients/' || c.id
  from public.clients c
  where c.org_id = public.current_org_id() and c.deleted_at is null
    and (c.name ilike '%' || p_query || '%' or c.company ilike '%' || p_query || '%')
  union all
  select 'project', p.id, p.name, p.category, '/projects/' || p.id
  from public.projects p
  where p.org_id = public.current_org_id() and p.deleted_at is null
    and p.name ilike '%' || p_query || '%'
  union all
  select 'task', t.id, t.title, t.status, '/tasks'
  from public.tasks t
  where t.org_id = public.current_org_id() and t.deleted_at is null
    and t.title ilike '%' || p_query || '%'
  limit 40;
$$;

-- ---------------------------------------------------------------- convenience RPCs
create or replace function public.dashboard_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select to_jsonb(v) from public.v_dashboard_summary v limit 1;
$$;

create or replace function public.portal_summary()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select to_jsonb(v) from public.v_client_portal_summary v where v.client_id = public.current_client_id() limit 1;
$$;

-- ---------------------------------------------------------------- grants
grant usage on schema public to anon, authenticated;
grant select on public.v_dashboard_summary, public.v_financial_overview,
  public.v_client_portal_summary, public.v_project_profitability to authenticated;
grant execute on function public.dashboard_summary(), public.portal_summary(),
  public.search_workspace(text), public.next_invoice_number(text) to authenticated;
