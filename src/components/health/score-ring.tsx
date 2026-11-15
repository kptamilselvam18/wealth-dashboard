export function ScoreRing({
  score,
  size = 132,
  label,
}: {
  score: number | null
  size?: number
  label?: string
}) {
  const value = score === null ? 0 : Math.max(0, Math.min(100, score))

  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(rgba(255,255,255,0.95) ${value * 3.6}deg, rgba(255,255,255,0.22) 0deg)`,
      }}
      role="img"
      aria-label={label ?? `Score ${score ?? "unknown"} out of 100`}
    >
      <div className="flex h-[78%] w-[78%] flex-col items-center justify-center rounded-full bg-primary text-primary-foreground">
        <span className="text-2xl font-bold leading-none">{score === null ? "—" : score}</span>
        <span className="mt-1 text-[10px] uppercase tracking-wider opacity-80">of 100</span>
      </div>
    </div>
  )
}
