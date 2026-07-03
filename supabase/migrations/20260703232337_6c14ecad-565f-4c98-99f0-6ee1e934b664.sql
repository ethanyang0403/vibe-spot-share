
-- 1. Friendships: tighten INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users can create friendship requests" ON public.friendships;
DROP POLICY IF EXISTS "Addressee can update friendship" ON public.friendships;

CREATE POLICY "Users can create friendship requests"
ON public.friendships
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND status = 'pending'
  AND requester_id <> addressee_id
);

CREATE POLICY "Addressee can update friendship"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id)
WITH CHECK (
  auth.uid() = addressee_id
  AND status IN ('accepted', 'declined')
  AND requester_id = (SELECT f.requester_id FROM public.friendships f WHERE f.id = friendships.id)
  AND addressee_id = (SELECT f.addressee_id FROM public.friendships f WHERE f.id = friendships.id)
);

-- 2. user_locations: allow owner to delete
CREATE POLICY "Users can delete their own location"
ON public.user_locations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
