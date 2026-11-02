/**
 * Deposit detection and Base sweeping are separate HTTP calls made by the
 * existing pvp_minute_dispatch. They do not share a 25 second response budget.
 *
 * pg_net aborts each call at 25 seconds. Sweep work stops 7 seconds earlier so
 * the handler can still return. The run gate is 40 seconds and the dispatcher
 * fires once a minute, so a finished sweep is idle before the next call and
 * the two calls do not overlap. In-flight rows are reconciled on the next
 * sweep call. Fifteen Base confirmations are about 30 seconds, so a one-minute
 * cadence still settles a broadcast on a following run.
 */

export const DEPOSIT_GATE_SECONDS = 40;
export const SWEEP_GATE_SECONDS = 40;
