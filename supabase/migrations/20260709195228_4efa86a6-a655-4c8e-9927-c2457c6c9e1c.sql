-- FIX 3: retarget FKs to profiles
DO $$
DECLARE fk text;
BEGIN
  SELECT conname INTO fk FROM pg_constraint
   WHERE conrelid = 'public.drops'::regclass
     AND contype = 'f' AND confrelid = 'auth.users'::regclass;
  IF fk IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.drops DROP CONSTRAINT ' || quote_ident(fk);
  END IF;
END $$;

ALTER TABLE public.drops
  ADD CONSTRAINT drops_creator_id_fkey
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DO $$
DECLARE fk text;
BEGIN
  SELECT conname INTO fk FROM pg_constraint
   WHERE conrelid = 'public.drop_rsvps'::regclass
     AND contype = 'f' AND confrelid = 'auth.users'::regclass;
  IF fk IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.drop_rsvps DROP CONSTRAINT ' || quote_ident(fk);
  END IF;
END $$;

ALTER TABLE public.drop_rsvps
  ADD CONSTRAINT drop_rsvps_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- FIX 1: tighten SELECT policies to crew ring
DROP POLICY IF EXISTS "Authenticated can view drops" ON public.drops;
DROP POLICY IF EXISTS "Users see own and friends drops" ON public.drops;
CREATE POLICY "Users see own and friends drops"
  ON public.drops FOR SELECT TO authenticated
  USING (
    creator_id = auth.uid()
    OR public.are_friends(auth.uid(), creator_id)
  );

DROP POLICY IF EXISTS "Authenticated can view rsvps" ON public.drop_rsvps;
DROP POLICY IF EXISTS "Users see rsvps for visible drops" ON public.drop_rsvps;
CREATE POLICY "Users see rsvps for visible drops"
  ON public.drop_rsvps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.drops d
       WHERE d.id = drop_rsvps.drop_id
         AND (d.creator_id = auth.uid() OR public.are_friends(auth.uid(), d.creator_id))
    )
  );

-- FIX 2: email allowlist
CREATE TABLE IF NOT EXISTS public.allowed_domains (
  domain      text PRIMARY KEY,
  campus_name text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email      text PRIMARY KEY,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.allowed_domains (domain, campus_name)
VALUES ('brandeis.edu', 'Brandeis University')
ON CONFLICT (domain) DO NOTHING;

ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_emails  ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.allowed_domains TO authenticated, anon;
DROP POLICY IF EXISTS "Anyone can read allowed domains" ON public.allowed_domains;
CREATE POLICY "Anyone can read allowed domains"
  ON public.allowed_domains FOR SELECT TO authenticated, anon
  USING (true);

CREATE OR REPLACE FUNCTION public.enforce_email_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_domain text;
BEGIN
  email_domain := lower(split_part(NEW.email, '@', 2));

  IF EXISTS (SELECT 1 FROM public.allowed_emails WHERE lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.allowed_domains WHERE domain = email_domain) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'SIGNUP_NOT_ALLOWED: % is not on an approved campus yet', NEW.email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_email_allowlist() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_email_allowlist ON auth.users;
CREATE TRIGGER trg_enforce_email_allowlist
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_email_allowlist();