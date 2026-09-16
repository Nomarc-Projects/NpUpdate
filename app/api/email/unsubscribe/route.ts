import { NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";
import { suppressEmailForUser } from "@/lib/services/campaigns";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe. Unauthenticated by necessity: the recipient clicks
 * straight from their inbox, and someone who has stopped wanting our email is
 * exactly the person least willing (or able) to sign in first.
 *
 * Safety comes from the signed token rather than a session, so `u` alone is not
 * enough to opt somebody else out.
 *
 * Renders a plain HTML confirmation rather than redirecting into the app: the
 * recipient may have no account session, and bouncing them to a login wall after
 * they asked to leave is the wrong answer.
 */
function page(title: string, message: string, ok: boolean): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#f1f1f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:12vh auto;padding:36px 32px;background:#fff;border-radius:18px;box-shadow:0 8px 30px rgba(0,0,0,0.06);text-align:center;">
    <div style="height:4px;width:56px;margin:0 auto 22px;background:${ok ? "#ffd716" : "#e3e3e3"};border-radius:4px;"></div>
    <h1 style="margin:0 0 10px;font-size:21px;font-weight:800;color:#1e1e1e;">${title}</h1>
    <p style="margin:0;color:#6b6b6b;font-size:14.5px;line-height:1.7;">${message}</p>
  </div>
</body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  // "Send Test Email" links here so an admin can see the footer link work
  // without the test unsubscribing the admin's own address.
  if (params.get("preview") === "1") {
    return page(
      "This is a preview",
      "On a real send this link opts the recipient out of future announcements. Nothing was changed.",
      true,
    );
  }

  const userId = params.get("u");
  const token = params.get("t");

  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return page(
      "That link is not valid",
      "This unsubscribe link is incomplete or has been altered. Please use the link at the bottom of the original email, or reply to it and we will take care of it.",
      false,
    );
  }

  try {
    const email = await suppressEmailForUser(userId);
    return page(
      "You have been unsubscribed",
      email
        ? `${email} will no longer receive announcements from Nomarc Projects. Account emails such as password resets and sign-in codes will still reach you, because those keep your account working.`
        : "You will no longer receive announcements from Nomarc Projects.",
      true,
    );
  } catch {
    return page(
      "Something went wrong",
      "We could not record that just now. Please try the link again in a moment, or reply to the email and we will remove you by hand.",
      false,
    );
  }
}
