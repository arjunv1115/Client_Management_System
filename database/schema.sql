-- ============================================================================
-- PixelForge Client OS - Supabase / PostgreSQL schema
-- Generated from the local demo dataset so every runtime column is covered.
-- Run order: schema.sql -> functions.sql -> policies.sql -> seed.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- Core organization helper tables

create table if not exists public."organizations" (
  "id" text primary key,
  "name" text,
  "slug" text,
  "owner_id" text,
  "email" text,
  "phone" text,
  "website" text,
  "address" text,
  "logo_url" text,
  "currency" text,
  "opening_balance" numeric(14,2),
  "invoice_prefix" text,
  "timezone" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."profiles" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "email" text,
  "phone" text,
  "avatar_url" text,
  "role" text,
  "client_id" text,
  "status" text,
  "email_verified" boolean,
  "mfa_enabled" boolean,
  "last_login_at" timestamptz,
  "password_hash" text,
  "designation" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."organization_members" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "profile_id" text,
  "role" text,
  "status" text,
  "joined_at" timestamptz
);

create table if not exists public."roles" (
  "id" text primary key,
  "name" text,
  "slug" text,
  "description" text,
  "level" integer
);

create table if not exists public."permissions" (
  "id" text primary key,
  "code" text,
  "name" text,
  "module" text
);

create table if not exists public."role_permissions" (
  "id" text primary key,
  "role" text,
  "permission" text
);

create table if not exists public."invitations" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "email" text,
  "role" text,
  "status" text,
  "invited_by" text,
  "created_at" timestamptz default now()
);

create table if not exists public."lead_stages" (
  "id" text primary key,
  "name" text,
  "color" text,
  "position" integer,
  "org_id" text default 'org_demo',
  "created_at" timestamptz default now()
);

create table if not exists public."lead_sources" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "active" boolean
);

create table if not exists public."leads" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "company" text,
  "email" text,
  "phone" text,
  "website" text,
  "location" text,
  "source" text,
  "service" text,
  "estimated_budget" numeric(14,2),
  "expected_close_date" date,
  "assigned_to" text,
  "priority" text,
  "stage_id" text,
  "stage" text,
  "status" text,
  "score" integer,
  "notes" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."lead_activities" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "lead_id" text,
  "user_id" text,
  "user_name" text,
  "type" text,
  "title" text,
  "description" text,
  "created_at" timestamptz default now()
);

create table if not exists public."lead_notes" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "lead_id" text,
  "user_id" text,
  "body" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."clients" (
  "id" text primary key,
  "name" text,
  "company" text,
  "email" text,
  "phone" text,
  "alt_phone" text,
  "website" text,
  "billing_address" text,
  "location" text,
  "gst_number" text,
  "industry" text,
  "source" text,
  "manager_id" text,
  "status" text,
  "notes" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz,
  "org_id" text default 'org_demo'
);

create table if not exists public."projects" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "description" text,
  "client_id" text,
  "category" text,
  "start_date" date,
  "deadline" date,
  "budget" numeric(14,2),
  "amount_paid" numeric(14,2),
  "team" jsonb,
  "priority" text,
  "progress" integer,
  "status" text,
  "stage_id" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."project_stages" (
  "id" text primary key,
  "name" text,
  "color" text,
  "position" integer,
  "org_id" text default 'org_demo'
);

create table if not exists public."project_members" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "project_id" text,
  "profile_id" text,
  "role" text
);

create table if not exists public."project_activities" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "project_id" text,
  "user_id" text,
  "user_name" text,
  "action" text,
  "description" text,
  "created_at" timestamptz default now()
);

create table if not exists public."retainers" (
  "id" text primary key,
  "name" text,
  "client_id" text,
  "project_id" text,
  "description" text,
  "monthly_amount" numeric(14,2),
  "billing_cycle" text,
  "start_date" date,
  "end_date" date,
  "next_billing_date" date,
  "payment_status" text,
  "status" text,
  "created_at" timestamptz default now(),
  "org_id" text default 'org_demo'
);

