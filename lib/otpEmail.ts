export function otpEmailTemplate(code: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SecureMail Access Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #020617; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; width: 100%; background-color: #0f172a; border-radius: 24px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <div style="display: inline-block; padding: 12px; background-color: rgba(14, 165, 233, 0.1); border-radius: 12px; margin-bottom: 24px;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.025em; text-transform: uppercase;">SecureMail</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <p style="color: #94a3b8; font-size: 16px; line-height: 24px; margin: 0 0 32px 0;">
                Your request for access has been received. Please use the following one-time code to complete your secure login.
              </p>
              
              <div style="background-color: #1e293b; border-radius: 16px; padding: 24px; border: 1px solid #334155;">
                <div style="color: #38bdf8; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 48px; font-weight: 800; letter-spacing: 0.25em; margin: 0; line-height: 1;">
                  ${code}
                </div>
              </div>
              
              <p style="color: #64748b; font-size: 14px; margin: 32px 0 0 0; line-height: 20px;">
                This code will expire in 10 minutes.<br>
                If you did not request this code, please ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 40px; background-color: #111827; border-top: 1px solid #1e293b;">
              <p style="color: #475569; font-size: 12px; margin: 0; font-weight: 500;">
                &copy; ${new Date().getFullYear()} SecureMail. Zero-Knowledge Encryption.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
