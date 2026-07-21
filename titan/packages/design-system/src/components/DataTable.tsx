import type { ReactNode } from "react";
import "./DataTable.css";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  caption?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  /** Reports which column header was activated — direction-toggling policy
   * (first click = descending? ascending?) belongs to whatever owns the
   * sort state (EAP-2's useLeadSearch), not this component, so the same
   * table stays reusable by a future list with different defaults. */
  onSortChange?: (columnId: string) => void;
}

/**
 * A real `<table>` (`<caption>`/`<thead>`/`<tbody>`, real `<th scope="col">`
 * headers), not a div-grid — screen readers and browsers already know how
 * to navigate a table by row/column for free. Sortable headers use the
 * standard `aria-sort` pattern (on the `<th>` itself) plus a real `<button>`
 * inside it, so both mouse and keyboard users can trigger a re-sort.
 * Deliberately renders every row it's given, no virtualization: no
 * evidence in this codebase of a real data volume that needs it yet
 * (DECISION_LOG.md's EAP-2 entry) — the "if justified" the brief asked for.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  sortBy,
  sortDirection,
  onSortChange,
}: DataTableProps<T>) {
  return (
    <div className="titan-data-table__scroll">
      <table className="titan-data-table">
        {caption && <caption className="titan-data-table__caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sortBy === column.id;
              const ariaSort = column.sortable
                ? isSorted
                  ? sortDirection === "asc"
                    ? "ascending"
                    : "descending"
                  : "none"
                : undefined;

              return (
                <th
                  key={column.id}
                  scope="col"
                  aria-sort={ariaSort}
                  className={`titan-data-table__th titan-data-table__th--${column.align ?? "left"}`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="titan-data-table__sort-button"
                      onClick={() => onSortChange?.(column.id)}
                    >
                      {column.header}
                      <span aria-hidden="true" className="titan-data-table__sort-icon">
                        {isSorted ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="titan-data-table__row">
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`titan-data-table__td titan-data-table__td--${column.align ?? "left"}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
