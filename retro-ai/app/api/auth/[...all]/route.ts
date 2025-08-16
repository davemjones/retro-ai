import { auth } from "@/lib/auth-better";
import { toNextJsHandler } from "better-auth/next-js";

// Create the Next.js route handler
const handler = toNextJsHandler(auth);

// Export HTTP methods that Better Auth supports
export const { GET, POST } = handler;