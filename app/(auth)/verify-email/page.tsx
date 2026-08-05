import Link from "next/link"

import { verifyEmail } from "@/server/actions/verify-email"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const result = token ? await verifyEmail(token) : { success: false }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{result.success ? "Email verified" : "Verification failed"}</CardTitle>
        <CardDescription>
          {result.success
            ? "Your email is confirmed. You can log in now."
            : "This link is invalid or has expired. Request a new one by registering again."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/login">Go to login</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
