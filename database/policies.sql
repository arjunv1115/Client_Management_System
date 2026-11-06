-- ============================================================================
-- PixelForge Client OS - Row Level Security policies
-- Run after schema.sql and functions.sql.
--
-- Model:
--   * Every workspace row is scoped to an organization.
--   * Staff (super_admin / admin / manager / team_member) read their org.
--   * Managers and admins write sales and finance records.
--   * Admins own payroll, billing, public pages, referrals and audit data.
--   * Clients only read records linked to their client_id, plus shared documents.
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.plans, public.public_pages to anon;
grant insert on public.public_lead_submissions to anon;

-- ---------------------------------------------------------------- organizations
drop policy if exists organizations_member_select on public.organizations;
create policy organizations_member_select on public.organizations
  for select to authenticated
  using (id = public.current_org_id());

drop policy if exists organizations_admin_update on public.organizations;
create policy organizations_admin_update on public.organizations
  for update to authenticated
  using (id = public.current_org_id() and public.is_admin())
  with check (id = public.current_org_id() and public.is_admin());

-- ---------------------------------------------------------------- profiles
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select to authenticated
  using (id = auth.uid()::text);

drop policy if exists profiles_staff_select on public.profiles;
create policy profiles_staff_select on public.profiles
  for select to authenticated
  using (org_id = public.current_org_id() and public.is_staff());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()::text)
  with check (id = auth.uid()::text);

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

-- ---------------------------------------------------------------- global RBAC + plans
drop policy if exists roles_read on public.roles;
create policy roles_read on public.roles for select to authenticated using (true);

drop policy if exists permissions_read on public.permissions;
create policy permissions_read on public.permissions for select to authenticated using (true);

drop policy if exists role_permissions_read on public.role_permissions;
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

drop policy if exists roles_admin_write on public.roles;
create policy roles_admin_write on public.roles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists permissions_admin_write on public.permissions;
create policy permissions_admin_write on public.permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists role_permissions_admin_write on public.role_permissions;
create policy role_permissions_admin_write on public.role_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists plans_public_read on public.plans;
create policy plans_public_read on public.plans for select to anon, authenticated using (true);

drop policy if exists plans_admin_write on public.plans;
create policy plans_admin_write on public.plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- organization members / team
drop policy if exists organization_members_staff_read on public.organization_members;
create policy organization_members_staff_read on public.organization_members
  for select to authenticated
  using (org_id = public.current_org_id() and public.is_staff());

drop policy if exists organization_members_admin_write on public.organization_members;
create policy organization_members_admin_write on public.organization_members
  for all to authenticated
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists team_members_staff_read on public.team_members;
create policy team_members_staff_read on public.team_members
  for select to authenticated
  using (org_id = public.current_org_id() and public.is_staff());

drop policy if exists team_members_admin_write on public.team_members;
create policy team_members_admin_write on public.team_members
  for all to authenticated
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

