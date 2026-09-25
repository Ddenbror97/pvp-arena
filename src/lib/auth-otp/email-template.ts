// Code-only verification email. Deliberately contains NO links, URLs or buttons.
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderOtpEmail(code: string) {
  const subject = "Your PVPspinArena verification code";
  const text = [
    "PVPspinArena",
    "",
    "Use this code to finish signing up:",
    "",
    code,
    "",
    "This code expires in 10 minutes.",
    "Never share this code with anyone.",
    "If you didn't request this code, ignore this email.",
    "",
    "You must be 18 or older to play. Play responsibly.",
  ].join("\n");
  const c = esc(code);
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:1px;padding-bottom:20px">PVPspinArena</td></tr>
<tr><td style="font-size:16px;line-height:24px;padding-bottom:16px">Use this code to finish signing up:</td></tr>
<tr><td align="center" style="padding:20px;background:#0b0b10;border-radius:10px;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#c6ff3d">${c}</td></tr>
<tr><td style="font-size:14px;line-height:22px;padding-top:20px">This code expires in <b>10 minutes</b>.<br>Never share this code with anyone.<br>If you didn't request this code, ignore this email.</td></tr>
<tr><td style="font-size:12px;color:#666;padding-top:24px">You must be 18 or older to play. Play responsibly.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