create table if not exists public."payments" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "project_id" text,
  "invoice_number" text,
  "amount" numeric(14,2),
  "method" text,
  "transaction_id" text,
  "payment_date" date,
  "status" text,
  "description" text,
  "gateway" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."expenses" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "category" text,
  "description" text,
  "amount" numeric(14,2),
  "expense_date" date,
  "method" text,
  "recurring" boolean,
  "attachment_url" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."expense_categories" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text
);

create table if not exists public."revenue_categories" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text
);

create table if not exists public."transactions" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "payment_id" text,
  "expense_id" text,
  "title" text,
  "type" text,
  "revenue_category" text,
  "amount" numeric(14,2),
  "transaction_date" date,
  "method" text,
  "status" text,
  "description" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."invoices" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "project_id" text,
  "invoice_number" text,
  "issue_date" date,
  "due_date" date,
  "subtotal" numeric(14,2),
  "tax" numeric(14,2),
  "discount" numeric(14,2),
  "total" numeric(14,2),
  "status" text,
  "notes" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."invoice_items" (
  "id" text primary key,
  "invoice_id" text,
  "description" text,
  "quantity" integer,
  "rate" text,
  "amount" numeric(14,2)
);

create table if not exists public."payroll" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "member_id" text,
  "employee_name" text,
  "designation" text,
  "month" text,
  "basic_salary" numeric(14,2),
  "allowances" numeric(14,2),
  "bonus" numeric(14,2),
  "deductions" numeric(14,2),
  "tax_deduction" numeric(14,2),
  "net_salary" numeric(14,2),
  "payment_date" date,
  "status" text,
  "payment_method" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."conversations" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "type" text,
  "client_id" text,
  "created_by" text,
  "last_message_at" timestamptz,
  "created_at" timestamptz default now()
);

create table if not exists public."conversation_members" (
  "id" text primary key,
  "conversation_id" text,
  "profile_id" text
);

create table if not exists public."messages" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "conversation_id" text,
  "sender_id" text,
  "sender_name" text,
  "body" text,
  "attachment_url" text,
  "read_by" jsonb,
  "created_at" timestamptz default now(),
  "edited_at" timestamptz,
  "deleted_at" timestamptz
);

create table if not exists public."message_attachments" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "message_id" text,
  "file_name" text,
  "file_url" text,
  "file_size" integer,
  "mime_type" integer,
  "created_at" timestamptz default now()
);

create table if not exists public."meetings" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "title" text,
  "description" text,
  "type" text,
  "client_id" text,
  "project_id" text,
  "meeting_date" date,
  "start_time" text,
  "end_time" text,
  "participants" jsonb,
  "location" text,
  "meeting_link" text,
  "agenda" text,
  "status" text,
  "priority" text,
  "assigned_to" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."reminders" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "title" text,
  "description" text,
  "client_id" text,
  "type" text,
  "reminder_date" date,
  "reminder_time" text,
  "priority" text,
  "status" text,
  "created_by" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."task_boards" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "created_at" timestamptz default now()
);

create table if not exists public."task_columns" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "board_id" text,
  "name" text,
  "position" integer,
  "color" text
);

create table if not exists public."tasks" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "title" text,
  "description" text,
  "project_id" text,
  "client_id" text,
  "assigned_to" text,
  "priority" text,
  "start_date" date,
  "due_date" date,
  "status" text,
  "progress" integer,
  "board_id" text,
  "column_id" text,
  "position" integer,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."subtasks" (
  "id" text primary key,
  "task_id" text,
  "title" text,
  "completed" boolean
);

create table if not exists public."task_comments" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "task_id" text,
  "user_id" text,
  "user_name" text,
  "body" text,
  "created_at" timestamptz default now()
);

