export interface HeaderSession {
  /** May be null/undefined — Auth.js's Email provider doesn't guarantee a
   * verified email is always present on `session.user`, and this is real
   * data from a real session, not something to paper over with a fallback
   * string. */
  email: string | null | undefined;
  signOutHref: string;
}

export interface HeaderProps {
  /** EAP-1: omitted entirely (not just falsy) for the public shell — the
   * Home page's own `<Header />` renders exactly as before. Only the admin
   * shell (a real session, real Auth.js sign-out link) passes this. */
  session?: HeaderSession;
}

export function Header({ session }: HeaderProps) {
  return (
    <header className="titan-header">
      <span className="titan-header__brand">Titan</span>
      {session && (
        <div className="titan-header__session">
          {session.email && <span className="titan-header__email">{session.email}</span>}
          <a className="titan-header__signout" href={session.signOutHref}>
            Sign out
          </a>
        </div>
      )}
    </header>
  );
}
