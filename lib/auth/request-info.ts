// Never store a full client IP (see roadmap 7.6 never-log list) — mask the
// last octet (IPv4) or last groups (IPv6) before it touches sessions/audit rows.
export function maskIpAddress(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined

  if (ip.includes(":")) {
    const groups = ip.split(":")
    return `${groups.slice(0, 4).join(":")}::`
  }

  const parts = ip.split(".")
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`
  }

  return undefined
}

export function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim()
  return undefined
}

// Coarse, human-readable device summary from the User-Agent header. Not a
// full UA parse — good enough for a device list, not for fingerprinting.
export function summarizeUserAgent(userAgent: string | null | undefined) {
  if (!userAgent) return { browser: undefined, operatingSystem: undefined, deviceName: undefined }

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : undefined

  const operatingSystem = /Windows/.test(userAgent)
    ? "Windows"
    : /Mac OS X/.test(userAgent)
      ? "macOS"
      : /Android/.test(userAgent)
        ? "Android"
        : /iPhone|iPad/.test(userAgent)
          ? "iOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : undefined

  const deviceName = [browser, operatingSystem].filter(Boolean).join(" on ") || undefined

  return { browser, operatingSystem, deviceName }
}
