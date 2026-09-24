alter table public.auth_events drop constraint auth_events_event_check;
alter table public.auth_events add constraint auth_events_event_check check (event = any (array[
  'OTP_REQUESTED','OTP_SENT','OTP_SEND_FAILED','OTP_VERIFY_FAILED','OTP_EXPIRED','OTP_RATE_LIMITED','EMAIL_VERIFIED','OTP_INVALIDATED',
  'WALLET_CONNECTION_STARTED','WALLET_CONNECTED','WALLET_VERIFICATION_REQUESTED','WALLET_VERIFICATION_FAILED','WALLET_VERIFIED','WALLET_DISCONNECTED'
]::text[]));