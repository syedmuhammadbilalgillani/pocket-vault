"use client"

import { createContext, useContext, useSyncExternalStore } from "react"

const STORAGE_KEY = "pocket-vault:hide-balances"
const CHANGE_EVENT = "pocket-vault:privacy-changed"

const PrivacyContext = createContext<{ hidden: boolean; toggle: () => void } | null>(null)

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === "true"
}

function getServerSnapshot() {
  return false
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Reads localStorage directly rather than via an effect+setState — this
  // is the textbook useSyncExternalStore case for external mutable browser
  // state, and it avoids the extra render pass and hydration flash that a
  // "read on mount" effect would cause.
  const hidden = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function toggle() {
    localStorage.setItem(STORAGE_KEY, String(!hidden))
    // The native "storage" event only fires in other tabs, not this one, so
    // dispatch our own to make useSyncExternalStore re-read the new value here.
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error("usePrivacy must be used within a PrivacyProvider")
  return ctx
}
