-- Run after `npx prisma db push`.
-- This app uses server-side Prisma for writes, but RLS is enabled as defense in depth
-- for Supabase projects where public/authenticated roles can reach the public schema.

alter table if exists public.owners enable row level security;
alter table if exists public.packages enable row level security;
alter table if exists public.members enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.payments enable row level security;
alter table if exists public.payment_settings enable row level security;
alter table if exists public.message_templates enable row level security;
alter table if exists public.message_logs enable row level security;
alter table if exists public.activity_logs enable row level security;

drop policy if exists "owner can manage own profile" on public.owners;
create policy "owner can manage own profile"
on public.owners
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "owner can manage own packages" on public.packages;
create policy "owner can manage own packages"
on public.packages
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "owner can manage own members" on public.members;
create policy "owner can manage own members"
on public.members
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "owner can manage own invoices" on public.invoices;
create policy "owner can manage own invoices"
on public.invoices
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "owner can manage own payments" on public.payments;
create policy "owner can manage own payments"
on public.payments
for all
to authenticated
using (
  exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and i.owner_id = auth.uid()
  )
);

drop policy if exists "owner can manage own payment settings" on public.payment_settings;
create policy "owner can manage own payment settings"
on public.payment_settings
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "owner can manage own message templates" on public.message_templates;
create policy "owner can manage own message templates"
on public.message_templates
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "owner can manage own message logs" on public.message_logs;
create policy "owner can manage own message logs"
on public.message_logs
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "owner can read own activity logs" on public.activity_logs;
create policy "owner can read own activity logs"
on public.activity_logs
for select
to authenticated
using (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('qris', 'qris', false, 5242880, array['image/jpeg', 'image/png']),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owner manages own qris folder" on storage.objects;
create policy "owner manages own qris folder"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'qris'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'qris'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "owner manages own payment proof folder" on storage.objects;
create policy "owner manages own payment proof folder"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
