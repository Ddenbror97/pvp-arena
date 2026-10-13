-- Separate from the admin PIN. Applied in its own transaction so later
-- statements can use the new enum value.
alter type public.otp_purpose add value if not exists 'ADMIN_DEVICE';
