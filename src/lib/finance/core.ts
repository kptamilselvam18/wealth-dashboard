/**
 * Shared numeric helpers for the deterministic finance engine.
 * Every function here is pure: same inputs, same outputs, no I/O.
 */

export class CalculationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CalculationError"
  }
}

/** Round to a fixed number of decimals without float noise. */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Clamp a number into a range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function assertFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new CalculationError(`${field} must be a number`)
  }
  return value
}

export function assertRange(value: number, field: string, min: number, max: number): number {
  assertFinite(value, field)
  if (value < min || value > max) {
    throw new CalculationError(`${field} must be between ${min} and ${max}`)
  }
  return value
}

/** Monthly rate from an annual nominal percentage. */
export function monthlyRate(annualPercent: number): number {
  return annualPercent / 100 / 12
}

/** Future value of an ordinary annuity. */
export function annuityFutureValue(payment: number, monthlyInterest: number, months: number): number {
  if (months <= 0) return 0
  if (Math.abs(monthlyInterest) < 1e-12) return payment * months
  return payment * ((1 + monthlyInterest) ** months - 1) / monthlyInterest
}

/** Present value of an ordinary annuity. */
export function annuityPresentValue(payment: number, interest: number, periods: number): number {
  if (periods <= 0) return 0
  if (Math.abs(interest) < 1e-12) return payment * periods
  return payment * (1 - (1 + interest) ** -periods) / interest
}
