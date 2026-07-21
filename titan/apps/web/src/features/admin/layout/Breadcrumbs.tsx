import { Link, useLocation } from "react-router-dom";
import "./Breadcrumbs.css";

// A route param value (EAP-2's /admin/leads/:id) rather than a real path
// word — title-casing a UUID's hex/hyphen chunks produces unreadable
// nonsense ("9ad1b513 2189 44da..."). Detected structurally (looks like an
// opaque id: a UUID, or a long hex/alphanumeric token), not via a
// route-specific allowlist, so the next module's own :id segment (Phase 3+)
// is handled the same way without another special case being added here.
const OPAQUE_ID_PATTERN = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$|^[0-9a-zA-Z_-]{16,}$/i;

/**
 * Derived from the route path, not hand-maintained per page — a page adds
 * itself to the breadcrumb trail simply by existing at a real nested path
 * under /admin (e.g. /admin/leads/:id), the same "data-driven, not
 * hardcoded" principle Sidebar's own items already follow. Segment labels
 * are title-cased from the URL segment, except an opaque id segment
 * (above), which reads as "Details" instead — honest (it doesn't fabricate
 * the record's real name, which this component has no access to) rather
 * than either garbled or silently wrong.
 */
export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  let hrefSoFar = "";
  const crumbs = segments.map((segment, index) => {
    hrefSoFar += `/${segment}`;
    return {
      label: OPAQUE_ID_PATTERN.test(segment)
        ? "Details"
        : segment
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
      href: hrefSoFar,
      isCurrent: index === segments.length - 1,
    };
  });

  return (
    <nav className="titan-breadcrumbs" aria-label="Breadcrumb">
      <ol className="titan-breadcrumbs__list">
        {crumbs.map((crumb) => (
          <li key={crumb.href} className="titan-breadcrumbs__item">
            {crumb.isCurrent ? (
              <span aria-current="page">{crumb.label}</span>
            ) : (
              <Link to={crumb.href}>{crumb.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
