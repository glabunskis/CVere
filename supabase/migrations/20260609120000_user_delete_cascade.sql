-- =============================================================================
-- Fix auth.users deletion: add ON DELETE CASCADE to legacy starter-template FKs
--
-- The init migration created `users`, `customers`, and `subscriptions` with
-- foreign keys to auth.users that had no ON DELETE rule (defaulting to
-- NO ACTION). This blocked deleting a user from Supabase Auth with a
-- foreign_key_violation (23503). Recreate those constraints with CASCADE so
-- deleting an auth user removes the dependent public rows automatically.
-- =============================================================================

-- public.users.id -> auth.users.id
alter table public.users
  drop constraint if exists users_id_fkey;
alter table public.users
  add constraint users_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

-- public.customers.id -> auth.users.id
alter table public.customers
  drop constraint if exists customers_id_fkey;
alter table public.customers
  add constraint customers_id_fkey
  foreign key (id) references auth.users (id) on delete cascade;

-- public.subscriptions.user_id -> auth.users.id
alter table public.subscriptions
  drop constraint if exists subscriptions_user_id_fkey;
alter table public.subscriptions
  add constraint subscriptions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;
