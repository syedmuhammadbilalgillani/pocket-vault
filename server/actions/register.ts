"use server"

import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/database/connection"
import { users } from "@/lib/database/schema"
import { hashPassword } from "@/lib/auth/password"
import { createVerificationToken } from "@/lib/auth/verification-tokens"
import { sendVerificationEmail } from "@/lib/email/send"
import { checkRateLimit, RATE_LIMITS } from "@/lib/auth/rate-limit"
import { maskIpAddress } from "@/lib/auth/request-info"
import { logAuditEvent } from "@/lib/auth/audit"

const registerSchema = z.object({
  email: z.string().email(),
  // Length only here; real strength feedback belongs in the vault's
  // password-strength UI (roadmap 6.2), not gatekeeping account creation.
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(100).optional(),
})

export type RegisterState = {
  status: "idle" | "success" | "error"
  message?: string
}

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName") || undefined,
  })

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const email = parsed.data.email.toLowerCase()
  const ip = maskIpAddress((await headers()).get("x-forwarded-for")?.split(",")[0]?.trim())

  if (!checkRateLimit(`register-ip:${ip ?? "unknown"}`, RATE_LIMITS.registrationPerIp).allowed) {
    return { status: "error", message: "Too many attempts. Try again later." }
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)

  // Always return the same success response whether or not the email is
  // already registered, so this endpoint can't be used to enumerate
  // accounts (roadmap 7.4). A real duplicate just doesn't get a new row.
  if (!existing) {
    const passwordHash = await hashPassword(parsed.data.password)
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, displayName: parsed.data.displayName })
      .returning({ id: users.id })

    const token = await createVerificationToken(user.id, "email_verification")
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify-email?token=${token}`
    await sendVerificationEmail(email, verifyUrl)

    await logAuditEvent({ userId: user.id, eventType: "registration.success", ipAddressMasked: ip })
  } else {
    await logAuditEvent({ eventType: "registration.duplicate", ipAddressMasked: ip, metadataRedacted: { email } })
  }

  return {
    status: "success",
    message: "Check your email to verify your account before logging in.",
  }
}
