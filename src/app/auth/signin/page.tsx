import { Suspense } from "react"
import Link from "next/link"
import { Calculator, HeartPulse, LineChart, ShieldCheck, Target } from "lucide-react"
import { SignInForm } from "./signin-form"

const HIGHLIGHTS = [
  { icon: LineChart, label: "Portfolio tracking, returns and allocation" },
  { icon: Calculator, label: "21 deterministic financial calculators" },
  { icon: HeartPulse, label: "A transparent Financial Health score" },
  { icon: Target, label: "Goals with progress and monthly targets" },
]

export default function SignInPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#052b27] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at 30% 20%, black, transparent 75%)",
          }}
        />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-teal-300/15 blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-base font-bold ring-1 ring-white/20 backdrop-blur">
              W
            </span>
            <span className="text-lg font-semibold tracking-tight">Wealth</span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
            Your financial command centre
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-balance">
            Know exactly where your money stands.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-emerald-50/70">
            One calm place for your portfolio, net worth, goals and financial health —
            with every number computed, never guessed.
          </p>

          <ul className="mt-9 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-emerald-50/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-emerald-200" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-emerald-100/60">
          <ShieldCheck className="h-4 w-4" />
          Read-only tracking. We never ask for broker passwords, PINs or OTPs.
        </div>
      </aside>

      <main className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md animate-rise">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              W
            </span>
            <span className="text-base font-semibold tracking-tight">Wealth</span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Welcome
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Sign in to your dashboard
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track investments, plan goals and understand your financial health.
          </p>

          <div className="mt-7">
            <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-muted" />}>
              <SignInForm />
            </Suspense>
          </div>

          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
            By continuing you agree to keep credentials private. This app is read-only and does
            not execute trades. Projections are estimates, not guarantees.
          </p>
        </div>
      </main>
    </div>
  )
}
