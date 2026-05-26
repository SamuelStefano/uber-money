// Chainlink CRE workflow — Uber Money score → CCIP → Solana Anchor.
// Roda em WASM (Javy); SEM node:fs, node:crypto, fetch — usa só @chainlink/cre-sdk.
//
// Fluxo:
//   HTTPTrigger → fetchScore (consensus median) → report ECDSA → writeReport
//   no Sender EVM (Sepolia) → Sender chama CCIP → Anchor program (Solana devnet)
//
// Ref: docs.chain.link/cre · docs.chain.link/ccip/tutorials/svm/receivers
import {
  HTTPTrigger, HTTPClient, EVMClient,
  handler, consensusMedianAggregation,
  Runner, type NodeRuntime, type Runtime,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters } from 'viem'

type Config = {
  scoreApiBase: string         // e.g. https://uber-money.supabase.co/functions/v1
  senderAddress: `0x${string}` // EVM Sender contract on Sepolia
  chainName: string            // "ethereum-sepolia"
  gasLimit: string
}

type Payload = { wallet: string; printUrl: string; cnhUrl: string }

const fetchScore = (cfg: Payload) =>
  (nodeRuntime: NodeRuntime<Config>): bigint => {
    const apiKey = nodeRuntime.getSecret({ id: 'SCORE_API_KEY' }).result()
    const http = new HTTPClient()
    const res = http.sendRequest(nodeRuntime, {
      url: `${nodeRuntime.config.scoreApiBase}/compute-score`,
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(cfg),
    }).result()
    return BigInt(JSON.parse(res.body).limitUsdcMicro)
  }

const onHttp = (runtime: Runtime<Config>, payload: Payload): string => {
  const limit = runtime.runInNodeMode(fetchScore(payload), consensusMedianAggregation())().result()

  // bytes32 solanaWallet (base58 → bytes) + uint64 limit
  const encoded = encodeAbiParameters(
    parseAbiParameters('bytes32 solanaWallet, uint64 limitUsdcMicro'),
    ['0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`, limit],
  )

  const report = runtime.report({
    encodedPayload: encoded,
    encoderName: 'evm',
    signingAlgo: 'ecdsa',
    hashingAlgo: 'keccak256',
  }).result()

  const evm = new EVMClient(runtime.config.chainName)
  evm.writeReport(runtime, {
    receiver: runtime.config.senderAddress,
    report,
    gasConfig: { gasLimit: runtime.config.gasLimit },
  }).result()

  runtime.log(`score-delivery limit=${limit} → ccipSend`)
  return 'ok'
}

const initWorkflow = (_config: Config) => {
  const trigger = new HTTPTrigger().trigger({})
  return [handler(trigger, onHttp)]
}

export async function main() {
  const runner = await Runner.newRunner<Config>()
  await runner.run(initWorkflow)
}
