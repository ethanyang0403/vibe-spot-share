import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "send_ping",
  title: "Send a ping",
  description:
    "Send a lightweight ping (nudge) to an accepted friend on Drop. RLS enforces that the recipient must be a friend.",
  inputSchema: {
    recipient_id: z.string().uuid().describe("Profile id of the friend to ping."),
    message: z.string().trim().max(200).optional().describe("Optional short message."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ recipient_id, message }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("pings")
      .insert({
        sender_id: ctx.getUserId(),
        recipient_id,
        message: message ?? null,
      })
      .select()
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: "Ping sent." }],
      structuredContent: { ping: data },
    };
  },
});
