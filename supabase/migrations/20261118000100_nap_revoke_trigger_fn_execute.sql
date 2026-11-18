-- The sign-up trigger function is not an API endpoint.
revoke execute on function public.nap_handle_new_user() from authenticated, anon, public;
-- Accounts that existed before this app was added get a profile with no
-- hospital and no access, like any other uninvited account.
insert into public.nap_profiles (id) select id from auth.users on conflict (id) do nothing;
