import type { BtcpayConfig, BtcpayPayoutConfig } from "./config.server";

type Auth = { url: string; storeId: string; apiKey: string };
type Enabled = Extract<BtcpayConfig, { enabled: true }>;
type PayoutEnabled = Extract<BtcpayPayoutConfig, { enabled: true }>;

export class BtcpayError extends Error {
  constructor(readonly status: number) {
    super("BTCPAY_HTTP");
  }
}

/**
 * BTCPay did not answer: a timeout or a network failure. Never proof that a write did not
 * happen (callers treat it as an unknown outcome, like any error that is not a BtcpayError).
 */
export class BtcpayUnreachable extends Error {
  constructor() {
    super("BTCPAY_UNREACHABLE");
  }
}

/**
 * A read waits this long. Without a limit a BTCPay server that accepts the connection and
 * then says nothing held the minute job (which also pays Base withdrawals) and the wallet
 * page for as long as the platform allowed, once for every open invoice and payout.
 */
export const BTCPAY_READ_TIMEOUT_MS = 8_000;
/** A write (invoice, payout, transfer) gets longer: giving up early leaves its outcome unknown. */
export const BTCPAY_WRITE_TIMEOUT_MS = 25_000;
/** After a read got no answer, further reads fail at once for this long instead of each waiting. */
export const BTCPAY_DOWN_MS = 20_000;
let downUntil = 0;

async function call(
  config: Auth,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<unknown> {
  // Writes are always attempted: failing one before it is sent would look like an unknown
  // outcome to its caller, and a hold would then wait for an operator for nothing.
  const read = !init?.method || init.method === "GET";
  if (read && Date.now() < downUntil) throw new BtcpayUnreachable();
  let response: Response;
  let text: string;
  try {
    response = await fetch(`${config.url}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `token ${config.apiKey}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(read ? BTCPAY_READ_TIMEOUT_MS : BTCPAY_WRITE_TIMEOUT_MS),
    });
    text = await response.text();
  } catch {
    if (read) downUntil = Date.now() + BTCPAY_DOWN_MS;
    throw new BtcpayUnreachable();
  }
  if (read) downUntil = 0;
  if (!response.ok) throw new BtcpayError(response.status);
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BtcpayError(response.status);
  }
}

export function createInvoice(config: Enabled, orderId: string, usdAmount: string) {
  return call(config, `/api/v1/stores/${config.storeId}/invoices`, {
    method: "POST",
    body: {
      amount: usdAmount,
      currency: "USD",
      metadata: { orderId },
      checkout: {
        speedPolicy: config.speedPolicy,
        paymentMethods: [config.onchainMethod],
        defaultPaymentMethod: config.onchainMethod,
        expirationMinutes: 60,
        monitoringMinutes: 1440,
      },
    },
  });
}

export function getInvoice(config: Enabled, invoiceId: string) {
  return call(config, `/api/v1/stores/${config.storeId}/invoices/${invoiceId}`);
}

export function getPaymentMethods(config: Enabled, invoiceId: string) {
  return call(config, `/api/v1/stores/${config.storeId}/invoices/${invoiceId}/payment-methods`);
}

/**
 * Amount is bitcoin. This server's create-payout body has no currency field;
 * a value of "1.00" is 1 BTC. Callers pass the quoted satoshi amount as an
 * 8-decimal BTC string and leave the payout unapproved.
 */
export function createPayout(
  config: PayoutEnabled,
  destination: string,
  btcAmount: string,
  orderId: string,
) {
  return call(config, `/api/v1/stores/${config.storeId}/payouts`, {
    method: "POST",
    body: {
      destination,
      amount: btcAmount,
      payoutMethodId: config.onchainMethod,
      approved: false,
      metadata: { orderId },
    },
  });
}

/**
 * BTCPay Server 2.2.1 GetStorePayouts returns the store's payouts in one array.
 * That route has no skip or take. The default list omits Cancelled, so an empty
 * body is not proof that no payout exists. includeCancelled keeps a cancelled
 * payout visible for the existing release path.
 */
export function listPayouts(config: PayoutEnabled) {
  return call(config, `/api/v1/stores/${config.storeId}/payouts?includeCancelled=true`);
}

export function getPayout(config: PayoutEnabled, payoutId: string) {
  return call(config, `/api/v1/stores/${config.storeId}/payouts/${payoutId}`);
}

export function approvePayout(config: PayoutEnabled, payoutId: string) {
  return call(config, `/api/v1/stores/${config.storeId}/payouts/${payoutId}`, {
    method: "POST",
    body: { state: "AwaitingPayment" },
  });
}

function onChainCode(method: string) {
  return method === "BTC" || method === "BTC-CHAIN" ? "BTC" : method;
}

export function getPayoutWallet(config: PayoutEnabled) {
  return getOnChainWallet(config, config.onchainMethod);
}

export function getOnChainWallet(config: Auth, method: string) {
  return call(
    config,
    `/api/v1/stores/${config.storeId}/payment-methods/OnChain/${onChainCode(method)}/wallet`,
  );
}

/** Current receive address. GET does not ask BTCPay for a new address. */
export function getOnChainAddress(config: Auth, method: string) {
  return call(
    config,
    `/api/v1/stores/${config.storeId}/payment-methods/OnChain/${onChainCode(method)}/wallet/address`,
  );
}

export function createOnChainTransfer(
  config: Auth,
  method: string,
  body: {
    destinations: { destination: string; amount: string; subtractFromAmount: boolean }[];
    proceedWithBroadcast: boolean;
    excludeUnconfirmed: boolean;
  },
) {
  return call(
    config,
    `/api/v1/stores/${config.storeId}/payment-methods/OnChain/${onChainCode(method)}/wallet/transactions`,
    { method: "POST", body },
  );
}

export function getBtcUsdRate(config: PayoutEnabled) {
  return call(config, `/api/v1/stores/${config.storeId}/rates?currencyPair=BTC_USD`);
}

export function cancelPayout(config: PayoutEnabled, payoutId: string) {
  return call(config, `/api/v1/stores/${config.storeId}/payouts/${payoutId}`, {
    method: "POST",
    body: { state: "Cancelled" },
  });
}
