import type { Tab, LineItem } from "@/types";

const CRYPTO_PARENT_NAMES = new Set(["Tangem", "Trust Wallet", "Ledger", "Crypto"]);

/**
 * Check if a tab is a crypto wallet tab.
 * Crypto tabs are children of parents named Tangem/Trust Wallet/Ledger/Crypto,
 * or standalone tabs with those names.
 */
export function isCryptoTab(tab: Tab, allTabs: Tab[]): boolean {
  // Check the parent name (for child tabs) or own name (for standalone)
  if (tab.parent_id) {
    const parent = allTabs.find((p) => p.id === tab.parent_id);
    if (parent && CRYPTO_PARENT_NAMES.has(parent.name)) return true;
  }
  return CRYPTO_PARENT_NAMES.has(tab.name);
}

/**
 * For a crypto tab, calculate total USD value: sum(quantity × price_usd).
 * Line items have label = ticker symbol (BTC, ETH, etc.) and amount = quantity.
 */
export function getCryptoTabUsdTotal(
  tabId: string,
  lineItems: LineItem[],
  cryptoPrices: Record<string, number>
): number {
  return lineItems
    .filter((li) => li.tab_id === tabId)
    .reduce((sum, li) => {
      const price = cryptoPrices[li.label] || 0;
      return sum + Number(li.amount) * price;
    }, 0);
}

/**
 * Get the EUR value for a tab, handling crypto tabs correctly.
 * For crypto: quantity × price_usd, then convert USD → EUR
 * For non-crypto: sum amounts, then convert tab.currency → EUR
 */
export function getTabEurValue(
  tab: Tab,
  lineItems: LineItem[],
  cryptoPrices: Record<string, number>,
  rates: Record<string, number>,
  allTabs: Tab[]
): number {
  if (isCryptoTab(tab, allTabs)) {
    const usdTotal = getCryptoTabUsdTotal(tab.id, lineItems, cryptoPrices);
    const usdRate = rates.USD || 1;
    return usdTotal / usdRate;
  }
  const rawSum = lineItems
    .filter((li) => li.tab_id === tab.id)
    .reduce((s, li) => s + Number(li.amount), 0);
  if (tab.currency === "EUR") return rawSum;
  const rate = rates[tab.currency];
  return rate ? rawSum / rate : rawSum;
}
