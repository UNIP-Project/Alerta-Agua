alter table public.occurrences enable row level security;
grant delete on public.occurrences to authenticated;

drop policy if exists "Permitir exclusão de ocorrências pelo autor" on public.occurrences;
create policy "Permitir exclusão de ocorrências pelo autor" on public.occurrences
for delete to authenticated using (auth.uid() = user_id);
