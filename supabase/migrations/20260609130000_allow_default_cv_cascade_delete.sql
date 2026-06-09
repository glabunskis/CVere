-- =============================================================================
-- Allow auth.users deletion to cascade through the default CV.
--
-- prevent_default_cv_delete() blocked deletion of any CV with is_default=true.
-- That guard is meant for manual deletes, but it also aborts the ON DELETE
-- CASCADE triggered when an auth user is removed, so user deletion failed.
--
-- Only block when the owning user still exists. During a cascade from
-- auth.users, the parent row is already deleted by the time this BEFORE DELETE
-- trigger fires, so the existence check is false and the cascade proceeds.
--
-- security definer + pinned search_path so the auth.users lookup works for the
-- authenticated role during normal app deletes (which cannot read auth.users).
-- =============================================================================

create or replace function public.prevent_default_cv_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default and exists (select 1 from auth.users where id = old.user_id) then
    raise exception 'Default CV cannot be deleted.';
  end if;
  return old;
end;
$$;
