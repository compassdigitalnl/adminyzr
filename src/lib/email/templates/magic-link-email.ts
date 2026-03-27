export type MagicLinkEmailData = {
  magicLinkUrl: string
  expiresInMinutes: number
}

export function magicLinkEmailHtml(data: MagicLinkEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #2563EB; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; margin-bottom: 16px; }
    .btn { display: inline-block; background: #2563EB; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; margin: 20px 0; }
    .note { font-size: 13px; color: #888; margin-top: 24px; line-height: 1.6; }
    .footer { padding: 20px 32px; background: #f8f9fa; border-top: 1px solid #e5e5e5; text-align: center; font-size: 12px; color: #999; }
    .url-fallback { font-size: 12px; color: #666; word-break: break-all; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Adminyzr</h1>
    </div>
    <div class="content">
      <p class="greeting">Hallo,</p>
      <p>Klik op de onderstaande knop om in te loggen bij Adminyzr. Deze link is ${data.expiresInMinutes} minuten geldig.</p>

      <p style="text-align: center;">
        <a href="${data.magicLinkUrl}" class="btn">Inloggen</a>
      </p>

      <p class="url-fallback">
        Werkt de knop niet? Kopieer en plak deze link in je browser:<br>
        ${data.magicLinkUrl}
      </p>

      <p class="note">
        Als je deze e-mail niet hebt aangevraagd, kun je hem veilig negeren.
      </p>
    </div>
    <div class="footer">
      <p>Adminyzr &mdash; Business Operations Platform</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export function magicLinkEmailText(data: MagicLinkEmailData): string {
  return `
Hallo,

Klik op de onderstaande link om in te loggen bij Adminyzr.
Deze link is ${data.expiresInMinutes} minuten geldig.

${data.magicLinkUrl}

Als je deze e-mail niet hebt aangevraagd, kun je hem veilig negeren.

Adminyzr — Business Operations Platform
  `.trim()
}
