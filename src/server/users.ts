"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getRequestBaseURL(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  // If someone accidentally sets NEXT_PUBLIC_BASE_URL to localhost in production,
  // ignore it and derive from request headers instead.
  if (fromEnv && !/^https?:\/\/localhost(?::\d+)?$/i.test(fromEnv))
    return fromEnv;

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });
    return { success: true, message: "Sign in successful" };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Sign in failed" };
  }
};

export const signUp = async (email: string, password: string, name: string) => {
  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });
    return { success: true, message: "Sign up successful" };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Sign up failed" };
  }
};

export const forgotPassword = async (email: string) => {
  try {
    // Call better-auth's forget-password endpoint directly
    // This will trigger the sendResetPassword callback configured in auth.ts
    const baseURL = await getRequestBaseURL();
    const response = await fetch(`${baseURL}/api/auth/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        redirectTo: `${baseURL}/reset-password`,
      }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Failed to send reset link" }));
      throw new Error(error.message || "Failed to send reset link");
    }

    return {
      success: true,
      message: "Password reset link sent! Check your email.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to send reset link. Please try again.",
    };
  }
};
