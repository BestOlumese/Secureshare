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
            .findUnique({ where: { id: session.userId }, select: { email: true, name: true } })
            .then((user) => {
              if (!user) return;
              const appUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
              transporter.sendMail({
                from: `"SecureShare" <${process.env.SMTP_USER}>`,
                to: user.email,
                subject: "New sign-in to your SecureShare account",
                html: `
                  <div style="font-family:sans-serif;padding:40px;background:#f8fafc;">
                    <div style="max-width:520px;margin:0 auto;background:white;padding:36px;border-radius:20px;border:1px solid #e2e8f0;">
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
                        <div style="background:#2563eb;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;">
                          <span style="color:white;font-size:16px;font-weight:900;">S</span>
                        </div>
                        <span style="font-size:15px;font-weight:800;color:#1e293b;">SecureShare</span>
                      </div>
                      <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px;">New sign-in detected</h2>
                      <p style="color:#64748b;font-size:14px;margin:0 0 20px;">
                        Hi <strong style="color:#1e293b;">${user.name || user.email}</strong>, a new session was just started on your account.
                      </p>
                      <p style="color:#94a3b8;font-size:12px;margin:0 0 24px;">If this was you, no action is needed. If you didn't sign in, secure your account immediately.</p>
                      <a href="${appUrl}/profile" style="display:inline-block;background:#2563eb;color:white;padding:11px 24px;text-decoration:none;border-radius:11px;font-weight:700;font-size:13px;">
                        Review Account Security
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
