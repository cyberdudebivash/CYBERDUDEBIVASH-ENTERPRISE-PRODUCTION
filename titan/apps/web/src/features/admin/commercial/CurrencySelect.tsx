import { SUPPORTED_CURRENCIES } from "@titan/platform";
import type { Currency } from "@titan/platform";

export interface CurrencySelectProps {
  value: Currency;
  onChange: (currency: Currency) => void;
  disabled?: boolean;
}

/** Real, multi-currency checkout: lets the customer pick which currency
 * they're billed in before opening Razorpay Checkout —
 * `SUPPORTED_CURRENCIES` (`@titan/platform`) is the one place that list is
 * defined, so this select can never drift out of sync with what the
 * backend actually accepts. */
export function CurrencySelect({ value, onChange, disabled }: CurrencySelectProps) {
  return (
    <label className="titan-currency-select">
      Billing currency
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Currency)}
        disabled={disabled}
      >
        {SUPPORTED_CURRENCIES.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </label>
  );
}
