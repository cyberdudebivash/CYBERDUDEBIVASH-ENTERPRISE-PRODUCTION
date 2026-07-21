import "./Pagination.css";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** `nav` + real `<button>`s, not `<a href="#">`s — this never navigates,
 * it re-fetches the current view, so a real button is the correct role. */
export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const canGoBack = page > 1;
  const canGoForward = page < pageCount;

  if (total === 0) return null;

  return (
    <nav className="titan-pagination" aria-label="Pagination">
      <button
        type="button"
        className="titan-pagination__button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoBack}
      >
        Previous
      </button>
      <span className="titan-pagination__status">
        Page {page} of {pageCount} · {total} total
      </span>
      <button
        type="button"
        className="titan-pagination__button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoForward}
      >
        Next
      </button>
    </nav>
  );
}
