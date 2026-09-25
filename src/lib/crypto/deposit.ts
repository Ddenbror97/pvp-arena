import { encodeFunctionData, parseAbi, type Hex } from "viem";

const ERC20_TRANSFER = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);

export type DepositAsset = "USDC" | "ETH";

export interface DepositInstruction {
  asset: DepositAsset;
  chainId: number;
  /** Destination: the player's personal deposit address, or the shared treasury on the legacy testnet flow. */
  treasury: `0x${string}`;
  token: `0x${string}` | null;
  units: string;
}

/**
 * Builds the exact deposit transaction the user signs. Validates only shape and
 * internal consistency — the allowed chain/token/destination values come from
 * the server (registry-driven), never from client-supplied constants.
 */
export function buildDepositTransaction(instruction: DepositInstruction) {
  if (!Number.isInteger(instruction.chainId) || instruction.chainId <= 0) throw new Error("UNSUPPORTED_NETWORK");
  if (!/^0x[0-9a-fA-F]{40}$/.test(instruction.treasury)) throw new Error("INVALID_DESTINATION");
  const units = BigInt(instruction.units);
  if (units <= 0n) throw new Error("INVALID_AMOUNT");

  if (instruction.asset === "ETH") {
    if (instruction.token !== null) throw new Error("INVALID_ASSET_CONFIG");
    return { to: instruction.treasury, value: `0x${units.toString(16)}` as Hex };
  }
  if (!instruction.token || !/^0x[0-9a-fA-F]{40}$/.test(instruction.token)) throw new Error("INVALID_ASSET_CONFIG");
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
