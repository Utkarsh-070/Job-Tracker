import Link from "next/link";
import { BrandMark, Icon } from "@/components/ui/Icon";
import { GoogleSignIn } from "./GoogleSignIn";
import { getCurrentUserId } from "@/lib/auth";
import { redirect } from "next/navigation";
export const metadata = { title: "Welcome back" };
export default async function LoginPage() {
  if (await getCurrentUserId()) redirect("/");
  return (
    <div className="login-page">
      <header className="login-header">
        <Link href="/login" className="brand">
          <BrandMark />
          <span>
            job tracker<span className="brand-period">.</span>
          </span>
        </Link>
        <span>A workspace for what comes next.</span>
      </header>
      <main id="main-content" className="login-content">
        <div className="login-editorial">
          <h1>
            The search is a journey.
            <br />
            <span>Give it a little direction.</span>
          </h1>
          <p>
            Keep your possibilities in one place. The roles you’ve saved, the
            applications you’ve sent, and the conversations that come next.
          </p>
          <div className="login-stage-line">
            <span>Saved</span>
            <Icon name="arrow" />
            <span>Applied</span>
            <Icon name="arrow" />
            <span>What’s next</span>
          </div>
        </div>
        <section className="login-form-section">
          <h2>
            Make room for what’s next<span className="heading-dot">.</span>
          </h2>
          <p>Open your personal application workspace.</p>
          <GoogleSignIn />
          {process.env.NODE_ENV === "development" && (
            <Link className="preview-link" href="/preview">
              Explore the design with sample data <Icon name="arrow" />
            </Link>
          )}
        </section>
      </main>
      <footer className="login-footer">
        <span>A little clarity. A lot of possibility.</span>
        <span>Job Tracker</span>
      </footer>
    </div>
  );
}
