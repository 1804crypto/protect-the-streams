-- Fix overly permissive PvP matches UPDATE policy
-- Previously: USING (true) WITH CHECK (true) — any user could modify any match
-- Now: Only match participants can update their own matches

DROP POLICY IF EXISTS "Participants Update" ON public.pvp_matches;

CREATE POLICY "Participants Update" ON public.pvp_matches FOR
UPDATE USING (
    auth.uid()::text = attacker_id OR auth.uid()::text = defender_id
) WITH CHECK (
    auth.uid()::text = attacker_id OR auth.uid()::text = defender_id
);
