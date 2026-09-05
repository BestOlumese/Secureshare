import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { emailOTP, username } from "better-auth/plugins";
import { transporter } from "./mailer";
import { otpEmailTemplate } from "./otpEmail";
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          prisma.user
            .findUnique({
              where: { id: session.userId },
              select: { email: true, name: true, orgId: true },
            })
            .then((user) => {
              if (!user) return;

              // Record the sign-in for the audit trail. Scoped to the user's org
              // so admins can see it. Fire-and-forget: a logging failure must
              // never block the session from being created.
              prisma.auditLog
                .create({
                  data: {
                    userId: session.userId,
                    actionType: "LOGIN",
                    initiatorOrgId: user.orgId,
                    ipAddress: session.ipAddress || "unknown",
                    metadata: { userAgent: session.userAgent || null },
                  },
                })
                .catch((err) => console.error("[audit] Failed to log LOGIN:", err));

              const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
              transporter.sendMail({
                from: `"SecureShare" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: "New sign-in to SecureShare",
                html: `
                  <div style="font-family:sans-serif;padding:40px;background:#f8fafc;">
                    <div style="max-width:520px;margin:0 auto;background:white;padding:36px;border-radius:20px;border:1px solid #e2e8f0;">
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
                        <div style="background:#2563eb;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                          <span style="color:white;font-size:16px;font-weight:900;">S</span>
                        </div>
                        <span style="font-size:15px;font-weight:800;color:#1e293b;">SecureShare</span>
                      </div>
                      <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px;">New sign-in</h2>
                      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
                        Someone just signed in to your account${session.ipAddress ? ` from ${session.ipAddress}` : ""}.
                      </p>
                      <p style="color:#94a3b8;font-size:12px;margin:0 0 24px;">Was it you? Nothing to do. If not, sign that device out below.</p>
                      <a href="${appUrl}/profile" style="display:inline-block;background:#2563eb;color:white;padding:11px 24px;text-decoration:none;border-radius:11px;font-weight:700;font-size:13px;">
                        Check your sessions
                      </a>
                    </div>
                  </div>
                `,
              }).catch((err) => console.error("[mailer] Login notification failed:", err));
            })
            .catch(() => {});
        },
      },
    },
  },
  user: {
    additionalFields: {
      onboarded: {
        type: "boolean",
        defaultValue: false,
        required: false,
      },
      displayUsername: {
        type: "string",
        required: false,
      },
      role: {
        type: "string",
        defaultValue: "USER",
        required: false,
      },
      orgId: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [
    username(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") {
          await transporter.sendMail({
            from: `"SecureShare" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Your login otp code",
            html: otpEmailTemplate(otp),
          });
        }
      },
    }),
  ],
});
