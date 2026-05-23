/**
 * Better Auth catch-all route handler.
 *
 * Better Auth's HTTP surface (sign-in, sign-up, callback, session, sign-out,
 * etc.) is mounted under /api/auth/* via a single Next App Router
 * catch-all. `toNextJsHandler` adapts Better Auth's framework-agnostic
 * handler into the GET/POST exports the App Router expects.
 *
 * Force-dynamic because every auth response sets/reads cookies and must
 * never be statically cached.
 */
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const { GET, POST } = toNextJsHandler(auth);
