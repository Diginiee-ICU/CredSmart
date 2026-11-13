-- ==============================================================================
-- CredSmart CRM Database Fix: "function realtime.send(jsonb, unknown, text, boolean) does not exist"
--
-- TARGET DATABASE: Supabase Cloud Project: wqllixoghlxvapmziilk
-- DASHBOARD SQL EDITOR: https://supabase.com/dashboard/project/wqllixoghlxvapmziilk/sql
--
-- ROOT CAUSE:
-- A trigger 'broadcast_workspace_change' on 'workforce_workspaces' calls 'realtime.send(...)'.
-- In Postgres, the realtime extension or function signature is either missing or uncast.
-- When it fails with error 42883, Postgres aborts the transaction and rolls back
-- every workspace change, resulting in "Cloud save failed. Your changes remain on this device."
--
-- RUN THIS ENTIRE SCRIPT ONCE IN YOUR SUPABASE SQL EDITOR TO PERMANENTLY RESOLVE IT.
-- ==============================================================================

-- 1. Ensure the realtime extension schema is available
CREATE EXTENSION IF NOT EXISTS realtime SCHEMA realtime;

-- 2. Define or replace realtime.send with fail-safe error handling so messaging failures never abort database transactions
CREATE OR REPLACE FUNCTION realtime.send (
  payload jsonb,
  event text,
  topic text,
  private boolean DEFAULT true
)
RETURNS void
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO realtime.messages (payload, event, topic, private, extension)
  VALUES (payload, event, topic, private, 'broadcast');
EXCEPTION WHEN OTHERS THEN
  -- Suppress messaging errors so underlying data persistence is never rolled back
  RAISE WARNING 'realtime.send broadcast ignored: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 3. Replace the workspace broadcast trigger function with safe exception handling
CREATE OR REPLACE FUNCTION broadcast_workspace_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    PERFORM realtime.send(
      json_build_object('id', NEW.id, 'updated_at', NEW.updated_at)::jsonb,
      'changed'::text,
      ('ws:' || NEW.id)::text,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore broadcast errors so insert/update commits cleanly!
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- 4. Re-attach the trigger cleanly
DROP TRIGGER IF EXISTS broadcast_workspace_change ON workforce_workspaces;
CREATE TRIGGER broadcast_workspace_change
AFTER INSERT OR UPDATE ON workforce_workspaces
FOR EACH ROW EXECUTE FUNCTION broadcast_workspace_change();

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA realtime TO authenticated, anon;
GRANT EXECUTE ON FUNCTION realtime.send TO authenticated, anon;
