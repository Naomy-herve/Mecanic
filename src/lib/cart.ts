export type CartItem = {
  id: string;
  sku: string;
  name: string;
  price: number;
  currency: "MGA" | "EUR" | "USD";
  quantity: number;
};

const STORAGE_KEY = "kia-cart";
const CURRENCIES = new Set(["MGA", "EUR", "USD"]);

function validItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 &&
    typeof item.sku === "string" && typeof item.name === "string" &&
    typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0 &&
    typeof item.currency === "string" && CURRENCIES.has(item.currency) &&
    typeof item.quantity === "number" && Number.isInteger(item.quantity) &&
    item.quantity >= 1 && item.quantity <= 20;
}

export function readCart(): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const result: CartItem[] = [];
    const positions = new Map<string, number>();
    for (const value of parsed) {
      if (!validItem(value)) continue;
      const existing = positions.get(value.id);
      if (existing !== undefined) {
        const current = result[existing];
        if (current.currency === value.currency && current.price === value.price) {
          current.quantity = Math.min(20, current.quantity + value.quantity);
        }
        continue;
      }
      if (result.length >= 30) break;
      positions.set(value.id, result.length);
      result.push({ id: value.id, sku: value.sku, name: value.name, price: value.price, currency: value.currency, quantity: value.quantity });
    }
    return result;
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  const safe = items.filter(validItem).slice(0, 30);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    window.dispatchEvent(new Event("kia-cart-update"));
  } catch {
    throw new Error("Le panier ne peut pas être enregistré sur cet appareil.");
  }
}
