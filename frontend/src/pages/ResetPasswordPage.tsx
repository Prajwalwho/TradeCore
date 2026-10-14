import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../lib/auth-extra-api";
import { ApiError } from "../lib/api-client";
import "../auth.css";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This link is missing its token");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset the password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h1>Choose a new password</h1>
        {error && <p className="error">{error}</p>}
        {done ? (
          <p>
            Your password was updated. <Link to="/login">Log in</Link>
          </p>
        ) : (
          <>
            <label>
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <label>
              Repeat new password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                maxLength={72}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save password"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}