create table if not exists public."documents" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "name" text,
  "category" text,
  "client_id" text,
  "project_id" text,
  "file_url" text,
  "file_size" integer,
  "mime_type" integer,
  "uploaded_by" text,
  "shared_with_client" boolean,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."team_members" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "profile_id" text,
  "name" text,
  "email" text,
  "phone" text,
  "designation" text,
  "department" text,
  "role" text,
  "joining_date" date,
  "status" text,
  "avatar_url" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."billing_records" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "invoice_number" text,
  "plan" text,
  "amount" numeric(14,2),
  "billing_date" date,
  "due_date" date,
  "status" text,
  "description" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."plans" (
  "id" text primary key,
  "name" text,
  "price" numeric(14,2),
  "billing" text,
  "description" text,
  "limits" jsonb,
  "features" jsonb,
  "highlight" boolean,
  "position" integer
);

create table if not exists public."subscriptions" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "plan_id" text,
  "plan_name" text,
  "status" text,
  "start_date" date,
  "renewal_date" date,
  "amount" numeric(14,2),
  "billing" text,
  "created_at" timestamptz default now()
);

create table if not exists public."subscription_payments" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "subscription_id" text,
  "amount" numeric(14,2),
  "status" text,
  "gateway_id" text,
  "paid_at" timestamptz,
  "created_at" timestamptz default now()
);

create table if not exists public."subscription_usage" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "feature" text,
  "used" integer,
  "period" text
);

create table if not exists public."payment_webhook_events" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "gateway" text,
  "event" text,
  "payload" jsonb,
  "status" text,
  "created_at" timestamptz default now()
);

create table if not exists public."public_pages" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "slug" text,
  "business_name" text,
  "tagline" text,
  "description" text,
  "email" text,
  "phone" text,
  "website" text,
  "address" text,
  "logo_url" text,
  "services" jsonb,
  "portfolio" jsonb,
  "socials" jsonb,
  "published" boolean,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."public_lead_submissions" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "page_id" text,
  "name" text,
  "email" text,
  "phone" text,
  "company" text,
  "message" text,
  "service" text,
  "budget" numeric(14,2),
  "status" text,
  "created_at" timestamptz default now()
);

create table if not exists public."referral_codes" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "code" text,
  "clicks" integer,
  "signups" integer,
  "conversions" integer,
  "reward_per_referral" numeric(14,2),
  "created_at" timestamptz default now()
);

create table if not exists public."referrals" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "referrer_id" text,
  "referrer_name" text,
  "referred_company" text,
  "referred_name" text,
  "referred_email" text,
  "code" text,
  "status" text,
  "reward_amount" numeric(14,2),
  "reward_status" text,
  "created_at" timestamptz default now()
);

create table if not exists public."referral_rewards" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "referral_id" text,
  "amount" numeric(14,2),
  "status" text,
  "paid_at" timestamptz
);

create table if not exists public."notifications" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "type" text,
  "title" text,
  "message" text,
  "link" text,
  "is_read" boolean,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."announcements" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "title" text,
  "category" text,
  "description" text,
  "published_date" date,
  "expiry_date" date,
  "status" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."client_activities" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "title" text,
  "description" text,
  "type" text,
  "activity_date" date,
  "status" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."quotations" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "project_id" text,
  "lead_id" text,
  "number" text,
  "title" text,
  "status" text,
  "subtotal" numeric(14,2),
  "tax" numeric(14,2),
  "discount" numeric(14,2),
  "total" numeric(14,2),
  "valid_until" date,
  "notes" text,
  "terms" text,
  "content" text,
  "version" integer,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."quotation_items" (
  "id" text primary key,
  "quotation_id" text,
  "description" text,
  "quantity" integer,
  "rate" text,
  "amount" numeric(14,2)
);

create table if not exists public."contracts" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "client_id" text,
  "title" text,
  "start_date" date,
  "end_date" date,
  "value" numeric(14,2),
  "status" text,
  "file_url" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  "deleted_at" timestamptz
);

create table if not exists public."support_tickets" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "subject" text,
  "message" text,
  "priority" text,
  "status" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."support_messages" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "ticket_id" text,
  "user_id" text,
  "body" text,
  "created_at" timestamptz default now()
);

