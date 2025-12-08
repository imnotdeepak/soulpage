import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/db";
import { nextCookies } from "better-auth/next-js";
import { schema } from "@/db/schema";
import { Resend } from "resend";
import { render } from "@react-email/render";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const emailHtml = await render(
        VerifyEmail({
          username: user.name || user.email,
          verifyUrl: url,
        })
      );

      await resend.emails.send({
        from: "rambutan@soulpage.space",
        to: user.email,
        subject: "Verify your email address",
        html: emailHtml,
      });
    },
    sendOnSignUp: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const emailHtml = await render(
        ForgotPasswordEmail({
          username: user.name || user.email,
          resetUrl: url,
          userEmail: user.email,
        })
      );

      await resend.emails.send({
        from: "rambutan@soulpage.space",
        to: user.email,
        subject: "Reset your password",
        html: emailHtml,
      });
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [nextCookies()],
});
