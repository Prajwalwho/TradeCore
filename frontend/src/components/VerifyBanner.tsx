import { useEffect, useState } from "react";
import { fetchMe, resendVerification, type Me } from "../lib/auth-extra-api";
import { ApiError } from "../lib/api-client";

export function VerifyBanner() {
  const [me, setMe] = useState<Me | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () => fetchMe().then(setMe).catch(() => {});
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
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
        padding: "0.6rem 1rem",
        background: "#422006",
        color: "#fde68a",
        fontSize: "0.9rem",
        borderBottom: "1px solid #713f12",
      }}
    >
      <span>Verify your email ({me.email}) to start trading. Check your inbox for the link.</span>
      <button
        onClick={handleResend}
        disabled={busy}
        style={{
          padding: "0.25rem 0.75rem",
          background: "transparent",
          color: "#fde68a",
          border: "1px solid #fde68a",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        {busy ? "..." : "Resend email"}
      </button>
      {message && <span>{message}</span>}
    </div>
  );
}