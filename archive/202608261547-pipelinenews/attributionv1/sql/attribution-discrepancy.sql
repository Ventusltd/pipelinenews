-- Neutral read model: reported organisation-role claims beside confirmed records.
-- It states the evidence gap and makes no assessment of any person.
select
  reported.gg_project_id,
  projects.name as project_name,
  reported.role,
  reported.organisation as reported_organisation,
  reported.evidence_url as reported_source,
  reported.observed_at as reported_at,
  confirmed.organisation as confirmed_organisation,
  confirmed.evidence_url as confirmed_source,
  projects.lifecycle as project_state_at_claim,
  case
    when confirmed.organisation is null then 'NO_CONFIRMED_RECORD'
    when confirmed.organisation <> reported.organisation then 'CONFLICTS_WITH_CONFIRMED'
    else 'CONSISTENT'
  end as status
from attribution_roles as reported
left join attribution_roles as confirmed
  on confirmed.repd_ref = reported.repd_ref
  and confirmed.role = reported.role
  and confirmed.claim_status = 'CONFIRMED'
join projects
  on projects.repd_ref = reported.repd_ref
where reported.claim_status = 'REPORTED';
