import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="standalone-state">
      <h1>
        This page moved on<span className="heading-dot">.</span>
      </h1>
      <p>
        The application may have been deleted, or this link may be incorrect.
      </p>
      <Link className="button button-primary" href="/">
        Back to applications
      </Link>
    </main>
  );
}