create table if not exists public."activity_logs" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "user_name" text,
  "action" text,
  "module" text,
  "record_id" text,
  "description" text,
  "created_at" timestamptz default now()
);

create table if not exists public."audit_logs" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "user_name" text,
  "action" text,
  "entity" text,
  "entity_id" text,
  "changes" jsonb,
  "ip" text,
  "created_at" timestamptz default now()
);

create table if not exists public."organization_settings" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "key" text,
  "value" numeric(14,2)
);

create table if not exists public."user_preferences" (
  "id" text primary key,
  "user_id" text,
  "theme" text,
  "sidebar_collapsed" text,
  "sidebar_enabled" text,
  "ai_enabled" text,
  "ai_tone" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."user_settings" (
  "id" text primary key,
  "user_id" text,
  "key" text,
  "value" numeric(14,2)
);

create table if not exists public."ai_feature_settings" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "feature" text,
  "enabled" boolean,
  "updated_at" timestamptz default now()
);

create table if not exists public."ai_usage_logs" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "feature" text,
  "tokens" integer,
  "created_at" timestamptz default now()
);

create table if not exists public."ai_conversations" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "title" text,
  "feature" text,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create table if not exists public."ai_messages" (
  "id" text primary key,
  "conversation_id" text,
  "role" text,
  "content" text,
  "created_at" timestamptz default now()
);

create table if not exists public."ai_generated_reports" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "user_id" text,
  "title" text,
  "report_type" text,
  "content" jsonb,
  "created_at" timestamptz default now()
);

create table if not exists public."ai_suggestions" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "feature" text,
  "entity" text,
  "entity_id" text,
  "title" text,
  "body" text,
  "status" text,
  "created_at" timestamptz default now()
);

create table if not exists public."integrations" (
  "id" text primary key,
  "org_id" text default 'org_demo',
  "provider" text,
  "status" text,
  "config" jsonb,
  "created_at" timestamptz default now()
);

create table if not exists public."reset_tokens" (
  "id" text primary key,
  "user_id" text,
  "token" text,
  "expires_at" timestamptz,
  "used_at" timestamptz,
  "created_at" timestamptz default now()
);

