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
 * in, not by editing this component. Right now App.tsx passes exactly one
 * real item — padding this list with disabled "coming soon" links for
 * features that don't exist yet would misrepresent progress.
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
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
