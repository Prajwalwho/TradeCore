import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../lib/auth-extra-api";
import { ApiError } from "../lib/api-client";
import "../auth.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Forgot password</h1>
        {error && <p className="error">{error}</p>}
        {sent ? (
          <p>If that email is registered, we sent a link to reset your password. It works for 1 hour.</p>
        ) : (
          <>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </>
        )}
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      </form>
    </div>
  );
}