-- Helpful indexes for the API query patterns
create index if not exists organizations_created_idx on public."organizations" ("created_at" desc);
create index if not exists profiles_org_idx on public."profiles" ("org_id");
create index if not exists profiles_client_idx on public."profiles" ("client_id");
create index if not exists profiles_created_idx on public."profiles" ("created_at" desc);
create index if not exists organization_members_org_idx on public."organization_members" ("org_id");
create index if not exists invitations_org_idx on public."invitations" ("org_id");
create index if not exists invitations_created_idx on public."invitations" ("created_at" desc);
create index if not exists lead_stages_org_idx on public."lead_stages" ("org_id");
create index if not exists lead_stages_created_idx on public."lead_stages" ("created_at" desc);
create index if not exists lead_sources_org_idx on public."lead_sources" ("org_id");
create index if not exists leads_org_idx on public."leads" ("org_id");
create index if not exists leads_deleted_idx on public."leads" ("deleted_at");
create index if not exists leads_created_idx on public."leads" ("created_at" desc);
create index if not exists clients_org_idx on public."clients" ("org_id");
create index if not exists clients_deleted_idx on public."clients" ("deleted_at");
create index if not exists clients_created_idx on public."clients" ("created_at" desc);
create index if not exists projects_org_idx on public."projects" ("org_id");
create index if not exists projects_deleted_idx on public."projects" ("deleted_at");
create index if not exists projects_client_idx on public."projects" ("client_id");
create index if not exists projects_created_idx on public."projects" ("created_at" desc);
create index if not exists project_stages_org_idx on public."project_stages" ("org_id");
create index if not exists project_members_org_idx on public."project_members" ("org_id");
create index if not exists retainers_org_idx on public."retainers" ("org_id");
create index if not exists retainers_client_idx on public."retainers" ("client_id");
create index if not exists retainers_created_idx on public."retainers" ("created_at" desc);
create index if not exists payments_org_idx on public."payments" ("org_id");
create index if not exists payments_deleted_idx on public."payments" ("deleted_at");
create index if not exists payments_client_idx on public."payments" ("client_id");
create index if not exists payments_created_idx on public."payments" ("created_at" desc);
create index if not exists expenses_org_idx on public."expenses" ("org_id");
create index if not exists expenses_deleted_idx on public."expenses" ("deleted_at");
create index if not exists expenses_created_idx on public."expenses" ("created_at" desc);
create index if not exists expense_categories_org_idx on public."expense_categories" ("org_id");
create index if not exists revenue_categories_org_idx on public."revenue_categories" ("org_id");
create index if not exists transactions_org_idx on public."transactions" ("org_id");
create index if not exists transactions_deleted_idx on public."transactions" ("deleted_at");
create index if not exists transactions_client_idx on public."transactions" ("client_id");
create index if not exists transactions_created_idx on public."transactions" ("created_at" desc);
create index if not exists invoices_org_idx on public."invoices" ("org_id");
create index if not exists invoices_deleted_idx on public."invoices" ("deleted_at");
create index if not exists invoices_client_idx on public."invoices" ("client_id");
create index if not exists invoices_created_idx on public."invoices" ("created_at" desc);
create index if not exists payroll_org_idx on public."payroll" ("org_id");
create index if not exists payroll_created_idx on public."payroll" ("created_at" desc);
create index if not exists conversations_org_idx on public."conversations" ("org_id");
create index if not exists conversations_client_idx on public."conversations" ("client_id");
create index if not exists conversations_created_idx on public."conversations" ("created_at" desc);
create index if not exists messages_org_idx on public."messages" ("org_id");
create index if not exists messages_deleted_idx on public."messages" ("deleted_at");
create index if not exists messages_created_idx on public."messages" ("created_at" desc);
create index if not exists meetings_org_idx on public."meetings" ("org_id");
create index if not exists meetings_deleted_idx on public."meetings" ("deleted_at");
create index if not exists meetings_client_idx on public."meetings" ("client_id");
create index if not exists meetings_created_idx on public."meetings" ("created_at" desc);
create index if not exists reminders_org_idx on public."reminders" ("org_id");
create index if not exists reminders_deleted_idx on public."reminders" ("deleted_at");
create index if not exists reminders_client_idx on public."reminders" ("client_id");
create index if not exists reminders_created_idx on public."reminders" ("created_at" desc);
create index if not exists task_boards_org_idx on public."task_boards" ("org_id");
create index if not exists task_boards_created_idx on public."task_boards" ("created_at" desc);
create index if not exists task_columns_org_idx on public."task_columns" ("org_id");
create index if not exists tasks_org_idx on public."tasks" ("org_id");
create index if not exists tasks_deleted_idx on public."tasks" ("deleted_at");
create index if not exists tasks_client_idx on public."tasks" ("client_id");
create index if not exists tasks_created_idx on public."tasks" ("created_at" desc);
create index if not exists task_comments_org_idx on public."task_comments" ("org_id");
create index if not exists task_comments_user_idx on public."task_comments" ("user_id");
create index if not exists task_comments_created_idx on public."task_comments" ("created_at" desc);
create index if not exists documents_org_idx on public."documents" ("org_id");
create index if not exists documents_deleted_idx on public."documents" ("deleted_at");
create index if not exists documents_client_idx on public."documents" ("client_id");
create index if not exists documents_created_idx on public."documents" ("created_at" desc);
create index if not exists team_members_org_idx on public."team_members" ("org_id");
create index if not exists team_members_created_idx on public."team_members" ("created_at" desc);
create index if not exists billing_records_org_idx on public."billing_records" ("org_id");
create index if not exists billing_records_deleted_idx on public."billing_records" ("deleted_at");
create index if not exists billing_records_client_idx on public."billing_records" ("client_id");
create index if not exists billing_records_created_idx on public."billing_records" ("created_at" desc);
create index if not exists subscriptions_org_idx on public."subscriptions" ("org_id");
create index if not exists subscriptions_created_idx on public."subscriptions" ("created_at" desc);
create index if not exists subscription_payments_org_idx on public."subscription_payments" ("org_id");
create index if not exists subscription_payments_created_idx on public."subscription_payments" ("created_at" desc);
create index if not exists subscription_usage_org_idx on public."subscription_usage" ("org_id");
create index if not exists public_pages_org_idx on public."public_pages" ("org_id");
create index if not exists public_pages_created_idx on public."public_pages" ("created_at" desc);
create index if not exists referral_codes_org_idx on public."referral_codes" ("org_id");
create index if not exists referral_codes_user_idx on public."referral_codes" ("user_id");
create index if not exists referral_codes_created_idx on public."referral_codes" ("created_at" desc);
create index if not exists referrals_org_idx on public."referrals" ("org_id");
create index if not exists referrals_created_idx on public."referrals" ("created_at" desc);
create index if not exists referral_rewards_org_idx on public."referral_rewards" ("org_id");
create index if not exists notifications_org_idx on public."notifications" ("org_id");
create index if not exists notifications_user_idx on public."notifications" ("user_id");
create index if not exists notifications_created_idx on public."notifications" ("created_at" desc);
create index if not exists announcements_org_idx on public."announcements" ("org_id");
create index if not exists announcements_client_idx on public."announcements" ("client_id");
create index if not exists announcements_created_idx on public."announcements" ("created_at" desc);
create index if not exists client_activities_org_idx on public."client_activities" ("org_id");
create index if not exists client_activities_client_idx on public."client_activities" ("client_id");
create index if not exists client_activities_created_idx on public."client_activities" ("created_at" desc);
create index if not exists quotations_org_idx on public."quotations" ("org_id");
create index if not exists quotations_deleted_idx on public."quotations" ("deleted_at");
create index if not exists quotations_client_idx on public."quotations" ("client_id");
create index if not exists quotations_created_idx on public."quotations" ("created_at" desc);
create index if not exists contracts_org_idx on public."contracts" ("org_id");
create index if not exists contracts_deleted_idx on public."contracts" ("deleted_at");
create index if not exists contracts_client_idx on public."contracts" ("client_id");
create index if not exists contracts_created_idx on public."contracts" ("created_at" desc);
create index if not exists support_tickets_org_idx on public."support_tickets" ("org_id");
create index if not exists support_tickets_user_idx on public."support_tickets" ("user_id");
create index if not exists support_tickets_created_idx on public."support_tickets" ("created_at" desc);
create index if not exists support_messages_org_idx on public."support_messages" ("org_id");
create index if not exists support_messages_user_idx on public."support_messages" ("user_id");
create index if not exists support_messages_created_idx on public."support_messages" ("created_at" desc);
create index if not exists activity_logs_org_idx on public."activity_logs" ("org_id");
create index if not exists activity_logs_user_idx on public."activity_logs" ("user_id");
create index if not exists activity_logs_created_idx on public."activity_logs" ("created_at" desc);
create index if not exists audit_logs_org_idx on public."audit_logs" ("org_id");
create index if not exists audit_logs_user_idx on public."audit_logs" ("user_id");
create index if not exists audit_logs_created_idx on public."audit_logs" ("created_at" desc);
create index if not exists organization_settings_org_idx on public."organization_settings" ("org_id");
create index if not exists user_preferences_user_idx on public."user_preferences" ("user_id");
create index if not exists user_preferences_created_idx on public."user_preferences" ("created_at" desc);
create index if not exists user_settings_user_idx on public."user_settings" ("user_id");
create index if not exists ai_feature_settings_org_idx on public."ai_feature_settings" ("org_id");
create index if not exists ai_usage_logs_org_idx on public."ai_usage_logs" ("org_id");
create index if not exists ai_usage_logs_user_idx on public."ai_usage_logs" ("user_id");
create index if not exists ai_usage_logs_created_idx on public."ai_usage_logs" ("created_at" desc);
create index if not exists ai_conversations_org_idx on public."ai_conversations" ("org_id");
create index if not exists ai_conversations_user_idx on public."ai_conversations" ("user_id");
create index if not exists ai_conversations_created_idx on public."ai_conversations" ("created_at" desc);
create index if not exists ai_messages_created_idx on public."ai_messages" ("created_at" desc);
create index if not exists integrations_org_idx on public."integrations" ("org_id");
create index if not exists integrations_created_idx on public."integrations" ("created_at" desc);

