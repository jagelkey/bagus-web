import { Resend } from "resend";

export async function sendEmail(input: { to: string; subject: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Member Billing <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      ok: false,
      error: "RESEND_API_KEY belum dikonfigurasi.",
    };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, error: null };
}
