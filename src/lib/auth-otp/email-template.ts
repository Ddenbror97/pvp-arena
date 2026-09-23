// Code-only verification email. Deliberately contains NO links, URLs or buttons.
function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function renderOtpEmail(code: string) {
  const subject = "Seu código de verificação PVPCasino";
  const text = [
    "PVPCasino",
    "",
    "Use este código para concluir seu cadastro:",
    "",
    code,
    "",
    "Este código expira em 10 minutos.",
    "Nunca compartilhe este código com ninguém.",
    "Se você não solicitou este código, ignore este e-mail.",
    "",
    "Aviso: o PVPCasino utiliza apenas créditos de teste, sem valor monetário.",
  ].join("\n");
  const c = esc(code);
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:1px;padding-bottom:20px">PVPCasino</td></tr>
<tr><td style="font-size:16px;line-height:24px;padding-bottom:16px">Use este código para concluir seu cadastro:</td></tr>
<tr><td align="center" style="padding:20px;background:#0b0b10;border-radius:10px;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#c6ff3d">${c}</td></tr>
<tr><td style="font-size:14px;line-height:22px;padding-top:20px">Este código expira em <b>10 minutos</b>.<br>Nunca compartilhe este código com ninguém.<br>Se você não solicitou este código, ignore este e-mail.</td></tr>
<tr><td style="font-size:12px;color:#666;padding-top:24px">O PVPCasino utiliza apenas créditos de teste, sem valor monetário.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html };
}
