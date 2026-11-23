/**
 * Reusable branded email layout (password reset, email verification, future welcome…).
 *
 * Built for real email clients: table layout, inline CSS, web-safe fonts, ≤600px,
 * no scripts, no web fonts, one small PNG logo on our own domain. A tiny <style>
 * block adds mobile + dark-mode tweaks for clients that support it; everything
 * still reads correctly where it is stripped (e.g. Gmail app inverts colours itself).
 * Always paired with a plain-text part — see `renderEmail`.
 */

export type EmailContent = {
  /** Inbox preview line (hidden in the body). */
  preheader: string;
  heading: string;
  /** Short paragraphs of plain text (escaped). */
  paragraphs: string[];
  button: { label: string; url: string };
  /** Small print under the button, e.g. expiry + "ignore if not you". */
  notes: string[];
};

export type EmailBrand = {
  name: string;
  siteUrl: string;
  logoUrl: string;
  supportEmail: string | null;
};

export type RenderedEmail = { html: string; text: string };

const NAVY = '#0a2350';
const NAVY_DEEP = '#061634';
const RED = '#e31e24';
const INK = '#0f172a';
const MUTED = '#475569';
const LINE = '#e2e8f0';
const PAGE = '#f1f5f9';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function siteHost(siteUrl: string): string {
  try {
    return new URL(siteUrl).host;
  } catch {
    return siteUrl;
  }
}

function renderHtml(content: EmailContent, brand: EmailBrand): string {
  const url = escapeHtml(content.button.url);
  const site = escapeHtml(brand.siteUrl);
  const host = escapeHtml(siteHost(brand.siteUrl));
  const support = brand.supportEmail ? escapeHtml(brand.supportEmail) : null;
  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:24px;color:${MUTED};" class="ya-muted">${escapeHtml(p)}</p>`,
    )
    .join('');
  const notes = content.notes
    .map(
      (n) =>
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};" class="ya-muted">${escapeHtml(n)}</p>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(content.heading)}</title>
<style>
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .ya-container { width:100% !important; }
    .ya-pad { padding-left:24px !important; padding-right:24px !important; }
    .ya-heading { font-size:24px !important; line-height:30px !important; }
    .ya-btn a { display:block !important; }
  }
  @media (prefers-color-scheme: dark) {
    .ya-page { background:#0b1120 !important; }
    .ya-card { background:#111a2e !important; border-color:#1f2a44 !important; }
    .ya-ink { color:#f1f5f9 !important; }
    .ya-muted { color:#cbd5e1 !important; }
    .ya-link { color:#ff8a8e !important; }
    .ya-rule { border-color:#1f2a44 !important; }
  }
  [data-ogsc] .ya-ink { color:#f1f5f9 !important; }
  [data-ogsc] .ya-muted { color:#cbd5e1 !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE};" class="ya-page">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(content.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE};" class="ya-page">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="ya-container" style="width:600px;max-width:600px;">
    <tr><td style="background:${NAVY};background-image:linear-gradient(135deg,${NAVY} 0%,${NAVY_DEEP} 100%);border-radius:16px 16px 0 0;padding:24px 40px;" class="ya-pad">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="vertical-align:middle;"><a href="${site}" target="_blank"><img src="${escapeHtml(brand.logoUrl)}" width="60" height="48" alt="${escapeHtml(brand.name)}" style="display:block;border:0;outline:none;width:60px;height:48px;"></a></td>
        <td style="vertical-align:middle;padding-left:14px;font-family:${FONT};font-size:18px;line-height:24px;font-weight:700;color:#ffffff;">${escapeHtml(brand.name)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="height:4px;line-height:4px;font-size:0;background:${RED};">&nbsp;</td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${LINE};border-top:0;border-radius:0 0 16px 16px;padding:36px 40px 32px;" class="ya-card ya-pad">
      <h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;line-height:32px;font-weight:700;color:${INK};" class="ya-heading ya-ink">${escapeHtml(content.heading)}</h1>
      ${paragraphs}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 28px;" class="ya-btn"><tr>
        <td align="center" bgcolor="${RED}" style="border-radius:10px;background:${RED};">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="f" fillcolor="${RED}"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${escapeHtml(content.button.label)}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!--><a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;background:${RED};">${escapeHtml(content.button.label)}</a><!--<![endif]-->
        </td>
      </tr></table>
      <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};" class="ya-muted">Button not working? Copy and paste this link into your browser:</p>
      <p style="margin:0 0 24px;font-family:${FONT};font-size:13px;line-height:20px;word-break:break-all;"><a href="${url}" target="_blank" style="color:${RED};text-decoration:underline;" class="ya-link">${url}</a></p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid ${LINE};padding-top:20px;" class="ya-rule">${notes}</td></tr></table>
    </td></tr>
    <tr><td align="center" style="padding:24px 24px 8px;font-family:${FONT};font-size:12px;line-height:18px;color:#64748b;" class="ya-muted">
      <a href="${site}" target="_blank" style="color:#64748b;font-weight:600;" class="ya-muted">${escapeHtml(brand.name)}</a> &middot; <a href="${site}" target="_blank" style="color:#64748b;" class="ya-muted">${host}</a>${
        support
          ? `<br>Need help? <a href="mailto:${support}" style="color:#64748b;text-decoration:underline;" class="ya-muted">${support}</a>`
          : ''
      }<br>You received this email because of activity on your ${escapeHtml(brand.name)} account.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(content: EmailContent, brand: EmailBrand): string {
  const lines = [
    brand.name,
    '',
    content.heading,
    '',
    ...content.paragraphs.flatMap((p) => [p, '']),
    `${content.button.label}:`,
    content.button.url,
    '',
    ...content.notes,
    '',
    '—',
    `${brand.name} · ${brand.siteUrl}`,
  ];
  if (brand.supportEmail) lines.push(`Need help? ${brand.supportEmail}`);
  return lines.join('\n');
}

export function renderEmail(content: EmailContent, brand: EmailBrand): RenderedEmail {
  return { html: renderHtml(content, brand), text: renderText(content, brand) };
}
