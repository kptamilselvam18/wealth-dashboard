import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { CalculatorRunner } from "@/components/calculators/calculator-runner"
import { getCalculator } from "@/lib/calculators/definitions"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const calculator = getCalculator(slug)
  return {
    title: calculator ? `${calculator.name} · Wealth Dashboard` : "Calculator",
    description: calculator?.description,
  }
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const calculator = getCalculator(slug)
  if (!calculator) notFound()

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link
        href="/calculators"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All calculators
      </Link>

      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          {calculator.category}
        </p>
        <h1 className="mt-1 text-2xl font-bold">{calculator.name}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{calculator.description}</p>
      </div>

      <CalculatorRunner slug={calculator.slug} />
    </div>
  )
}
