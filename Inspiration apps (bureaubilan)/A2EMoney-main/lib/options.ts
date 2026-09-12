export const CATEGORIES = [
  "Food", "Transport", "Housing", "Office", "Marketing",
  "Software", "Travel", "Salaries", "Taxes", "Utilities", "Other",
] as const

export const PAYMENT_METHODS = [
  "Card", "Bank transfer", "Cash", "PayPal", "Other",
] as const

export const CATEGORY_I18N: Record<string, string> = {
  Food: "food",
  Transport: "transport",
  Housing: "housing",
  Office: "office",
  Marketing: "marketing",
  Software: "software",
  Travel: "travel",
  Salaries: "salaries",
  Taxes: "taxes",
  Utilities: "utilities",
  Other: "other",
}

export const PAYMENT_I18N: Record<string, string> = {
  Card: "card",
  "Bank transfer": "bankTransfer",
  Cash: "cash",
  PayPal: "paypal",
  Other: "other",
}
