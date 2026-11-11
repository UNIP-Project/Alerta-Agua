create table if not exists occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  titulo text not null,
  descricao text,
  tipo text not null,
  gravidade text not null,
  endereco text not null,
  latitude double precision not null,
  longitude double precision not null,
  autor text,
  photos text[] default '{}',
  is_demo boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists confirmations (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid references occurrences(id) on delete cascade,
  kind text not null,
  created_at timestamptz default now()
);

alter table occurrences enable row level security;
alter table confirmations enable row level security;

create policy "Permitir leitura pública de ocorrências" on occurrences
for select using (true);

create policy "Permitir inserção de ocorrências" on occurrences
for insert with check (true);

create policy "Permitir leitura pública de confirmações" on confirmations
for select using (true);

drop policy if exists "Permitir inserção de confirmações" on confirmations;
create policy "Permitir inserção de confirmações" on confirmations
for insert with check (
  auth.uid() is not null
  and confirmations.kind in ('ativa', 'normalizada')
  and confirmations.created_at > now() - interval '1 minute'
  and confirmations.created_at <= now() + interval '1 minute'
  and exists (
    select 1
    from occurrences occurrence
    where occurrence.id = confirmations.occurrence_id
      and (
        (
          not exists (
            select 1
            from confirmations previous_confirmation
            where previous_confirmation.occurrence_id = occurrence.id
          )
          and occurrence.created_at + interval '12 hours' > now()
        )
        or exists (
          select 1
          from confirmations latest_confirmation
          where latest_confirmation.occurrence_id = occurrence.id
            and not exists (
              select 1
              from confirmations newer_confirmation
              where newer_confirmation.occurrence_id = occurrence.id
                and (
                  newer_confirmation.created_at > latest_confirmation.created_at
                  or (
                    newer_confirmation.created_at = latest_confirmation.created_at
                    and newer_confirmation.id > latest_confirmation.id
                  )
                )
            )
            and (
              (
                latest_confirmation.kind = 'normalizada'
                and latest_confirmation.created_at + interval '12 hours' > now()
              )
              or (
                latest_confirmation.kind = 'ativa'
                and latest_confirmation.created_at
                  + case occurrence.gravidade
                    when 'baixo' then interval '6 hours'
                    when 'moderado' then interval '12 hours'
                    when 'alto' then interval '24 hours'
                    else interval '12 hours'
                  end
                  + interval '12 hours' > now()
              )
            )
        )
      )
  )
);
