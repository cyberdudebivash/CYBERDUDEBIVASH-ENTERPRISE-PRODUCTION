import "./FilterPanel.css";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  id: string;
  label: string;
  options: FilterOption[];
  /** The field's current value, or "" for "no filter applied". */
  value: string;
}

export interface FilterPanelProps {
  fields: FilterField[];
  onChange: (fieldId: string, value: string) => void;
}

/**
 * A row of labeled `<select>` filters, generic over whatever fields the
 * caller configures — EAP-2's Lead Workspace passes status/priority/
 * assignedTo, but nothing here knows those specific domains (matching
 * @titan/design-system's leaf-package rule, ARCHITECTURE.md: this package
 * depends on nothing else under titan/, so it can't import LeadStatus et
 * al. directly — the domain mapping lives in the feature that uses this).
 * Real `<select>`s, not a custom listbox — full keyboard/screen-reader
 * support for free, and a filter bar is not a place novel interaction
 * patterns pay for themselves.
 */
export function FilterPanel({ fields, onChange }: FilterPanelProps) {
  return (
    <div className="titan-filter-panel">
      {fields.map((field) => (
        <label key={field.id} className="titan-filter-panel__field">
          <span className="titan-filter-panel__label">{field.label}</span>
          <select
            className="titan-filter-panel__select"
            value={field.value}
            onChange={(event) => onChange(field.id, event.target.value)}
          >
            <option value="">All</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
