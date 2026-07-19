import type { ViewType } from "../../types/app";

interface MobileNavProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const MOBILE_NAV_ITEMS: { label: string; view: ViewType }[] = [
  { label: "Gateway", view: "home" },
  { label: "Sentinel APEX", view: "intel" },
  { label: "AI Audit", view: "ai" },
  { label: "ThreatCore Tools", view: "tools" },
  { label: "Blog", view: "blog" },
  { label: "API", view: "api" },
];

// Extracted verbatim from App.tsx. Same 6 items, same className pattern
// (collapsed the per-button template literal into one shared expression,
// as in Header.tsx's navButtonClass — byte-identical output per button).
export function MobileNav({ currentView, onNavigate }: MobileNavProps) {
  return (
    <nav aria-label="Mobile navigation" className="lg:hidden bg-slate-950 border-b border-slate-900 p-2 flex justify-between overflow-x-auto gap-1">
      {MOBILE_NAV_ITEMS.map(item => (
        <button
          key={item.view}
          onClick={() => onNavigate(item.view)}
          aria-current={currentView === item.view ? "page" : undefined}
          className={`px-3 py-1 rounded text-xs shrink-0 font-bold ${currentView === item.view ? "bg-cyan-500 text-black" : "text-slate-400"}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
