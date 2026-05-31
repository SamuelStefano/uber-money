import {
	cre,
	type HTTPPayload,
	Runner,
	type Runtime,
} from '@chainlink/cre-sdk'
import { z } from 'zod'

const configSchema = z.object({
	scoreApiBase: z.string(),
	chainSelectorName: z.string(),
	minIncomeBRL: z.number(),
	scoreThreshold: z.number(),
	maxLoanUsdcMicro: z.string(),
})

type Config = z.infer<typeof configSchema>

const inputSchema = z.object({
	wallet: z.string(),
	monthlyIncomeBRL: z.number(),
	requestedAmountBRL: z.number(),
})

type WorkflowInput = z.infer<typeof inputSchema>

type Decision = {
	wallet: string
	approved: boolean
	score: number
	limitBRL: number
	requestedAmountBRL: number
	interestPctMonthly: number
	reason: string
}

function computeScore(input: WorkflowInput, cfg: Config): Decision {
	const MONTHS_RANGE = 6
	const MAX_RATIO = 0.30
	const BASE_INTEREST = 2.9
	const MAX_INTEREST = 4.9

	if (input.monthlyIncomeBRL < cfg.minIncomeBRL) {
		return {
			wallet: input.wallet,
			approved: false,
			score: 0,
			limitBRL: 0,
			requestedAmountBRL: input.requestedAmountBRL,
			interestPctMonthly: MAX_INTEREST,
			reason: `income_below_minimum (R$${cfg.minIncomeBRL})`,
		}
	}

	const limitBRL = Math.round(input.monthlyIncomeBRL * MONTHS_RANGE * MAX_RATIO * 100) / 100
	const score = Math.min(1000, Math.floor(input.monthlyIncomeBRL / 10))
	const approved =
		score >= cfg.scoreThreshold && input.requestedAmountBRL <= limitBRL
	const interestPctMonthly = approved
		? Math.round((BASE_INTEREST + (1 - score / 1000) * (MAX_INTEREST - BASE_INTEREST)) * 100) / 100
		: MAX_INTEREST

	return {
		wallet: input.wallet,
		approved,
		score,
		limitBRL,
		requestedAmountBRL: input.requestedAmountBRL,
		interestPctMonthly,
		reason: approved
			? 'approved'
			: input.requestedAmountBRL > limitBRL
				? 'requested_above_limit'
				: 'score_below_threshold',
	}
}

const onHTTPTrigger = (runtime: Runtime<Config>, payload: HTTPPayload): string => {
	runtime.log('CRE workflow triggered (AltPay score)')

	if (!payload.input || payload.input.length === 0) {
		throw new Error('HTTP trigger payload is required')
	}

	const raw = new TextDecoder().decode(payload.input)
	runtime.log(`Raw payload: ${raw}`)

	const parsed = JSON.parse(raw)
	const input = inputSchema.parse(parsed)

	runtime.log(
		`Score input | wallet=${input.wallet} income=R$${input.monthlyIncomeBRL} requested=R$${input.requestedAmountBRL}`,
	)

	const decision = computeScore(input, runtime.config)

	runtime.log(`Score decision | ${JSON.stringify(decision)}`)
	runtime.log(
		`Outcome: ${decision.approved ? 'APPROVED' : 'REJECTED'} (${decision.reason})`,
	)

	return JSON.stringify(decision)
}

const initWorkflow = (_config: Config) => {
	const httpTrigger = new cre.capabilities.HTTPCapability()
	return [cre.handler(httpTrigger.trigger({}), onHTTPTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}

main()
