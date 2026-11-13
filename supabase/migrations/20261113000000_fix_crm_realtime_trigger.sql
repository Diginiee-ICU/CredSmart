-- 20261113000000_fix_crm_realtime_trigger.sql
-- Fix for CRM Cloud Save Failure: "function realtime.send(jsonb, unknown, text, boolean) does not exist"
-- Applies to Supabase Cloud: wqllixoghlxvapmziilk

CREATE EXTENSION IF NOT EXISTS realtime SCHEMA realtime;

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
  RAISE WARNING 'realtime.send broadcast ignored: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

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
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS broadcast_workspace_change ON workforce_workspaces;
CREATE TRIGGER broadcast_workspace_change
AFTER INSERT OR UPDATE ON workforce_workspaces
FOR EACH ROW EXECUTE FUNCTION broadcast_workspace_change();

GRANT USAGE ON SCHEMA realtime TO authenticated, anon;
GRANT EXECUTE ON FUNCTION realtime.send TO authenticated, anon;
