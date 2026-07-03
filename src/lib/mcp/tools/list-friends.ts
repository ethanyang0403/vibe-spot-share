import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_friends",
  title: "List friends",
  description: "List the signed-in user's accepted friends on Drop.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const uid = ctx.getUserId();
    const { data, error } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id, status, created_at")
      .eq("status", "accepted")
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const friendIds = (data ?? []).map((r: any) =>
      r.requester_id === uid ? r.addressee_id : r.requester_id,
    );
    if (friendIds.length === 0) {
      return { content: [{ type: "text", text: "No friends yet." }], structuredContent: { friends: [] } };
    }
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", friendIds);
    if (pErr) {
      return { content: [{ type: "text", text: pErr.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(profiles) }],
      structuredContent: { friends: profiles ?? [] },
    };
  },
});
