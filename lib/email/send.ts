// TODO: replace with a real provider before staging/production, per roadmap
// section 4 (Resend, Postmark, or Amazon SES). This stub only logs, so
// verification/reset links currently only work in local development.
export async function sendEmail(params: { to: string; subject: string; text: string }) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("No email provider configured — see lib/email/send.ts")
  }
  console.log(`[email:dev] to=${params.to} subject="${params.subject}"\n${params.text}`)
}

export function sendVerificationEmail(to: string, verifyUrl: string) {
  return sendEmail({
    to,
    subject: "Verify your Pocket Vault email",
    text: `Confirm your email address: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  })
}

export function sendPasswordResetEmail(to: string, resetUrl: string) {
  return sendEmail({
    to,
    subject: "Reset your Pocket Vault password",
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
  })
}
