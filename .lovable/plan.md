# Multi-Chain Mainnet Migration: Base (8453) + Ethereum (1)

Transition PVPspinArena from Base Sepolia test credits to real-money rails on **Base Mainnet** and **Ethereum Mainnet**, with one unified USD-denominated casino ledger. Incorporates all production-grade corrections from the review.

## Core principles

- Base and Ethereum are **separate rails**; the casino balance stays unified internally in USD cents.
- Deposit identity = `chain_id + asset/token_contract + tx_hash + log_index`. Never tx hash alone.
- Deposits are matched by the player's **assigned personal deposit address** (destination), not by sender. Sender is recorded for audit/risk only.
- Confirmation thresholds are **configurable per chain/asset** — never described as "finality". Explicit states: seen → included → confirmed → credited.
- Jackpot, Coinflip, and Roulette game logic is untouched; they only consume the existing unified wallet balance.
- Base Sepolia implementation stays available until the full mainnet migration passes all tests and rails are independently verified.

## 1. Chain registry (database)

New `supported_chains` table (replaces hard-coded config):
- `chain_id`, `name`, `rpc_url`, `explorer`, `native_asset`
- `usdc_contract`, `eth_usd_feed` (oracle config)
- `confirmations_required`, `min_confirmations_for_credit`, `finality_policy`
- `min_deposit_cents`, `min_withdrawal_cents`, `enabled`

Seeded rows:
- **Base Mainnet** — chain 8453, USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, ETH/USD feed `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`, min deposit $2.00
- **Ethereum Mainnet** — chain 1, USDC `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`, ETH/USD feed `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419`, min deposit $25.00

USDC contract addresses independently verified against Circle's official deployment docs before go-live. Token validation uses exact contract address + chain ID + decimals + Transfer event — never the symbol.

Schema extensions: `crypto_deposits` and `crypto_withdrawals` gain `chain_id`, `token_contract`, `deposit_address`. Existing Sepolia rows are preserved/migrated.

## 2. Personal deposit addresses

- Each verified player gets a unique deposit address per chain (derived from a server-held HD seed or generated keypair; keys stored as secrets).
- Deposit scanner matches on **destination = player's deposit address**; records sender for audit/risk.
- Deposit UI shows the player's personal address + QR per selected network.

## 3. Confirmation model

- Per-chain configurable thresholds from the chain registry (no hard-coded numbers in app code).
- Deposit lifecycle states: `seen → included → confirmed → credited` (Ethereum "finalized" tracked separately, ~15 min, used for reporting only — never claimed as "12 blocks = finality").
- Base credit threshold and Ethereum credit threshold tuned independently without redeploy.

## 4. Watchers & payout workers

- One deposit scanner instance per chain (Base + Ethereum), sharing the existing idempotent `crypto_observe_deposit` / `crypto_credit_deposit` flow, keyed by `chain_id + tx_hash + log_index` (native ETH uses tx-level unique identity).
- Withdrawal worker per chain with separate payout signers:
  - Base payout signer ≠ Ethereum payout signer ≠ deposit treasury signer.
  - Server holds only minimum signing authority for automated payouts; production treasury is not a normal server-controlled key (cold/multisig custody documented as ops requirement).

## 5. Gas handling

- Gas estimated for the **exact transaction** (estimateGas + current fee data), with a configured safety margin.
- Enforced before broadcast: `payout_amount + estimated_fee <= held_amount`; payout after fees must be positive.
- Base: house-subsidized gas (<1¢). Ethereum L1: gas deducted from the user's withdrawal, shown in the quote before confirmation.

## 6. Risk limits & emergency controls

- Per-chain hot-wallet max balance, low-balance alert, high-balance alert.
- Daily global withdrawal volume limit, per-user limit, per-transaction limit.
- Withdrawals above the auto-approve cap (default $100) require manual admin approval.
- Global emergency stop switch; signer-failure stop; RPC disagreement detection (two independent RPCs must agree before crediting).

## 7. Cross-chain liquidity rules

- Reconciliation runs **per chain and per asset**, plus a unified liability reconciliation.
- Explicit shortage state: if a chain's hot wallet can't cover a withdrawal, the withdrawal enters a `liquidity_pending` state (queued + admin alerted) — never an unpredictable failure. Admin can rebalance or temporarily disable that chain's withdrawals.

## 8. Frontend (/wallet)

- Network selector tabs: **Base (Recommended — <1¢ fee)** | **Ethereum Mainnet**.
- MetaMask auto-switching between Base (`0x2105`) and Ethereum (`0x1`) per selection.
- Remove all TEST badges, "TEST CREDITS" headers, and the hourly test-credit faucet across the site (faucet function disabled server-side too).
- Deposit panel shows personal deposit address, min deposit, and expected confirmation time per chain.

## 9. Tests

- Multi-chain ledger invariants: Base $100 + Ethereum $100 deposits = $200 balance; $50 bet = $150; Base $100 withdrawal reduces unified balance once and only Base liability.
- Duplicate/replayed deposits across chains (same tx hash on both chains must not collide).
- Concurrent bets/withdrawals, failed withdrawals, quote expiry, idempotent settlement.
- Chain-specific liquidity shortage behavior, gas-fee edge cases (fee ≥ payout rejected).
- Existing fairness, game-logic, and wallet-security suites must keep passing unchanged.

## 10. Rollout

1. Schema migration + chain registry (Sepolia kept enabled).
2. Personal deposit addresses + dual watchers on mainnet in **observe-only** mode (no crediting).
3. Enable crediting + withdrawals behind admin switches; small-value live test.
4. Remove test UI/faucet; disable Sepolia rails after verification.

## Out of scope (flagged, not built)

- Real-money gambling licensing, geo-fencing, KYC/AML, responsible-gambling tooling — legal/compliance prerequisites the owner must resolve before accepting real funds.
- Cold-storage/multisig treasury setup — operational step with the owner's key custody provider.
