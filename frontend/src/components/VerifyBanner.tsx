import { useEffect, useState } from "react";
import { fetchMe, resendVerification, type Me } from "../lib/auth-extra-api";
import { ApiError } from "../lib/api-client";

const CACHE_KEY = "me-cache";

// The last known answer is shown instantly on refresh, so the banner never pops in and pushes the page down.
function cachedMe(): Me | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Me) : null;
  } catch {
    return null;
  }
}

export function VerifyBanner() {
  const [me, setMe] = useState<Me | null>(cachedMe);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () =>
      fetchMe()
        .then((m) => {
          setMe(m);
          localStorage.setItem(CACHE_KEY, JSON.stringify(m));
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!me || me.emailVerified) return null;

  async function handleResend() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await resendVerification();
      setMessage(res.message);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not send the email");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verify-banner">
      <span>Confirm your email ({me.email}) to start trading. We sent you a link.</span>
      <button onClick={handleResend} disabled={busy}>
        {busy ? "Sending..." : "Resend email"}
      </button>
      {message && <span>{message}</span>}
    </div>
  );
}
