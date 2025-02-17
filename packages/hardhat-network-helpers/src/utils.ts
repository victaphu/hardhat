import type { BN } from "ethereumjs-util";
import type { EIP1193Provider } from "hardhat/types";

import type { NumberLike } from "./types";

import { HardhatNetworkHelpersError, OnlyHardhatNetworkError } from "./errors";

let cachedIsHardhatNetwork: boolean;
async function checkIfHardhatNetwork(
  provider: EIP1193Provider,
  networkName: string
): Promise<boolean> {
  let version: string | undefined;
  if (cachedIsHardhatNetwork === undefined) {
    try {
      version = (await provider.request({
        method: "web3_clientVersion",
      })) as string;

      cachedIsHardhatNetwork = version
        .toLowerCase()
        .startsWith("hardhatnetwork");
    } catch (e) {
      cachedIsHardhatNetwork = false;
    }
  }

  if (!cachedIsHardhatNetwork) {
    throw new OnlyHardhatNetworkError(networkName, version);
  }

  return cachedIsHardhatNetwork;
}

export async function getHardhatProvider(): Promise<EIP1193Provider> {
  const hre = await import("hardhat");

  const provider = hre.network.provider;

  await checkIfHardhatNetwork(provider, hre.network.name);

  return hre.network.provider;
}

export function toBigInt(x: NumberLike): bigint {
  return BigInt(toRpcQuantity(x));
}

export function toRpcQuantity(x: NumberLike): string {
  let hex: string;
  if (typeof x === "number" || typeof x === "bigint") {
    // TODO: check that number is safe
    hex = `0x${x.toString(16)}`;
  } else if (typeof x === "string") {
    if (!x.startsWith("0x")) {
      throw new HardhatNetworkHelpersError(
        "Only 0x-prefixed hex-encoded strings are accepted"
      );
    }
    hex = x;
  } else if ("toHexString" in x) {
    hex = x.toHexString();
  } else if ("toString" in x) {
    hex = x.toString(16);
  } else {
    throw new HardhatNetworkHelpersError(
      `${x as any} cannot be converted to an RPC quantity`
    );
  }

  if (hex === "0x0") return hex;

  return hex.startsWith("0x") ? hex.replace("0x0", "0x") : `0x${hex}`;
}

export function assertValidAddress(address: string): void {
  const { isValidChecksumAddress } = require("ethereumjs-util");
  const hasChecksum = address !== address.toLowerCase();
  if (!hasChecksum || !isValidChecksumAddress(address)) {
    throw new HardhatNetworkHelpersError(
      `${address} is not a valid hex address`
    );
  }
}

export function assertHexString(hexString: string): void {
  if (typeof hexString !== "string" || !/^0x[0-9a-fA-F]+$/.test(hexString)) {
    throw new HardhatNetworkHelpersError(
      `${hexString} is not a valid hex string`
    );
  }
}

export function assertTxHash(hexString: string): void {
  assertHexString(hexString);
  if (hexString.length !== 66) {
    throw new HardhatNetworkHelpersError(
      `${hexString} is not a valid transaction hash`
    );
  }
}

export function assertValidTargetBlock(target: BN, latest: BN): void {
  if (!target.gt(latest)) {
    throw new HardhatNetworkHelpersError(
      `Requested target block ${target.toString()} is not greater than current block height.`
    );
  }
}

export function assertPositiveNumber(n: bigint): void {
  if (n <= BigInt(0)) {
    throw new HardhatNetworkHelpersError(
      `Invalid input ${n} - number must be positive.`
    );
  }
}

export function assertLargerThan(a: bigint, b: bigint, type: string): void;
export function assertLargerThan(a: number, b: number, type: string): void;
export function assertLargerThan(
  a: number | bigint,
  b: number | bigint,
  type: string
): void {
  if (a <= b) {
    throw new HardhatNetworkHelpersError(
      `Invalid ${type} ${a} is not larger than current ${type} ${b}`
    );
  }
}

export function toPaddedRpcQuantity(
  x: NumberLike,
  bytesLength: number
): string {
  let rpcQuantity = toRpcQuantity(x);

  if (rpcQuantity.length < 2 + 2 * bytesLength) {
    const rpcQuantityWithout0x = rpcQuantity.slice(2);
    rpcQuantity = `0x${rpcQuantityWithout0x.padStart(2 * bytesLength, "0")}`;
  }

  return rpcQuantity;
}
