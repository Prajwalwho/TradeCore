export type Email = { to: string; subject: string; text: string };

// Development mailer: prints the email in the backend terminal instead of sending it.
// Before going public, replace the body of this function with a real email provider.
export async function sendEmail(email: Email): Promise<void> {
  console.log("\n========== EMAIL (development: not actually sent) ==========");
  console.log(`To: ${email.to}`);
  console.log(`Subject: ${email.subject}`);
  console.log(email.text);
  console.log("============================================================\n");
}