-- ---------------------------------------------------------------- admin-only tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'invitations','payroll','billing_records','subscriptions','subscription_payments',
    'subscription_usage','payment_webhook_events','referral_codes','referrals','referral_rewards',
    'activity_logs','audit_logs','organization_settings','ai_feature_settings','ai_usage_logs',
    'integrations'
  ]
  loop
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format(
      'create policy admin_all on public.%I for all to authenticated using (org_id = public.current_org_id() and public.is_admin()) with check (org_id = public.current_org_id() and public.is_admin())',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------- lookups (staff read, manager write)
do $$
declare
  t text;
begin
  foreach t in array array[
    'lead_stages','lead_sources','project_stages','project_members','expense_categories',
    'revenue_categories','task_boards','task_columns'
  ]
  loop
    execute format('drop policy if exists staff_select on public.%I', t);
    execute format(
      'create policy staff_select on public.%I for select to authenticated using (org_id = public.current_org_id() and public.is_staff())',
      t
    );
    execute format('drop policy if exists manager_write on public.%I', t);
    execute format(
      'create policy manager_write on public.%I for all to authenticated using (org_id = public.current_org_id() and public.is_manager()) with check (org_id = public.current_org_id() and public.is_manager())',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------- manager-write business tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'leads','clients','projects','retainers','payments','expenses','transactions','invoices',
    'quotations','contracts','announcements','client_activities','lead_activities','lead_notes',
    'project_activities'
  ]
  loop
    execute format('drop policy if exists staff_select on public.%I', t);
    execute format(
      'create policy staff_select on public.%I for select to authenticated using (org_id = public.current_org_id() and public.is_staff())',
      t
    );
    execute format('drop policy if exists manager_write on public.%I', t);
    execute format(
      'create policy manager_write on public.%I for all to authenticated using (org_id = public.current_org_id() and public.is_manager()) with check (org_id = public.current_org_id() and public.is_manager())',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------- all-staff tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'tasks','meetings','reminders','documents','conversations','messages','message_attachments',
    'task_comments','support_tickets','support_messages','ai_suggestions'
  ]
  loop
    execute format('drop policy if exists staff_select on public.%I', t);
    execute format(
      'create policy staff_select on public.%I for select to authenticated using (org_id = public.current_org_id() and public.is_staff())',
      t
    );
    execute format('drop policy if exists staff_insert on public.%I', t);
    execute format(
      'create policy staff_insert on public.%I for insert to authenticated with check (org_id = public.current_org_id() and public.is_staff())',
      t
    );
    execute format('drop policy if exists staff_update on public.%I', t);
    execute format(
      'create policy staff_update on public.%I for update to authenticated using (org_id = public.current_org_id() and public.is_staff()) with check (org_id = public.current_org_id() and public.is_staff())',
      t
    );
    execute format('drop policy if exists manager_delete on public.%I', t);
    execute format(
      'create policy manager_delete on public.%I for delete to authenticated using (org_id = public.current_org_id() and public.is_manager())',
      t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------- child tables without org_id
drop policy if exists invoice_items_staff on public.invoice_items;
create policy invoice_items_staff on public.invoice_items
  for all to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.org_id = public.current_org_id()
      and public.is_staff()
  ))
  with check (exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id
      and i.org_id = public.current_org_id()
      and public.is_manager()
  ));

drop policy if exists quotation_items_staff on public.quotation_items;
create policy quotation_items_staff on public.quotation_items
  for all to authenticated
  using (exists (
    select 1 from public.quotations q
    where q.id = quotation_items.quotation_id
      and q.org_id = public.current_org_id()
      and public.is_staff()
  ))
  with check (exists (
    select 1 from public.quotations q
    where q.id = quotation_items.quotation_id
      and q.org_id = public.current_org_id()
      and public.is_manager()
  ));

drop policy if exists subtasks_staff on public.subtasks;
create policy subtasks_staff on public.subtasks
  for all to authenticated
  using (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and t.org_id = public.current_org_id()
      and public.is_staff()
  ))
  with check (exists (
    select 1 from public.tasks t
    where t.id = subtasks.task_id
      and t.org_id = public.current_org_id()
      and public.is_staff()
  ));

drop policy if exists conversation_members_access on public.conversation_members;
create policy conversation_members_access on public.conversation_members
  for all to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.org_id = public.current_org_id()
      and (public.is_staff() or c.client_id = public.current_client_id())
  ))
  with check (exists (
    select 1 from public.conversations c
    where c.id = conversation_members.conversation_id
      and c.org_id = public.current_org_id()
      and (public.is_staff() or c.client_id = public.current_client_id())
  ));

-- ---------------------------------------------------------------- client portal read access
drop policy if exists clients_self_select on public.clients;
create policy clients_self_select on public.clients
  for select to authenticated
  using (id = public.current_client_id());

drop policy if exists projects_client_select on public.projects;
create policy projects_client_select on public.projects
  for select to authenticated
  using (client_id = public.current_client_id() and deleted_at is null);

drop policy if exists documents_client_select on public.documents;
create policy documents_client_select on public.documents
  for select to authenticated
  using (client_id = public.current_client_id() and shared_with_client = true and deleted_at is null);

drop policy if exists invoices_client_select on public.invoices;
create policy invoices_client_select on public.invoices
  for select to authenticated
  using (client_id = public.current_client_id() and deleted_at is null);

drop policy if exists payments_client_select on public.payments;
create policy payments_client_select on public.payments
  for select to authenticated
  using (client_id = public.current_client_id() and deleted_at is null);

drop policy if exists meetings_client_select on public.meetings;
create policy meetings_client_select on public.meetings
  for select to authenticated
  using (client_id = public.current_client_id() and deleted_at is null);

