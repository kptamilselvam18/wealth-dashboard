import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { SignInForm } from "./signin-form"

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to access your financial dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <SignInForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}