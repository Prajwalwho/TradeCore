import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api-client";
import { AuthLayout } from "../components/AuthLayout";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Log in" subtitle="Welcome back. Pick up where you left off.">
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <p className="error">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
        <p>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p>
          New here? <Link to="/register">Create a free account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
