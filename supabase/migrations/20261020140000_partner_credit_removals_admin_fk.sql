-- Performance advisor: cover partner_credit_removals.admin_id → profiles(id).
-- Admin lookups and joins (partner credit removal room) no longer scan the child table.

create index if not exists partner_credit_removals_admin_id_idx
  on public.partner_credit_removals (admin_id);
