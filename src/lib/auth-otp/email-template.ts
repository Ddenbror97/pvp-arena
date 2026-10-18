// Shared transactional shell. Codes are text only: no links or buttons.
// The wordmark is the site logo, loaded from this site and nowhere else.

export type AuthEmailKind =
  | "signup"
  | "password_reset"
  | "email_change"
  | "email_change_notice"
  | "password_changed"
  | "email_changed"
  | "withdrawal_code"
  | "withdrawal_requested"
  | "wallet_linked"
  | "admin_device";

function esc(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

const COPY: Record<
  AuthEmailKind,
  { subject: string; lead: string; code: boolean; caution?: string }
> = {
  signup: {
    subject: "Your PVPspinArena verification code",
    lead: "Use this code to finish creating your account.",
    code: true,
  },
  password_reset: {
    subject: "Your PVPspinArena password reset code",
    lead: "Use this code to choose a new password.",
    code: true,
  },
  email_change: {
    subject: "Confirm your new PVPspinArena email",
    lead: "Use this code to confirm this address on your account.",
    code: true,
  },
  email_change_notice: {
    subject: "A PVPspinArena email change was requested",
    lead: "A request was made to change the email on your account. If this was you, enter the code that was sent to the new address. If this wasn't you, reset your password from the sign-in page before that change is confirmed.",
    code: false,
  },
  password_changed: {
    subject: "Your PVPspinArena password was changed",
    lead: "The password on your account was just changed. If you did this, you can ignore this email. If you didn't, reset your password from the sign-in page.",
    code: false,
  },
  email_changed: {
    subject: "Your PVPspinArena email was changed",
    lead: "The email on your account was changed. If you did this, you can ignore this email. If you didn't, use a device that is still signed in and contact support.",
    code: false,
  },
  withdrawal_code: {
    subject: "Your PVPspinArena withdrawal code",
    lead: "Use this code to approve the withdrawal below. It only works for this exact amount and destination.",
    code: true,
  },
  withdrawal_requested: {
    subject: "A PVPspinArena withdrawal was requested",
    lead: "A withdrawal was just requested from your account. If you did this, you can ignore this email. If you didn't, change your password right away and contact support.",
    code: false,
  },
  wallet_linked: {
    subject: "A wallet was linked to your PVPspinArena account",
    lead: "A wallet was just verified on your account. Withdrawals go to this wallet. If you didn't do this, change your password right away and contact support.",
    code: false,
  },
  admin_device: {
    subject: "Your PVPspinArena admin verification code",
    lead: "We detected a sign-in from a new device or network.",
    code: true,
    caution: "If you did not initiate this sign-in, secure your account immediately.",
  },
};

/** `detail` lines (amount, destination) are shown under the lead, escaped. */
export function renderAuthEmail(kind: AuthEmailKind, code?: string, detail: string[] = []) {
  const copy = COPY[kind];
  const safeCode = code ? esc(code) : "";
  const caution = copy.caution ?? "If you didn't request this code, ignore this email.";
  const codeText =
    copy.code && code
      ? [
          "",
          code,
          "",
          "This code expires in 10 minutes.",
          "Never share this code with anyone.",
          caution,
        ]
      : [];
  const text = [
    "PVPspinArena",
    "",
    copy.lead,
    ...(detail.length ? ["", ...detail] : []),
    ...codeText,
    "",
    "You must be 18 or older to play. Play responsibly.",
  ].join("\n");
  const codeRow =
    copy.code && code
      ? `<tr><td align="center" style="padding:8px 28px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:18px 12px;background:#0b0b0d;border:1px solid #3a3a44;border-radius:10px;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#f4f4f5">${safeCode}</td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px 0;font-size:14px;line-height:22px;color:#b8b8c2">This code expires in <b style="color:#f4f4f5">10 minutes</b>. Never share this code with anyone. ${esc(caution)}</td></tr>`
      : "";
  const detailRow = detail.length
    ? `<tr><td style="padding:14px 28px 0;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:20px;color:#f4f4f5;word-break:break-all">${detail.map(esc).join("<br>")}</td></tr>`
    : "";
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0b0b0d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:0 0 20px"><img src="https://pvpspinarena.com/brand/arena-logo-email.png" width="200" height="107" alt="PVPspinArena" style="display:block;border:0;outline:none;text-decoration:none;width:200px;max-width:100%;height:auto"></td></tr>
<tr><td style="background:#1a1a20;border:1px solid #2e2e36;border-radius:12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px;color:#e6e6ec">${esc(copy.lead)}</td></tr>
${detailRow}
${codeRow}
<tr><td style="padding:22px 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#8d8d98">You must be 18 or older to play. Play responsibly.</td></tr>
</table>
</td></tr>
</table>
</td></tr></table></body></html>`;
  return { subject: copy.subject, text, html };
}

/** Signup verification. Kept so existing callers keep a single-argument helper. */
export function renderOtpEmail(code: string) {
  return renderAuthEmail("signup", code);
}
