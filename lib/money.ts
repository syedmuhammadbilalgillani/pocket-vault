// Money is always stored as an integer minor unit (e.g. cents), never a
// float — see roadmap 8.6. These are the only two places that should ever
// convert between that and a human-facing decimal string.

export function parseAmountToMinor(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ""] = trimmed.split(".");
  const cents = (fraction + "00").slice(0, 2);
  return Number(whole) * 100 + Number(cents);
}

export function formatMinor(amountMinor: number, currency = "PKR"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    amountMinor / 100,
  );
}

// For prefilling an editable amount input — plain "12.34", no currency symbol.
export function minorToAmountString(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}
