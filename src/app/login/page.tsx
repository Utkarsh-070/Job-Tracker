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
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="login-header">
        <Link href="/login" className="brand">
          <BrandMark />
          <span>job tracker</span>
        </Link>
      </header>
      <main id="main-content" className="login-content">
        <section className="login-editorial" aria-label="About your tracker">
          <p className="login-intro">A considered place for your next move.</p>
          <h1>
            A little order.
            <br />A clearer next move.
          </h1>
          <p>
            The roles worth considering,
            <br />
            and the details worth keeping.
          </p>
          <div className="login-sample">
            <div className="login-sample-caption">
              <span>Applications</span>
              <span>Sample data</span>
            </div>
            {[
              ["Frontend Engineer", "Linear", "Interviewing"],
              ["Product Engineer", "Notion", "Applied"],
              ["Software Engineering Intern", "Figma", "Applied"],
            ].map(([role, company, status], index) => (
              <div
                className={"login-sample-row" + (!index ? " is-selected" : "")}
                key={company}
              >
                <strong>{role}</strong>
                <div>
                  <span>{company}</span>
                  <span>{status}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="login-private">
            Sample data · Your real search stays private.
          </p>
        </section>
        <section className="login-form-section" aria-labelledby="sign-in-title">
          <h2 id="sign-in-title">
            Your next move,
            <br />
            in one place.
          </h2>
          <p>Continue with your Google account.</p>
          <GoogleSignIn />
          {process.env.NODE_ENV === "development" && (
            <Link className="preview-link" href="/preview">
              Explore with sample data <Icon name="arrow" />
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
