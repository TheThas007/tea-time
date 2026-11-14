-- =============================================================================
-- Create Default Super Admin & Tea Time Admin Users directly in Supabase Auth
-- Run this once in Supabase SQL Editor
-- =============================================================================

begin;

-- Enable pgcrypto for password hashing
create extension if not exists "pgcrypto";

-- 1. Create Super Admin (admin@aevonix.lk / SuperAdmin2026!)
do $$
declare
  super_admin_uid uuid := 'a0000000-0000-0000-0000-000000000001';
begin
  if not exists (select 1 from auth.users where email = 'admin@aevonix.lk') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      super_admin_uid,
      'authenticated',
      'authenticated',
      'admin@aevonix.lk',
      crypt('SuperAdmin2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"SUPER_ADMIN","admin":true}'::jsonb,
      '{"full_name":"AEVONIX Platform Owner"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      super_admin_uid,
      json_build_object('sub', super_admin_uid, 'email', 'admin@aevonix.lk'),
      'email',
      now(),
      now(),
      now()
    );
  end if;
end $$;

-- 2. Create Tea Time Restaurant Admin (admin@teatime.lk / Admin@TeaTime2026!)
do $$
declare
  teatime_admin_uid uuid := 'a0000000-0000-0000-0000-000000000002';
begin
  if not exists (select 1 from auth.users where email = 'admin@teatime.lk') then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      teatime_admin_uid,
      'authenticated',
      'authenticated',
      'admin@teatime.lk',
      crypt('Admin@TeaTime2026!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"],"role":"BUSINESS_OWNER","businessId":"teatime","admin":true}'::jsonb,
      '{"full_name":"TEA TIME Manager"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      teatime_admin_uid,
      json_build_object('sub', teatime_admin_uid, 'email', 'admin@teatime.lk'),
      'email',
      now(),
      now(),
      now()
    );
  end if;
end $$;

-- 3. Link them into user_profiles
insert into public.user_profiles (uid, email, username, display_name, role, business_id, active, must_change_password)
values 
  ('a0000000-0000-0000-0000-000000000001', 'admin@aevonix.lk', 'aevonix_admin', 'AEVONIX Platform Owner', 'SUPER_ADMIN', null, true, false),
  ('a0000000-0000-0000-0000-000000000002', 'admin@teatime.lk', 'teatime', 'TEA TIME Manager', 'BUSINESS_OWNER', 'teatime', true, false)
on conflict (uid) do update set
  role = excluded.role,
  business_id = excluded.business_id,
  active = true;

commit;

