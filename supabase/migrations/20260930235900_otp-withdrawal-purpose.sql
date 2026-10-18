-- Every withdrawal is approved with a one-time email code (purpose WITHDRAWAL).
alter type public.otp_purpose add value if not exists 'WITHDRAWAL';
