import "server-only";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendWelcome({ to, position, shareUrl, leaveUrl }: { to: string; position: number; shareUrl: string; leaveUrl: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f8;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:16px">
<tr><td style="padding:32px">
<p style="margin:0 0 20px;font-weight:600;font-size:15px">Scout</p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-0.02em">You&rsquo;re #${position} on the waitlist.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#52525b">Thanks for your interest in Scout, the job-hunt copilot that ranks fresh postings against your resume every morning. It&rsquo;s in private beta; we&rsquo;ll write when there&rsquo;s a spot for you.</p>
<p style="margin:0 0 8px;font-size:14px;color:#52525b">Each friend who joins with your link moves you up:</p>
<p style="margin:0 0 28px;font-size:14px"><a href="${esc(shareUrl)}" style="color:#4f46e5;word-break:break-all">${esc(shareUrl)}</a></p>
<p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa">We store these details only to contact you about Scout. <a href="${esc(leaveUrl)}" style="color:#71717a">Delete my details</a>.</p>
</td></tr></table></td></tr></table></body></html>`;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `You're #${position} on the Scout waitlist`, html }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("waitlist email failed", e);
  }
}
