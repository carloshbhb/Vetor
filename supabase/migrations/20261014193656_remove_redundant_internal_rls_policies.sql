DO $cleanup$
DECLARE
  policy_rec record;
BEGIN
  FOR policy_rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN ('reviews', 'viral_articles')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_rec.policyname,
      policy_rec.schemaname,
      policy_rec.tablename
    );
  END LOOP;
END;
$cleanup$;
