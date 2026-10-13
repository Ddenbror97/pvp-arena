/** NOWPayments is retired. A replay of the old IPN URL must not credit a balance. */
export function nowpaymentsIpnGone(): Response {
  return new Response("Gone", { status: 410 });
}
