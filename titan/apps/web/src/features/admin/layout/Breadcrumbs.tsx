import { Link, useLocation } from "react-router-dom";
import "./Breadcrumbs.css";

/**
 * Derived from the route path, not hand-maintained per page — a page adds
 * itself to the breadcrumb trail simply by existing at a real nested path
 * under /admin (e.g. /admin/leads/:id), the same "data-driven, not
 * hardcoded" principle Sidebar's own items already follow. Segment labels
 * are title-cased from the URL segment; a future module with a label that
 * doesn't read well title-cased (an id, a slug) can override via a route
 * naming convention when that's a real need, not before.
 */
export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null;

  let hrefSoFar = "";
  const crumbs = segments.map((segment, index) => {
    hrefSoFar += `/${segment}`;
    return {
      label: segment
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
