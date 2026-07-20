// No user/session UI here yet — Workstream 4 (Authentication) is a later
// phase. Rendering a fake avatar or org name now would be exactly the kind
// of "fake integration" this phase's own rules prohibit.

export function Header() {
  return (
    <header className="titan-header">
      <span className="titan-header__brand">Titan</span>
    </header>
  );
}
