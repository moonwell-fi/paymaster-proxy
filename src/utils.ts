import { DurableObject } from "cloudflare:workers";
import { UserOperation, ENTRYPOINT_ADDRESS_V06 } from "permissionless";
import {
  Address,
  BlockTag,
  Hex,
  decodeAbiParameters,
  decodeFunctionData,
  createPublicClient,
  http,
} from "viem";
import { baseSepolia, base } from "viem/chains";
import {
  baseTestnetContracts,
  baseMainnetContracts
} from "./config";
import {
  coinbaseSmartWalletABI,
  coinbaseSmartWalletFactoryAddress,
  coinbaseSmartWalletProxyBytecode,
  coinbaseSmartWalletV1Implementation,
  erc1967ProxyImplementationSlot,
  magicSpendAddress
} from "./constants"

export async function willSponsor({
  chainId,
  entrypoint,
  userOp,
}: { chainId: number; entrypoint: string; userOp: UserOperation<"v0.6"> }) {
  // check chain id
  if ((chainId !== baseSepolia.id)&&(chainId !== base.id)) return false;
  // check entrypoint
  // not strictly needed given below check on implementation address, but leaving as example
  if (entrypoint.toLowerCase() !== ENTRYPOINT_ADDRESS_V06.toLowerCase())
    return false;

  try {
    // check the userOp.sender is a proxy with the expected bytecode
    let client;
    let contracts;
    switch (chainId) {
      case baseSepolia.id:
        client = createPublicClient({
          chain: baseSepolia,
          transport: http(),
      });
        contracts = baseTestnetContracts;
        break;
      case base.id:
        client = createPublicClient({
          chain: base,
          transport: http(),
      });
        contracts = baseMainnetContracts;
        break;
    }

    const code = await client.getBytecode({ address: userOp.sender });

    if (!code) {
      // no code at address, check that the initCode is deploying a Coinbase Smart Wallet
      // factory address is first 20 bytes of initCode after '0x'
      const factoryAddress = userOp.initCode.slice(0, 42);
      if (factoryAddress.toLowerCase() !== coinbaseSmartWalletFactoryAddress.toLowerCase())
        return false;
    } else {
      // code at address, check that it is a proxy to the expected implementation
      if (code != coinbaseSmartWalletProxyBytecode) return false;

      // check that userOp.sender proxies to expected implementation
      const implementation = await client.request<{
        Parameters: [Address, Hex, BlockTag];
        ReturnType: Hex;
      }>({
        method: "eth_getStorageAt",
        params: [userOp.sender, erc1967ProxyImplementationSlot, "latest"],
      });
      const implementationAddress = decodeAbiParameters(
        [{ type: "address" }],
        implementation
      )[0];
      if (implementationAddress != coinbaseSmartWalletV1Implementation)
        return false;
    }

    // check that userOp.callData is making a call we want to sponsor
    const calldata = decodeFunctionData({
      abi: coinbaseSmartWalletABI,
      data: userOp.callData,
    });

    // keys.coinbase.com always uses executeBatch
    if (calldata.functionName !== "executeBatch") return false;
    if (!calldata.args || calldata.args.length == 0) return false;

    const calls = calldata.args[0] as {
      target: Address;
      value: bigint;
      data: Hex;
    }[];
    // modify if want to allow batch calls to your contract
    if (calls.length > 2) return false;

    let callToCheckIndex = 0;
    if (calls.length > 1) {
      // if there is more than one call, check if the first is a magic spend call
      if (calls[0].target.toLowerCase() !== magicSpendAddress.toLowerCase())
        return false;
      callToCheckIndex = 1;
    }

    // check that the target of the call is one of the contracts we want to sponsor
    const lowerCaseContracts = contracts.map(contract => contract.toLowerCase());
    if (!lowerCaseContracts.includes(calls[callToCheckIndex].target.toLowerCase())) {
      return false;
    }

    // example to show how to check the inner calldata of a call
    /* const innerCalldata = decodeFunctionData({
      abi: myNFTABI,
      data: calls[callToCheckIndex].data,
    });
    if (innerCalldata.functionName !== "safeMint") return false; */

    return true;
  } catch (e) {
    console.error(`willSponsor check failed: ${e}`);
    return false;
  }
}