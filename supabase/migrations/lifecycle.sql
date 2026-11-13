drop policy if exists "Permitir inserção de confirmações" on public.confirmations;
create policy "Permitir inserção de confirmações" on public.confirmations
for insert with check (
  auth.uid() is not null
  and confirmations.kind in ('ativa', 'normalizada')
  and confirmations.created_at > now() - interval '1 minute'
  and confirmations.created_at <= now() + interval '1 minute'
  and exists (
    select 1
    from public.occurrences occurrence
    where occurrence.id = confirmations.occurrence_id
      and (
        (
          not exists (
            select 1
            from public.confirmations previous_confirmation
            where previous_confirmation.occurrence_id = occurrence.id
          )
          and occurrence.created_at + interval '12 hours' > now()
        )
        or exists (
          select 1
          from public.confirmations latest_confirmation
          where latest_confirmation.occurrence_id = occurrence.id
            and not exists (
              select 1
              from public.confirmations newer_confirmation
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
