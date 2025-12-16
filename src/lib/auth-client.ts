"use client";

import { createAuthClient } from "better-auth/react";

function getBaseURL(): string {
  // Always use same-origin in the browser so deployments don't accidentally call localhost.
  // (Avoid relying on NEXT_PUBLIC_BASE_URL, which can be baked into the client bundle.)
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  redirectUrl: "/dashboard",
});
