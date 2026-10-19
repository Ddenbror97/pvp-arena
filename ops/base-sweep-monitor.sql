-- Personal Base deposit sweeps are retired.
-- Do not call crypto_sweep_ops_snapshot to decide a sweep, and do not move funds.
-- Historical sweep rows, if any, stay in crypto_deposit_sweeps.
select 1 where false;
