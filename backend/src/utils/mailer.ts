
export type Email = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? "TradeCore";

  if (!apiKey || !senderEmail) {
    throw new Error("Missing Brevo email configuration in backend/.env");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: email.to }],
      subject: email.subject,
      textContent: email.text,
    }),
  });

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(
      `Brevo email failed (${response.status}): ${errorDetails}`,
    );
  }

  console.log(`[email] "${email.subject}" accepted by Brevo for ${email.to}`);
}
