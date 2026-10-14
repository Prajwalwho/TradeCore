import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "../lib/auth-extra-api";
import { ApiError } from "../lib/api-client";
import "../auth.css";

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">(token ? "loading" : "error");
  const [error, setError] = useState<string | null>(token ? null : "This link is missing its token");
  const started = useRef(false); // the link works only once, so never call it twice

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token)
      .then(() => setState("ok"))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not verify your email");
        setState("error");
      });
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-form">
        <h1>Email verification</h1>
        {state === "loading" && <p>Verifying...</p>}
        {state === "ok" && (
          <>
            <p>Your email is verified. You can trade now.</p>
            <p>
              <Link to="/dashboard">Go to the app</Link>
            </p>
          </>
        )}
        {state === "error" && (
          <>
            <p className="error">{error}</p>
            <p>
              Log in and use "Resend email" at the top of the page to get a new link.{" "}
              <Link to="/login">Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}