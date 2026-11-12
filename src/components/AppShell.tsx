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
  const user = preview ? null : await getCurrentUser();
  const name = user?.displayName || user?.email || "Your workspace";
  const initials = user?.displayName
    ? user.displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => Array.from(part)[0])
        .join("")
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "JT";
  const home = preview ? "/preview" : "/";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="workbench-header">
        <Link href={home} className="brand" aria-label="Job Tracker home">
          <BrandMark />
          <span>job tracker</span>
        </Link>
        <nav className="workspace-nav" aria-label="Workspace">
          <Link href={home} className="nav-item">
            Applications
          </Link>
          <details className="extension-guide">
            <summary>
              <Icon name="browser" />
              Capture from Browser
            </summary>
            <div>
              <strong>Keep a posting with one capture.</strong>
              <p>
                Open your browser’s Extensions page, enable Developer mode, and
                load the extension folder.
              </p>
              <p>
                Open Connection settings, enter your tracker URL, and continue
                with the same Google account you use here. Capture a posting,
                review the details, then save.
              </p>
            </div>
          </details>
        </nav>
        <div className="workspace-account">
          <span className="account-avatar" title={name} aria-label={name}>
            {initials}
          </span>
          {preview ? (
            <Link href="/login" className="button button-quiet account-action">
              Open login
            </Link>
          ) : (
            <form action="/api/logout" method="post">
              <button
                className="button button-quiet account-action"
                type="submit"
                aria-label="Log out"
              >
                <span>Sign out</span>
                <Icon name="logout" />
              </button>
            </form>
          )}
        </div>
      </header>
      <div className="workspace">{children}</div>
    </div>
  );
}
