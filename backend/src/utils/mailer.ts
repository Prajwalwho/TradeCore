import "dotenv/config";

export type Email = {
  to: string;
  subject: string;
  text: string;
};

// Sends through Brevo when it is configured. Otherwise it prints the email in the terminal, so demos work
// without any email account. It never throws: a failed email must not break registration or password reset.
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? process.env.MAIL_FROM_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? process.env.MAIL_FROM_NAME ?? "TradeCore";

  // The test suite creates dozens of fake users. Mail to fake addresses bounces, and enough
  // bounces can get a sender restricted, so tests must never send anything.
  if (process.env.DB_NAME === "paper_trading_test") {
    console.log(`[email] (test run, not sent) "${email.subject}" for ${email.to}`);
    return;
  }

  if (!apiKey || !senderEmail || apiKey.startsWith("paste-")) {
    console.log("\n========== EMAIL (email is not configured, so this was only printed) ==========");
    console.log(`To: ${email.to}`);
    console.log(`Subject: ${email.subject}`);
    console.log(email.text);
    console.log("===============================================================================\n");
    return;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: email.to }],
        subject: email.subject,
        textContent: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      console.error(`[email] Brevo rejected "${email.subject}" (${response.status}): ${details.slice(0, 300)}`);
      return;
    }

    console.log(`[email] "${email.subject}" accepted by Brevo for ${email.to}`);
  } catch (err) {
    console.error("[email] could not send email", err);
  }
}
