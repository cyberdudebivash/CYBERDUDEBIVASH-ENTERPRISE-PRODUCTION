// Deliberately not a "dashboard" with placeholder widgets/charts — nothing backs
// most of those yet (no auth, no database). A honest foundation-phase landing
// state instead of a fabricated one; the one link below is real, not aspirational.

export function Home() {
  return (
    <main id="main-content">
      <h1>Titan platform foundation</h1>
      <p>
        This is the application shell — layout, routing, navigation, and error handling. Most
        business features (reports, admin tools) are built in later phases on top of this foundation
        once the authentication and database decisions are made.
      </p>
      <p>
        One is real already: the <a href="/assessment/dpdp">DPDP compliance risk scan</a> — Titan
        Module 1, powered by <code>@titan/assessment-core</code>.
      </p>
    </main>
  );
}
