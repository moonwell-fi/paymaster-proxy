import { DurableObject } from "cloudflare:workers";
import { createClient, http } from "viem";
import { base, baseSepolia, Chain } from "viem/chains";
import { baseTestnetContracts, baseMainnetContracts } from "./config";
import { ENTRYPOINT_ADDRESS_V06 } from "permissionless";
import { paymasterActionsEip7677 } from "permissionless/experimental";
import { willSponsor } from "./utils";

interface RequestData {
	method: string;
	params: [any, string, string];
}

export default {
	async fetch(request: Request, env: Record<string, any>, ctx: ExecutionContext): Promise<Response> {
		
		const req = await request.json() as RequestData;
		console.log(req);
		const method = req.method;
		console.log(req.params);
		const [userOp, entrypoint, chainIdParam] = req.params;
		let chain;
		let chainId;
		let transportUrl;
		switch (parseInt(chainIdParam, 16)) {
			case 84532:
				chain = baseSepolia;
				chainId = baseSepolia.id;
				transportUrl = env.TESTNET_PAYMASTER_SERVICE_URL;
				break;
			case 8453:
				chain = base;
				chainId = base.id;
				transportUrl = env.PAYMASTER_SERVICE_URL;
				break;
			default:
				console.log("Only Base ChainID 8453 and Base Sepolia ChainID 84532 are supported.")
				return Response.json({ error: "Only Base ChainID 8453 and Base Sepolia ChainID 84532 are supported." });
				break;
		} 

		let corsHeaders: any = {
    }

    let headersObject = Object.fromEntries(request.headers);
    if (headersObject) {
      corsHeaders['Access-Control-Allow-Origin'] = '*'
      corsHeaders['Access-Control-Allow-Headers'] = 'X-Requested-With,Content-Type'
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
      corsHeaders['Access-Control-Allow-Credentials'] = 'true'
    }

    // If it's a GET request, return the requested data
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

		const paymasterClient = createClient({
			chain: chain,
			transport: http(transportUrl),
		}).extend(paymasterActionsEip7677(ENTRYPOINT_ADDRESS_V06));

		console.log(req.params);
		if (!willSponsor({ chainId: chainId, entrypoint, userOp: userOp })) {
			console.log("Not a sponsorable operation");
			return Response.json({ error: "Not a sponsorable operation" });
		}
	
		if (method === "pm_getPaymasterStubData") {
			const result = await paymasterClient.getPaymasterStubData({
				userOperation: userOp as any,
			});
			return Response.json({ result }, { status: 200, headers: corsHeaders });
		} else if (method === "pm_getPaymasterData") {
			const result = await paymasterClient.getPaymasterData({
				userOperation: userOp as any,
			});
			console.log({ result }, { status: 200,headers: corsHeaders });
			return Response.json({ result }, { status: 200,headers: corsHeaders });
		}
		return Response.json({ error: "Method not found" });
	}
}

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	MY_DURABLE_OBJECT: DurableObjectNamespace<MyDurableObject>;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;
}

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject {
	/**
	 * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
	 * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
	 *
	 * @param ctx - The interface for interacting with Durable Object state
	 * @param env - The interface to reference bindings declared in wrangler.toml
	 */
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	/**
	 * The Durable Object exposes an RPC method sayHello which will be invoked when when a Durable
	 *  Object instance receives a request from a Worker via the same method invocation on the stub
	 *
	 * @param name - The name provided to a Durable Object instance from a Worker
	 * @returns The greeting to be sent back to the Worker
	 */
	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
	}
}
