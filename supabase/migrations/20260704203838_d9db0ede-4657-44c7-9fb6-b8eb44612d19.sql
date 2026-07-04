
-- DROPS TABLE
CREATE TABLE public.drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  location_name text NOT NULL,
  location_details text,
  latitude double precision,
  longitude double precision,
  capacity integer NOT NULL CHECK (capacity > 0),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  rsvp_deadline timestamptz NOT NULL,
  visibility text NOT NULL DEFAULT 'crew',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (rsvp_deadline <= start_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drops TO authenticated;
GRANT ALL ON public.drops TO service_role;

ALTER TABLE public.drops ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view drops (v1 crew ring enforced at app layer; broaden later)
CREATE POLICY "Authenticated can view drops"
  ON public.drops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own drops"
  ON public.drops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Hosts can update their drops"
  ON public.drops FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Hosts can delete their drops"
  ON public.drops FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

CREATE TRIGGER trg_drops_updated_at
  BEFORE UPDATE ON public.drops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_drops_start_time ON public.drops (start_time);
CREATE INDEX idx_drops_creator_id ON public.drops (creator_id);

-- RSVP TABLE
CREATE TABLE public.drop_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id uuid NOT NULL REFERENCES public.drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drop_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drop_rsvps TO authenticated;
GRANT ALL ON public.drop_rsvps TO service_role;

ALTER TABLE public.drop_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view rsvps"
  ON public.drop_rsvps FOR SELECT
  TO authenticated
  USING (true);

-- Server-side capacity + deadline enforcement via a trigger
CREATE OR REPLACE FUNCTION public.enforce_rsvp_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  current_count integer;
BEGIN
  SELECT capacity, rsvp_deadline, end_time INTO d
  FROM public.drops WHERE id = NEW.drop_id;

  IF d IS NULL THEN
    RAISE EXCEPTION 'Drop not found';
  END IF;

  IF now() > d.rsvp_deadline THEN
    RAISE EXCEPTION 'RSVP deadline has passed';
  END IF;

  IF now() > d.end_time THEN
    RAISE EXCEPTION 'Drop has ended';
  END IF;

  SELECT count(*) INTO current_count
  FROM public.drop_rsvps WHERE drop_id = NEW.drop_id;

  IF current_count >= d.capacity THEN
    RAISE EXCEPTION 'Drop is full';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_rsvp_rules() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_rsvp_enforce
  BEFORE INSERT ON public.drop_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rsvp_rules();

CREATE POLICY "Users can rsvp as themselves"
  ON public.drop_rsvps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their own rsvp"
  ON public.drop_rsvps FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_rsvps_drop_id ON public.drop_rsvps (drop_id);
CREATE INDEX idx_rsvps_user_id ON public.drop_rsvps (user_id);
