import { encodeFunctionData, parseAbi, type Hex } from "viem";
import { TESTNET } from "./allowlist";

const ERC20_TRANSFER = parseAbi(["function transfer(address to, uint256 value) returns (bool)"]);

export type DepositAsset = "USDC" | "ETH";

export interface DepositInstruction {
  asset: DepositAsset;
  chainId: number;
  treasury: `0x${string}`;
  token: `0x${string}` | null;
  units: string;
}

export function buildDepositTransaction(instruction: DepositInstruction) {
  if (instruction.chainId !== TESTNET.chainId) throw new Error("UNSUPPORTED_NETWORK");
  if (!/^0x[0-9a-fA-F]{40}$/.test(instruction.treasury)) throw new Error("INVALID_TREASURY");
  const units = BigInt(instruction.units);
  if (units <= 0n) throw new Error("INVALID_AMOUNT");

  if (instruction.asset === "ETH") {
    if (instruction.token !== null) throw new Error("INVALID_ASSET_CONFIG");
    return { to: instruction.treasury, value: `0x${units.toString(16)}` as Hex };
  }
  if (instruction.token?.toLowerCase() !== TESTNET.usdc) throw new Error("INVALID_ASSET_CONFIG");
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