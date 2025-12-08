"use server";

import { auth } from "@/lib/auth";

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
    const baseURL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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
