import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_pings",
  title: "List received pings",
  description: "List pings received by the signed-in user, most recent first.",
  inputSchema: {
    unread_only: z.boolean().default(false).describe("If true, return only unread pings."),
    limit: z.number().int().min(1).max(100).default(50),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ unread_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("pings")
      .select("id, sender_id, recipient_id, message, latitude, longitude, read, created_at")
      .eq("recipient_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit);
    if (unread_only) query = query.eq("read", false);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { pings: data ?? [] },
    };
  },
});
