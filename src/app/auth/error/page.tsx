import Link from "next/link"
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const MESSAGES: Record<string, string> = {
  Configuration:
    "The authentication provider is not configured correctly on this deployment. Check the client ID, client secret and authorised redirect URI.",
  OAuthCallback:
    "The provider rejected the callback. This usually means the authorised redirect URI in the provider console does not exactly match this deployment.",
  OAuthSignin: "The sign-in attempt could not be started. Please try again.",
  OAuthAccountNotLinked:
    "This email already has an account with a different sign-in method. Sign in with your password, or use the provider you originally signed up with.",
  AccessDenied: "Access was denied. If you closed the consent screen, try again.",
  CredentialsSignin: "Those credentials were not accepted. Check your email and password.",
  Default: "Something went wrong while signing you in. Please try again.",
}

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const message = (error && MESSAGES[error]) || MESSAGES.Default
  const isGoogleSetup = error === "OAuthCallback" || error === "Configuration"

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <Card className="w-full max-w-lg animate-rise">
        <CardHeader>
          <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <CardTitle className="text-xl font-semibold">Sign-in problem</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="rounded-lg bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
              Error code: {error}
            </p>
          )}

          {isGoogleSetup && (
            <div className="rounded-xl border border-border/80 bg-card/60 p-3 text-sm">
              <p className="font-medium">Google redirect URI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add <code className="rounded bg-muted px-1 py-0.5">/api/auth/callback/google</code>{" "}
                for this exact domain to the OAuth client, then retry.
              </p>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open Google Cloud credentials <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/auth/signin">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/auth/signin?mode=register">Create an account</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
