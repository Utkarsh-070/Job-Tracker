import Link from "next/link";
import { BrandMark, Icon } from "./ui/Icon";
import { getCurrentUser } from "@/lib/auth";
export async function AppShell({
  children,
  preview = false,
}: {
  children: React.ReactNode;
  preview?: boolean;
}) {
  const homeHref = preview ? "/preview" : "/";
  const newApplicationHref = preview
    ? "/preview?view=new"
    : "/applications/new";
  const user = preview ? null : await getCurrentUser();
  const displayName = user?.displayName || user?.email || "Personal workspace";
  const initials = user?.displayName
    ? user.displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => Array.from(part)[0])
        .join("")
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "JT";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link href={homeHref} className="brand" aria-label="Job Tracker home">
          <BrandMark />
          <span>
            job tracker<span className="brand-period">.</span>
          </span>
        </Link>
        <nav aria-label="Workspace" className="workspace-nav">
          <Link href={homeHref} className="nav-item">
            <Icon name="list" />
            Applications
            <Icon name="arrow" className="nav-arrow" />
          </Link>
          <Link href={newApplicationHref} className="nav-item nav-secondary">
            <Icon name="plus" />
            Add application
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <details className="extension-guide">
            <summary>
              <Icon name="browser" />
              <span>Capture from Browser</span>
              <Icon name="plus" />
            </summary>
            <div>
              <p>
                Open Browser’s Extensions page, enable Developer mode, and load
                the extension folder.
              </p>
              <p>
                In the popup’s Settings, enter this app’s URL and continue with
                Google. Use the same account as this workspace. Capture a
                posting, review it, then save.
              </p>
            </div>
          </details>
          <div className="workspace-account">
            <span className="account-avatar" aria-hidden="true">
              {initials}
            </span>
            <div>
              <strong title={displayName}>{displayName}</strong>
              <span>
                {preview
                  ? "Sample data preview"
                  : user?.email || "Your application ledger"}
              </span>
            </div>
            {preview ? (
              <Link
                href="/login"
                className="icon-button"
                aria-label="Open login"
              >
                <Icon name="logout" />
              </Link>
            ) : (
              <form action="/api/logout" method="post">
                <button
                  className="icon-button"
                  aria-label="Log out"
                  type="submit"
                >
                  <Icon name="logout" />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span>Your job search, thoughtfully organized.</span>
          <span className="header-note">One opportunity at a time.</span>
          {!preview && (
            <form className="mobile-logout" action="/api/logout" method="post">
              <button className="button button-quiet" type="submit">
                Log out <Icon name="logout" />
              </button>
            </form>
          )}
        </header>
        {preview && (
          <div className="preview-banner">
            <strong>Design preview</strong>
            <span>
              These are synthetic records. Nothing here writes to your database.
            </span>
            <Link href="/login">
              Open login <Icon name="arrow" />
            </Link>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
