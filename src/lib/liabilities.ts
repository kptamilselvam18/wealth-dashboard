export const DEBT_TYPES = ["CREDIT_CARD", "PERSONAL_LOAN", "EDUCATION_LOAN", "HOME_LOAN", "OTHER"] as const
export function parseLiability(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const type = body.type as typeof DEBT_TYPES[number]
  const outstandingAmount = body.outstandingAmount === "" || body.outstandingAmount == null ? NaN : Number(body.outstandingAmount)
  const interestRate = body.interestRate === "" || body.interestRate == null ? null : Number(body.interestRate)
  const emi = body.emi === "" || body.emi == null ? null : Number(body.emi)
  if (!name || name.length > 100) throw new Error("Enter a name of up to 100 characters")
  if (!DEBT_TYPES.includes(type)) throw new Error("Choose a valid debt type")
  if (!Number.isFinite(outstandingAmount) || outstandingAmount < 0) throw new Error("Balance must be zero or more")
  if (interestRate !== null && (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 100)) throw new Error("Interest rate must be between 0 and 100")
  if (emi !== null && (!Number.isFinite(emi) || emi < 0)) throw new Error("Monthly payment must be zero or more")
  return { name, type, outstandingAmount, interestRate, emi }
}