drop policy if exists announcements_client_select on public.announcements;
create policy announcements_client_select on public.announcements
  for select to authenticated
  using ((client_id is null or client_id = public.current_client_id()) and status = 'published');

drop policy if exists client_activities_client_select on public.client_activities;
create policy client_activities_client_select on public.client_activities
  for select to authenticated
  using (client_id = public.current_client_id());

drop policy if exists conversations_client_select on public.conversations;
create policy conversations_client_select on public.conversations
  for select to authenticated
  using (client_id = public.current_client_id());

drop policy if exists messages_client_select on public.messages;
create policy messages_client_select on public.messages
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.client_id = public.current_client_id()
    )
  );

drop policy if exists messages_client_insert on public.messages;
create policy messages_client_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()::text
    and org_id = public.current_org_id()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.client_id = public.current_client_id()
    )
  );

drop policy if exists support_tickets_client_access on public.support_tickets;
create policy support_tickets_client_access on public.support_tickets
  for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text and org_id = public.current_org_id());

drop policy if exists support_messages_client_select on public.support_messages;
create policy support_messages_client_select on public.support_messages
  for select to authenticated
  using (exists (
    select 1 from public.support_tickets t
    where t.id = support_messages.ticket_id
      and t.user_id = auth.uid()::text
  ));

drop policy if exists support_messages_client_insert on public.support_messages;
create policy support_messages_client_insert on public.support_messages
  for insert to authenticated
  with check (
    user_id = auth.uid()::text
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and t.user_id = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------- notifications
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (
    org_id = public.current_org_id()
    and (user_id is null or user_id = auth.uid()::text or public.is_admin())
  );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (
    org_id = public.current_org_id()
    and (user_id is null or user_id = auth.uid()::text or public.is_admin())
  )
  with check (
    org_id = public.current_org_id()
    and (user_id is null or user_id = auth.uid()::text or public.is_admin())
  );

drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications
  for insert to authenticated
  with check (org_id = public.current_org_id() and public.is_staff());

-- ---------------------------------------------------------------- user preferences
drop policy if exists user_preferences_own on public.user_preferences;
create policy user_preferences_own on public.user_preferences
  for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

drop policy if exists user_settings_own on public.user_settings;
create policy user_settings_own on public.user_settings
  for all to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- ---------------------------------------------------------------- AI data
drop policy if exists ai_conversations_own on public.ai_conversations;
create policy ai_conversations_own on public.ai_conversations
  for all to authenticated
  using (org_id = public.current_org_id() and (user_id = auth.uid()::text or public.is_admin()))
  with check (org_id = public.current_org_id() and user_id = auth.uid()::text);

drop policy if exists ai_messages_own on public.ai_messages;
create policy ai_messages_own on public.ai_messages
  for all to authenticated
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and c.org_id = public.current_org_id()
      and (c.user_id = auth.uid()::text or public.is_admin())
  ))
  with check (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id
      and c.org_id = public.current_org_id()
      and c.user_id = auth.uid()::text
  ));

drop policy if exists ai_generated_reports_own on public.ai_generated_reports;
create policy ai_generated_reports_own on public.ai_generated_reports
  for all to authenticated
  using (org_id = public.current_org_id() and (user_id = auth.uid()::text or public.is_admin()))
  with check (org_id = public.current_org_id() and user_id = auth.uid()::text);

-- ---------------------------------------------------------------- public website
drop policy if exists public_pages_public_read on public.public_pages;
create policy public_pages_public_read on public.public_pages
  for select to anon, authenticated
  using (published = true);

drop policy if exists public_pages_admin_all on public.public_pages;
create policy public_pages_admin_all on public.public_pages
  for all to authenticated
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists public_lead_submissions_public_insert on public.public_lead_submissions;
create policy public_lead_submissions_public_insert on public.public_lead_submissions
  for insert to anon, authenticated
  with check (true);

drop policy if exists public_lead_submissions_admin_read on public.public_lead_submissions;
create policy public_lead_submissions_admin_read on public.public_lead_submissions
  for select to authenticated
  using (org_id = public.current_org_id() and public.is_admin());

-- ---------------------------------------------------------------- service-role only
-- reset_tokens intentionally has RLS enabled and no client policies. Only the
-- service_role key used by the backend can read or write password reset tokens.
