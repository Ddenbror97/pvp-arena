import { encodeFunctionData, getAddress, parseAbi, type Hex } from "viem";
import { BASE_DEPOSIT_TREASURY, BASE_MAINNET } from "./allowlist";

const ERC20_TRANSFER = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);

export type DepositAsset = string;

export interface DepositInstruction {
  asset: DepositAsset;
  chainId: number;
  /** Destination: the house Base treasury. The player sends from a linked wallet. */
  treasury: `0x${string}`;
  token: `0x${string}` | null;
  units: string;
}

/**
 * The address a player is told to pay. Base accepts only the house wallet.
 * Any other treasury, including a personal deposit address, is refused.
 */
export function publishedDepositAddress(
  chainId: number,
  treasury: string | null | undefined,
):
  | { ok: true; address: `0x${string}` }
  | { ok: false; reason: "CHAIN_NOT_VERIFIED" | "TREASURY_MISSING" | "TREASURY_MISMATCH" } {
  if (chainId !== BASE_MAINNET.chainId) return { ok: false, reason: "CHAIN_NOT_VERIFIED" };
  if (!treasury || !/^0x[0-9a-fA-F]{40}$/.test(treasury)) {
    return { ok: false, reason: "TREASURY_MISSING" };
  }
  if (treasury.toLowerCase() !== BASE_DEPOSIT_TREASURY.toLowerCase()) {
    return { ok: false, reason: "TREASURY_MISMATCH" };
  }
  return { ok: true, address: getAddress(BASE_DEPOSIT_TREASURY) };
}

/**
 * Builds the exact deposit transaction the user signs. Validates only shape and
 * internal consistency — the allowed chain/token/destination values come from
 * the server (registry-driven), never from client-supplied constants.
 */
export function buildDepositTransaction(instruction: DepositInstruction) {
  if (!Number.isInteger(instruction.chainId) || instruction.chainId <= 0)
    throw new Error("UNSUPPORTED_NETWORK");
  if (!/^0x[0-9a-fA-F]{40}$/.test(instruction.treasury)) throw new Error("INVALID_DESTINATION");
  const units = BigInt(instruction.units);
  if (units <= 0n) throw new Error("INVALID_AMOUNT");

  if (instruction.asset === "ETH") {
    if (instruction.token !== null) throw new Error("INVALID_ASSET_CONFIG");
    return { to: instruction.treasury, value: `0x${units.toString(16)}` as Hex };
  }
  if (!instruction.token || !/^0x[0-9a-fA-F]{40}$/.test(instruction.token))
    throw new Error("INVALID_ASSET_CONFIG");
  return {
    to: instruction.token,
    value: "0x0" as Hex,
    data: encodeFunctionData({
      abi: ERC20_TRANSFER,
      functionName: "transfer",
      args: [instruction.treasury, units],
    }),
  };
}
