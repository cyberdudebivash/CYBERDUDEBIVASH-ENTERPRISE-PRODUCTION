import { NavLink } from "react-router-dom";

export interface SidebarItem {
  label: string;
  to: string;
}

export interface SidebarProps {
  items: SidebarItem[];
}

/**
 * Deliberately data-driven, not hardcoded to specific routes: later phases
 * add real destinations (Assessments, Reports, Admin, ...) by passing them
 * in, not by editing this component. App.tsx now passes more than one real
 * item (EAP-2 added Leads alongside Dashboard) — padding this list with
 * disabled "coming soon" links for features that don't exist yet would
 * still misrepresent progress, but real sibling items are exactly what
 * this was built data-driven for.
 */
export function Sidebar({ items }: SidebarProps) {
  return (
    <nav className="titan-sidebar" aria-label="Main">
      <ul className="titan-sidebar__list">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                isActive ? "titan-sidebar__link titan-sidebar__link--active" : "titan-sidebar__link"
              }
              // Without `end`, NavLink matches any path *starting with*
              // `to` — harmless for a leaf route, but "/admin" (Dashboard)
              // is also a prefix of "/admin/leads"/"/admin/leads/:id"
              // (EAP-2), which would show Dashboard as active while
              // viewing Leads. Real bug this sidebar's first-ever sibling
              // item exposed, not a hypothetical one.
              end={item.to === "/" || item.to === "/admin"}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
