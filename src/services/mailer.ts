import nodemailer from 'nodemailer';

type Transporter = ReturnType<typeof nodemailer.createTransport>;

let transporter: Transporter | null = null;

// Initialize or retrieve the active mail transporter
export async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    console.log(`[Email Service] Initializing production SMTP transporter via ${host}:${port}`);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return transporter;
  }

  // If RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    console.log('[Email Service] Initializing Resend SMTP transporter');
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
    return transporter;
  }

  // Fallback: Create dynamic Ethereal test account for automated delivery
  try {
    console.log('[Email Service] No production SMTP credentials found in env. Creating dynamic test account...');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Email Service] Dynamic test mailer active (Ethereal inbox: ${testAccount.user})`);
    return transporter;
  } catch (err) {
    console.warn('[Email Service] Failed to create test account, using JSON transport fallback:', err);
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return transporter;
  }
}

interface SendRecoveryEmailOptions {
  toEmail: string;
  code: string;
  recipientName?: string;
  isDeveloper?: boolean;
}

export async function sendPasswordRecoveryEmail({
  toEmail,
  code,
  recipientName,
  isDeveloper = false,
}: SendRecoveryEmailOptions): Promise<{ success: boolean; previewUrl?: string; error?: string }> {
  try {
    const mailer = await getTransporter();
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || '"Hospital e-Manager Security" <no-reply@hospital-emanager.health>';
    const portalTitle = isDeveloper ? 'Developer & Server Operations Console' : 'Hospital e-Manager Clinical Workstation';
    const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Recovery Verification Code</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #334155; }
          .container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.15); }
          .header { background: linear-gradient(135deg, #042f2e 0%, #0f172a 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; font-size: 12px; color: #5eead4; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
          .content { padding: 32px 28px; }
          .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
          .message { font-size: 13px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .code-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
          .code-label { font-size: 11px; text-transform: uppercase; color: #0f766e; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 8px; }
          .code-value { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #115e59; font-family: monospace; }
          .expiry { font-size: 12px; color: #64748b; margin-top: 8px; }
          .warning { background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #9a3412; margin: 24px 0; }
          .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Hospital e-Manager</h1>
            <p>${portalTitle}</p>
          </div>
          <div class="content">
            <div class="greeting">${greeting}</div>
            <p class="message">
              We received a request to reset your password for your account linked to <strong>${toEmail}</strong>.
              Please use the verification code below to authorize your password change.
            </p>
            <div class="code-box">
              <div class="code-label">One-Time Verification Code</div>
              <div class="code-value">${code}</div>
              <div class="expiry">Expires in 15 minutes</div>
            </div>
            <div class="warning">
              <strong>Security Notice:</strong> Never share this code with anyone. Hospital administrators and technical staff will never ask for your verification code.
            </div>
            <p class="message" style="font-size: 12px; color: #64748b;">
              If you did not initiate this request, you can safely disregard this email. Your current password will remain unchanged.
            </p>
          </div>
          <div class="footer">
            © 2026 Hospital e-Manager Platform · Automated System Security Dispatch
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hospital e-Manager - ${portalTitle}

${greeting}

We received a request to reset your password for ${toEmail}.
Your one-time verification code is: ${code}

This code will expire in 15 minutes.

Security Notice: Never share this code with anyone.
If you did not request this password reset, please ignore this email.
    `.trim();

    const info = await mailer.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[Hospital e-Manager] Your Password Reset Code: ${code}`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`[Email Service] ✅ Password recovery email successfully dispatched to ${toEmail}. MessageId: ${info.messageId}`);
    
    // Check if test message URL is available
    const previewUrl = nodemailer.getTestMessageUrl(info as any) || undefined;
    if (previewUrl) {
      console.log(`[Email Service] 🔗 Preview dispatched email at: ${previewUrl}`);
    }

    return { success: true, previewUrl };
  } catch (err: any) {
    console.error(`[Email Service] ❌ Failed to dispatch email to ${toEmail}:`, err);
    return { success: false, error: err.message || 'Failed to dispatch email' };
  }
}