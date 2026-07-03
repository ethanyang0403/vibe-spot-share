
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS intake_completed boolean NOT NULL DEFAULT false;

CREATE TABLE public.intake_responses (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  year text,
  housing text,
  orgs text[],
  availability jsonb,
  notice_threshold text,
  ping_windows text[],
  ping_frequency text,
  categories text[],
  plan_energy text,
  group_size text,
  scenario_spontaneity text,
  rings_joinable text[],
  intent text,
  talk_style text,
  crew_seeds text[],
  radius text,
  budget text,
  constraints text[],
  constraints_note text,
  host_interest text,
  host_pitch text,
  wildcard text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intake_responses TO authenticated;
GRANT ALL ON public.intake_responses TO service_role;
ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own intake select" ON public.intake_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own intake insert" ON public.intake_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own intake update" ON public.intake_responses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_energy text CHECK (plan_energy IN ('low_key','mixed','going_out','depends')),
  intent text CHECK (intent IN ('my_people','new_people','both')),
  rings_joinable text[],
  categories text[],
  group_size text CHECK (group_size IN ('small','medium','large','any')),
  availability jsonb,
  notice_threshold text CHECK (notice_threshold IN ('under_1h','few_hours','same_day','day_plus')),
  ping_windows text[],
  ping_frequency text CHECK (ping_frequency IN ('essentials','few_per_week','open')),
  paused_until timestamptz,
  radius text CHECK (radius IN ('campus','walkable','short_ride','boston')),
  budget text CHECK (budget IN ('free','under_10','under_25','flexible')),
  constraints text[],
  constraints_note text,
  host_interest text CHECK (host_interest IN ('host','cohost','spread','join')),
  talk_style text CHECK (talk_style IN ('talker','listener','depends')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferences TO authenticated;
GRANT ALL ON public.preferences TO service_role;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own prefs select" ON public.preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own prefs insert" ON public.preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own prefs update" ON public.preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_user_created_idx ON public.events(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own events select" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own events insert" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER intake_touch BEFORE UPDATE ON public.intake_responses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER prefs_touch BEFORE UPDATE ON public.preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
