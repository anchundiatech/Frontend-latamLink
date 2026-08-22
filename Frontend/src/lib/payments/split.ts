/**
 * Reparte un cobro igual que el contrato, para poder guardar en la base los
 * mismos importes que quedaron on-chain.
 *
 * El orden importa y es el del programa: primero la comisión POS sobre el monto
 * bruto, después la comisión de gas sobre lo que queda, y recién entonces el
 * reparto entre destinos. Todas las divisiones truncan hacia abajo, así que el
 * remanente ("dust") se suma a la bóveda de gas y nada se pierde.
 */
export interface SplitBreakdown {
  posFee: bigint
  gasFee: bigint
  splits: bigint[]
  dust: bigint
}

export function computeSplit(input: {
  amount: bigint
  posFeeBps: number
  feeBps: number
  percentages: number[]
}): SplitBreakdown {
  const { amount, posFeeBps, feeBps, percentages } = input

  const posFee = (amount * BigInt(posFeeBps)) / 10_000n
  const afterPosFee = amount - posFee
  const gasFee = (afterPosFee * BigInt(feeBps)) / 10_000n
  const distributable = afterPosFee - gasFee

  const splits = percentages.map((p) => (distributable * BigInt(p)) / 100n)
  const distributed = splits.reduce((total, value) => total + value, 0n)

  return { posFee, gasFee, splits, dust: distributable - distributed }
}
