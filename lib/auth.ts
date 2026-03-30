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
