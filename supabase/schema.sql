-- =============================================================================
-- Menyo / Tea Time Multi-Tenant QR Menu & SaaS Platform — Supabase Schema
-- PostgreSQL + Row Level Security (RLS) + Realtime + Storage
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Core Relational Tables
-- -----------------------------------------------------------------------------

create table if not exists public.businesses (
  id text primary key,
  slug text not null unique,
  name text not null,
  owner_uid text,
  owner_email text,
  status text not null default 'ACTIVE',
  is_ordering_paused boolean not null default false,
  branding jsonb not null default '{}'::jsonb,
  social_links jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_owner_uid on public.businesses (owner_uid);
create index if not exists idx_businesses_owner_email on public.businesses (lower(owner_email));
create index if not exists idx_businesses_status on public.businesses (status);

create table if not exists public.business_access (
  business_id text primary key,
  operational_status text not null default 'ACTIVE',
  package_id text not null default '2_days_trial',
  is_lifetime boolean not null default false,
  starts_at_ms bigint,
  expires_at_ms bigint,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.business_private (
  business_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.business_slugs (
  slug text primary key,
  business_id text not null,
  is_alias boolean not null default false,
  canonical_slug text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_slugs_business_id on public.business_slugs (business_id);

create table if not exists public.user_profiles (
  uid text primary key,
  email text,
  username text,
  display_name text,
  role text not null default 'BUSINESS_OWNER',
  business_id text,
  must_change_password boolean not null default false,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles (lower(email));
create index if not exists idx_user_profiles_username on public.user_profiles (lower(username));
create index if not exists idx_user_profiles_business_id on public.user_profiles (business_id);

create table if not exists public.cafe_settings (
  id text primary key,
  cafe_name text not null default 'TEA TIME',
  is_ordering_paused boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  business_id text not null,
  id text not null,
  name text not null,
  sort_order integer not null default 0,
  icon text,
  icon_url text,
  is_archived boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (business_id, id)
);

create index if not exists idx_categories_business_sort on public.categories (business_id, sort_order);

create table if not exists public.products (
  business_id text not null,
  id text not null,
  category_id text,
  category text,
  name text not null,
  price_rupees numeric(10, 2) not null default 0,
  price_minor integer not null default 0,
  description text,
  image_url text,
  is_available boolean not null default true,
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (business_id, id)
);

create index if not exists idx_products_business_sort on public.products (business_id, sort_order);
create index if not exists idx_products_business_category on public.products (business_id, category_id);
create index if not exists idx_products_business_archived on public.products (business_id, is_archived);

create table if not exists public.restaurant_tables (
  business_id text not null,
  id text not null,
  table_number text not null,
  token text not null,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (business_id, id)
);

create index if not exists idx_restaurant_tables_business_token on public.restaurant_tables (business_id, token);
create index if not exists idx_restaurant_tables_business_num on public.restaurant_tables (business_id, table_number);

create table if not exists public.orders (
  id text primary key,
  business_id text not null default 'teatime',
  order_number text,
  table_number text,
  table_token text,
  tracking_token text,
  status text not null default 'PENDING',
  total_minor integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_business_created on public.orders (business_id, created_at desc);
create index if not exists idx_orders_business_status on public.orders (business_id, status);
create index if not exists idx_orders_tracking_token on public.orders (tracking_token);

create table if not exists public.packages (
  id text primary key,
  name text not null,
  price_minor integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id text primary key,
  business_id text not null,
  package_id text not null,
  starts_at_ms bigint,
  expires_at_ms bigint,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_business_created on public.subscriptions (business_id, created_at desc);

create table if not exists public.payments (
  id text primary key,
  business_id text not null,
  amount_minor integer not null default 0,
  method text,
  reference text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_business_created on public.payments (business_id, created_at desc);

create table if not exists public.audit_logs (
  id text primary key,
  business_id text,
  actor_uid text,
  action text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_business_created on public.audit_logs (business_id, created_at desc);

create table if not exists public.app_documents (
  doc_path text primary key,
  collection_path text not null,
  doc_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_documents_collection on public.app_documents (collection_path);

-- -----------------------------------------------------------------------------
-- 2. Security Helper Functions (SECURITY DEFINER + Empty search_path)
-- -----------------------------------------------------------------------------

create or replace function public.is_non_anonymous_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_non_anonymous_user()
    and (
      coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'SUPER_ADMIN'
      or lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'admin@aevonix.lk'
      or exists (
        select 1
        from public.user_profiles up
        where up.uid = (select auth.uid())::text
          and up.role = 'SUPER_ADMIN'
          and up.active = true
      )
    );
$$;

create or replace function public.is_business_staff(target_business_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.is_non_anonymous_user()
    and (
      public.is_super_admin()
      or (
        target_business_id = 'teatime'
        and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'admin@teatime.lk'
      )
      or coalesce((select auth.jwt()) -> 'app_metadata' ->> 'businessId', '') = target_business_id
      or exists (
        select 1
        from public.businesses b
        where b.id = target_business_id
          and (
            b.owner_uid = (select auth.uid())::text
            or lower(coalesce(b.owner_email, '')) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
          )
      )
      or exists (
        select 1
        from public.user_profiles up
        where up.uid = (select auth.uid())::text
          and up.business_id = target_business_id
          and up.active = true
      )
    );
$$;

-- -----------------------------------------------------------------------------
-- 3. Explicit Grants + Row Level Security (RLS) on Every Table
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant execute on function public.is_non_anonymous_user() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.is_business_staff(text) to anon, authenticated;

alter table public.businesses enable row level security;
alter table public.business_access enable row level security;
alter table public.business_private enable row level security;
alter table public.business_slugs enable row level security;
alter table public.user_profiles enable row level security;
alter table public.cafe_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.packages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_documents enable row level security;

-- Drop existing policies idempotently so re-running schema.sql is always safe
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 3.1 businesses
create policy "businesses_select_public"
  on public.businesses for select
  to anon, authenticated
  using (true);

create policy "businesses_insert_owner_or_admin"
  on public.businesses for insert
  to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_non_anonymous_user()
      and (
        owner_uid = (select auth.uid())::text
        or (id = 'teatime' and lower(coalesce((select auth.jwt()) ->> 'email', '')) = 'admin@teatime.lk')
      )
    )
  );

create policy "businesses_update_staff"
  on public.businesses for update
  to authenticated
  using (public.is_business_staff(id))
  with check (public.is_business_staff(id));

create policy "businesses_delete_super_admin"
  on public.businesses for delete
  to authenticated
  using (public.is_super_admin());

-- 3.2 business_access
create policy "business_access_select_public"
  on public.business_access for select
  to anon, authenticated
  using (true);

create policy "business_access_insert_owner_or_admin"
  on public.business_access for insert
  to authenticated
  with check (
    public.is_super_admin()
    or public.is_business_staff(business_id)
  );

create policy "business_access_update_owner_or_admin"
  on public.business_access for update
  to authenticated
  using (public.is_super_admin() or public.is_business_staff(business_id))
  with check (public.is_super_admin() or public.is_business_staff(business_id));

create policy "business_access_delete_super_admin"
  on public.business_access for delete
  to authenticated
  using (public.is_super_admin());

-- 3.3 business_private (Super Admin only)
create policy "business_private_super_admin_all"
  on public.business_private for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 3.4 business_slugs
create policy "business_slugs_select_public"
  on public.business_slugs for select
  to anon, authenticated
  using (true);

create policy "business_slugs_write_staff"
  on public.business_slugs for insert
  to authenticated
  with check (public.is_super_admin() or public.is_business_staff(business_id));

create policy "business_slugs_update_staff"
  on public.business_slugs for update
  to authenticated
  using (public.is_super_admin() or public.is_business_staff(business_id))
  with check (public.is_super_admin() or public.is_business_staff(business_id));

create policy "business_slugs_delete_super_admin"
  on public.business_slugs for delete
  to authenticated
  using (public.is_super_admin());

-- 3.5 user_profiles
create policy "user_profiles_select_self_or_admin"
  on public.user_profiles for select
  to authenticated
  using (
    public.is_non_anonymous_user()
    and (
      uid = (select auth.uid())::text
      or lower(coalesce(email, '')) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      or public.is_super_admin()
    )
  );

create policy "user_profiles_insert_self_or_admin"
  on public.user_profiles for insert
  to authenticated
  with check (
    public.is_super_admin()
    or (
      public.is_non_anonymous_user()
      and uid = (select auth.uid())::text
      and role = 'BUSINESS_OWNER'
    )
  );

create policy "user_profiles_update_self_or_admin"
  on public.user_profiles for update
  to authenticated
  using (
    public.is_super_admin()
    or (public.is_non_anonymous_user() and uid = (select auth.uid())::text)
  )
  with check (
    public.is_super_admin()
    or (
      public.is_non_anonymous_user()
      and uid = (select auth.uid())::text
      and role = 'BUSINESS_OWNER'
    )
  );

create policy "user_profiles_delete_super_admin"
  on public.user_profiles for delete
  to authenticated
  using (public.is_super_admin());

-- 3.6 cafe_settings (Tea Time storefront settings)
create policy "cafe_settings_select_public"
  on public.cafe_settings for select
  to anon, authenticated
  using (true);

create policy "cafe_settings_insert_teatime_staff"
  on public.cafe_settings for insert
  to authenticated
  with check (public.is_business_staff('teatime'));

create policy "cafe_settings_update_teatime_staff"
  on public.cafe_settings for update
  to authenticated
  using (public.is_business_staff('teatime'))
  with check (public.is_business_staff('teatime'));

-- 3.7 categories
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "categories_insert_staff"
  on public.categories for insert
  to authenticated
  with check (public.is_business_staff(business_id));

create policy "categories_update_staff"
  on public.categories for update
  to authenticated
  using (public.is_business_staff(business_id))
  with check (public.is_business_staff(business_id));

create policy "categories_delete_staff"
  on public.categories for delete
  to authenticated
  using (public.is_business_staff(business_id));

-- 3.8 products
create policy "products_select_public"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "products_insert_staff"
  on public.products for insert
  to authenticated
  with check (public.is_business_staff(business_id));

create policy "products_update_staff"
  on public.products for update
  to authenticated
  using (public.is_business_staff(business_id))
  with check (public.is_business_staff(business_id));

create policy "products_delete_staff"
  on public.products for delete
  to authenticated
  using (public.is_business_staff(business_id));

-- 3.9 restaurant_tables
create policy "restaurant_tables_select_public"
  on public.restaurant_tables for select
  to anon, authenticated
  using (true);

create policy "restaurant_tables_insert_staff"
  on public.restaurant_tables for insert
  to authenticated
  with check (public.is_business_staff(business_id));

create policy "restaurant_tables_update_staff"
  on public.restaurant_tables for update
  to authenticated
  using (public.is_business_staff(business_id))
  with check (public.is_business_staff(business_id));

create policy "restaurant_tables_delete_staff"
  on public.restaurant_tables for delete
  to authenticated
  using (public.is_business_staff(business_id));

-- 3.10 orders (Public/guest QR order creation + real-time customer tracking; staff status management)
create policy "orders_select_public"
  on public.orders for select
  to anon, authenticated
  using (true);

create policy "orders_insert_public"
  on public.orders for insert
  to anon, authenticated
  with check (
    business_id is not null
    and length(trim(business_id)) > 0
  );

create policy "orders_update_staff"
  on public.orders for update
  to authenticated
  using (public.is_business_staff(business_id))
  with check (public.is_business_staff(business_id));

create policy "orders_delete_staff"
  on public.orders for delete
  to authenticated
  using (public.is_business_staff(business_id));

-- 3.11 packages
create policy "packages_select_public"
  on public.packages for select
  to anon, authenticated
  using (true);

create policy "packages_write_super_admin"
  on public.packages for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- 3.12 subscriptions, payments, audit_logs
create policy "subscriptions_select_staff"
  on public.subscriptions for select
  to authenticated
  using (public.is_super_admin() or public.is_business_staff(business_id));

create policy "subscriptions_write_super_admin"
  on public.subscriptions for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "payments_select_staff"
  on public.payments for select
  to authenticated
  using (public.is_super_admin() or public.is_business_staff(business_id));

create policy "payments_write_super_admin"
  on public.payments for all
  to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy "audit_logs_select_super_admin"
  on public.audit_logs for select
  to authenticated
  using (public.is_super_admin());

create policy "audit_logs_insert_authenticated"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_non_anonymous_user());

-- 3.13 app_documents (tableTokens, orderTracking, counters, platform config, etc.)
create policy "app_documents_select_public_paths"
  on public.app_documents for select
  to anon, authenticated
  using (
    collection_path = 'platform'
    or collection_path = 'counters'
    or collection_path like 'businesses/%/tableTokens'
    or collection_path like 'businesses/%/orderTracking'
    or public.is_super_admin()
    or public.is_non_anonymous_user()
  );

create policy "app_documents_insert_allowed"
  on public.app_documents for insert
  to anon, authenticated
  with check (
    collection_path like 'businesses/%/orderTracking'
    or collection_path = 'counters'
    or collection_path = 'idempotencyLocks'
    or collection_path = 'orderRateLimits'
    or public.is_non_anonymous_user()
  );

create policy "app_documents_update_allowed"
  on public.app_documents for update
  to anon, authenticated
  using (
    collection_path like 'businesses/%/orderTracking'
    or collection_path = 'counters'
    or collection_path = 'orderRateLimits'
    or public.is_non_anonymous_user()
  )
  with check (
    collection_path like 'businesses/%/orderTracking'
    or collection_path = 'counters'
    or collection_path = 'orderRateLimits'
    or public.is_non_anonymous_user()
  );

create policy "app_documents_delete_staff"
  on public.app_documents for delete
  to authenticated
  using (public.is_non_anonymous_user());

-- -----------------------------------------------------------------------------
-- 4. Supabase Realtime Configuration
-- -----------------------------------------------------------------------------

alter table public.businesses replica identity full;
alter table public.cafe_settings replica identity full;
alter table public.categories replica identity full;
alter table public.products replica identity full;
alter table public.restaurant_tables replica identity full;
alter table public.orders replica identity full;

do $$
declare
  tbl text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach tbl in array array['businesses', 'cafe_settings', 'categories', 'products', 'restaurant_tables', 'orders']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 5. Supabase Storage Bucket (`media`) & RLS Policies
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "media_public_select" on storage.objects;
drop policy if exists "media_staff_insert" on storage.objects;
drop policy if exists "media_staff_update" on storage.objects;
drop policy if exists "media_staff_delete" on storage.objects;

create policy "media_public_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

create policy "media_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and public.is_non_anonymous_user()
  );

create policy "media_staff_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_non_anonymous_user()
  )
  with check (
    bucket_id = 'media'
    and public.is_non_anonymous_user()
  );

create policy "media_staff_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and public.is_non_anonymous_user()
  );

-- -----------------------------------------------------------------------------
-- 6. Default Seed Records (Tea Time Storefront)
-- -----------------------------------------------------------------------------

insert into public.cafe_settings (id, cafe_name, is_ordering_paused, data)
values (
  'cafe',
  'TEA TIME',
  false,
  jsonb_build_object(
    'cafeName', 'TEA TIME',
    'tagline', 'It''s time for you!',
    'currencySymbol', 'Rs.',
    'isOrderingPaused', false,
    'primaryColor', '#2C190E',
    'accentColor', '#E8B64F',
    'backgroundColor', '#FAF7F0',
    'textColor', '#301C10',
    'headerBackgroundColor', '#000000',
    'headerTextColor', '#FAF7F0'
  )
)
on conflict (id) do nothing;

insert into public.businesses (id, slug, name, owner_email, status, is_ordering_paused, branding, data)
values (
  'teatime',
  'teatime',
  'TEA TIME',
  'admin@teatime.lk',
  'ACTIVE',
  false,
  jsonb_build_object(
    'primaryColor', '#2C190E',
    'accentColor', '#E8B64F',
    'backgroundColor', '#FAF7F0',
    'textColor', '#301C10',
    'headerBackgroundColor', '#000000',
    'headerTextColor', '#FAF7F0'
  ),
  jsonb_build_object(
    'id', 'teatime',
    'slug', 'teatime',
    'name', 'TEA TIME',
    'ownerEmail', 'admin@teatime.lk',
    'ownerUsername', 'teatime',
    'ownerName', 'TEA TIME Manager',
    'phone', '0764847081',
    'whatsapp', '0764847081',
    'address', 'Vavuniya, Sri Lanka',
    'status', 'ACTIVE',
    'packageId', 'yearly'
  )
)
on conflict (id) do nothing;

insert into public.business_slugs (slug, business_id, is_alias, canonical_slug, data)
values (
  'teatime',
  'teatime',
  false,
  'teatime',
  jsonb_build_object('slug', 'teatime', 'businessId', 'teatime', 'isAlias', false, 'canonicalSlug', 'teatime')
)
on conflict (slug) do nothing;

insert into public.business_access (business_id, operational_status, package_id, is_lifetime, data)
values (
  'teatime',
  'ACTIVE',
  'lifetime',
  true,
  jsonb_build_object(
    'businessId', 'teatime',
    'operationalStatus', 'ACTIVE',
    'packageId', 'lifetime',
    'isLifetime', true
  )
)
on conflict (business_id) do nothing;

commit;

