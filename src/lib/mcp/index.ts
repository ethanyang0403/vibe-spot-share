import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFriendsTool from "./tools/list-friends";
import listMomentsTool from "./tools/list-moments";
import createMomentTool from "./tools/create-moment";
import listPingsTool from "./tools/list-pings";
import sendPingTool from "./tools/send-ping";

// The OAuth issuer must be the direct Supabase host, built from the project
// ref that Vite inlines at build time (not from SUPABASE_URL, which is the
// Lovable Cloud proxy). The fallback keeps the string well-formed during the
// manifest-extract eval where no token verifies.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "drop-mcp",
  title: "Drop",
  version: "0.1.0",
  instructions:
    "Tools for Drop, a Brandeis-only social plans app. Read the signed-in user's friends, active Drops (Moments), and pings, create new Drops at named campus spots, and send pings to accepted friends. All data is scoped to the signed-in user via Supabase RLS.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listFriendsTool,
    listMomentsTool,
    createMomentTool,
    listPingsTool,
    sendPingTool,
  ],
});
