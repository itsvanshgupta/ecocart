-- Run once after schema.sql if any user registered before the profile trigger existed.
insert into public.profiles (id, full_name, phone)
select id, coalesce(raw_user_meta_data ->> 'full_name', ''), raw_user_meta_data ->> 'phone'
from auth.users
on conflict (id) do nothing;
