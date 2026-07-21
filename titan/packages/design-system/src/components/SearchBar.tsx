import type { ChangeEvent } from "react";
import "./SearchBar.css";

export interface SearchBarProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * A controlled, labeled search input — deliberately not debounced itself
 * (EAP-2's Lead Workspace owns that timing decision in its own hook, so
 * this stays a plain, easily-testable controlled input rather than baking
 * in a specific delay every future consumer would inherit whether it wants
 * it or not).
 */
export function SearchBar({ label, value, onChange, placeholder }: SearchBarProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <label className="titan-search-bar">
      <span className="titan-search-bar__label">{label}</span>
      <input
        type="search"
        className="titan-search-bar__input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </label>
  );
}