-- Row Level Security is enabled for every table. Policies live in policies.sql.
alter table public."organizations" enable row level security;
alter table public."profiles" enable row level security;
alter table public."organization_members" enable row level security;
alter table public."roles" enable row level security;
alter table public."permissions" enable row level security;
alter table public."role_permissions" enable row level security;
alter table public."invitations" enable row level security;
alter table public."lead_stages" enable row level security;
alter table public."lead_sources" enable row level security;
alter table public."leads" enable row level security;
alter table public."lead_activities" enable row level security;
alter table public."lead_notes" enable row level security;
alter table public."clients" enable row level security;
alter table public."projects" enable row level security;
alter table public."project_stages" enable row level security;
alter table public."project_members" enable row level security;
alter table public."project_activities" enable row level security;
alter table public."retainers" enable row level security;
alter table public."payments" enable row level security;
alter table public."expenses" enable row level security;
alter table public."expense_categories" enable row level security;
alter table public."revenue_categories" enable row level security;
alter table public."transactions" enable row level security;
alter table public."invoices" enable row level security;
alter table public."invoice_items" enable row level security;
alter table public."payroll" enable row level security;
alter table public."conversations" enable row level security;
alter table public."conversation_members" enable row level security;
alter table public."messages" enable row level security;
alter table public."message_attachments" enable row level security;
alter table public."meetings" enable row level security;
alter table public."reminders" enable row level security;
alter table public."task_boards" enable row level security;
alter table public."task_columns" enable row level security;
alter table public."tasks" enable row level security;
alter table public."subtasks" enable row level security;
alter table public."task_comments" enable row level security;
alter table public."documents" enable row level security;
alter table public."team_members" enable row level security;
alter table public."billing_records" enable row level security;
alter table public."plans" enable row level security;
alter table public."subscriptions" enable row level security;
alter table public."subscription_payments" enable row level security;
alter table public."subscription_usage" enable row level security;
alter table public."payment_webhook_events" enable row level security;
alter table public."public_pages" enable row level security;
alter table public."public_lead_submissions" enable row level security;
alter table public."referral_codes" enable row level security;
alter table public."referrals" enable row level security;
alter table public."referral_rewards" enable row level security;
alter table public."notifications" enable row level security;
alter table public."announcements" enable row level security;
alter table public."client_activities" enable row level security;
alter table public."quotations" enable row level security;
alter table public."quotation_items" enable row level security;
alter table public."contracts" enable row level security;
alter table public."support_tickets" enable row level security;
alter table public."support_messages" enable row level security;
alter table public."activity_logs" enable row level security;
alter table public."audit_logs" enable row level security;
alter table public."organization_settings" enable row level security;
alter table public."user_preferences" enable row level security;
alter table public."user_settings" enable row level security;
alter table public."ai_feature_settings" enable row level security;
alter table public."ai_usage_logs" enable row level security;
alter table public."ai_conversations" enable row level security;
alter table public."ai_messages" enable row level security;
alter table public."ai_generated_reports" enable row level security;
alter table public."ai_suggestions" enable row level security;
alter table public."integrations" enable row level security;
alter table public."reset_tokens" enable row level security;

