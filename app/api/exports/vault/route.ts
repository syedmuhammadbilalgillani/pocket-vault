import { NextRequest, NextResponse } from "next/server"
import { format } from "date-fns"

import { requireUser } from "@/lib/auth/require-user"
import { verifyExportToken } from "@/lib/auth/export-token"
import { listVaultItems } from "@/server/repositories/vault-items"
import { listVaultCategories } from "@/server/repositories/vault-categories"
import { logAuditEvent } from "@/lib/auth/audit"

// This export is intentionally still encrypted — every field stays exactly
// as stored (ciphertext, wrappedDek, nonceMetadata, encryptionKeyVersion).
// It is only useful as a backup that this same app (with access to the KEK)
// can read back; it is NOT a portable plaintext export to another password
// manager. Decrypting an entire vault to plaintext for a bulk download
// would be a much larger exposure than the "reveal one password at a time"
// flow the rest of the vault UI uses. A genuinely portable export would
// need client-side decryption and re-encryption under a user-chosen export
// password — that's future work (roadmap 6.2 "Future vault features:
// Encrypted export"), not this endpoint.
export async function GET(request: NextRequest) {
  const user = await requireUser()

  const token = request.nextUrl.searchParams.get("token") ?? ""
  if (!verifyExportToken(token, user.id, "vault")) {
    return NextResponse.json({ error: "Missing or expired export confirmation" }, { status: 401 })
  }

  const [items, categories] = await Promise.all([listVaultItems(user.id), listVaultCategories(user.id)])
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  const payload = {
    exportedAt: new Date().toISOString(),
    format: "pocket-vault-encrypted-backup-v1",
    items: items.map((item) => ({
      title: item.title,
      category: item.categoryId ? (categoryNameById.get(item.categoryId) ?? null) : null,
      isFavorite: item.isFavorite,
      encryptedUsername: item.encryptedUsername,
      encryptedPassword: item.encryptedPassword,
      encryptedWebsite: item.encryptedWebsite,
      encryptedNotes: item.encryptedNotes,
      encryptedCustomFields: item.encryptedCustomFields,
      wrappedDek: item.wrappedDek,
      encryptionKeyVersion: item.encryptionKeyVersion,
      nonceMetadata: item.nonceMetadata,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  }

  await logAuditEvent({
    userId: user.id,
    eventType: "export.vault",
    metadataRedacted: { itemCount: items.length },
  })

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pocket-vault-backup-${format(new Date(), "yyyy-MM-dd")}.json"`,
    },
  })
}
