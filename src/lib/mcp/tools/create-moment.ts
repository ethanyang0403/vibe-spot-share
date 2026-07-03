import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

// Brandeis campus spots from project knowledge — used to snap Drops to a
// named location instead of exposing exact coordinates.
const CAMPUS_SPOTS = {
  usdan: { name: "Usdan Student Center", lat: 42.3661, lng: -71.2589 },
  shapiro: { name: "Shapiro Campus Center", lat: 42.3667, lng: -71.2595 },
  goldfarb: { name: "Goldfarb Library", lat: 42.3659, lng: -71.2601 },
  gosman: { name: "Gosman Sports Center", lat: 42.3676, lng: -71.2611 },
  sherman: { name: "Sherman Dining", lat: 42.3648, lng: -71.2585 },
  great_lawn: { name: "Great Lawn", lat: 42.3655, lng: -71.2597 },
  chapels_field: { name: "Chapels Field", lat: 42.3671, lng: -71.2582 },
  massell: { name: "Massell Quad", lat: 42.3645, lng: -71.2593 },
  north_quad: { name: "North Quad", lat: 42.3672, lng: -71.2599 },
  skyline: { name: "Skyline Commons", lat: 42.3679, lng: -71.2578 },
  einstein: { name: "Einstein Bros", lat: 42.3663, lng: -71.2592 },
  moody: { name: "Moody Street", lat: 42.3760, lng: -71.2358 },
  south_street: { name: "South Street", lat: 42.3641, lng: -71.2575 },
} as const;

export default defineTool({
  name: "create_moment",
  title: "Create a Drop (Moment)",
  description:
    "Create a Drop (Moment) — a plan at a Brandeis campus spot that expires after a set number of minutes. Visible to accepted friends per RLS.",
  inputSchema: {
    title: z.string().trim().min(1).max(80).describe("Short plan title, e.g. 'Coffee at Einstein'."),
    spot: z
      .enum(
        Object.keys(CAMPUS_SPOTS) as [keyof typeof CAMPUS_SPOTS, ...Array<keyof typeof CAMPUS_SPOTS>],
      )
      .describe("Brandeis campus spot key."),
    duration_minutes: z
      .number()
      .int()
      .min(15)
      .max(240)
      .default(90)
      .describe("How long the Drop stays live (15–240 minutes)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, spot, duration_minutes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const s = CAMPUS_SPOTS[spot as keyof typeof CAMPUS_SPOTS];
    const expiresAt = new Date(Date.now() + duration_minutes * 60_000).toISOString();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("moments")
      .insert({
        creator_id: ctx.getUserId(),
        title,
        latitude: s.lat,
        longitude: s.lng,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [
        { type: "text", text: `Drop created at ${s.name}, expires ${expiresAt}.` },
      ],
      structuredContent: { moment: data, spot: s.name },
    };
  },
});
