// Deliberately not a "dashboard" with placeholder widgets/charts — nothing
// backs those yet (no auth, no database, no assessments). A honest
// foundation-phase landing state instead of a fabricated one.

export function Home() {
  return (
    <main id="main-content">
      <h1>Titan platform foundation</h1>
      <p>
        This is the application shell — layout, routing, navigation, and error handling. Business
        features (assessments, reports, admin tools) are built in later phases on top of this
        foundation once the authentication and database decisions are made.
      </p>
    </main>
  );
}
