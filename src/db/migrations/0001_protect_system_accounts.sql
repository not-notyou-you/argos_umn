-- Akun seeder tidak boleh dihapus, dinonaktifkan, atau diganti username-nya.
CREATE FUNCTION protect_system_accounts() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.kind = 'system' THEN
    RAISE EXCEPTION 'Akun seeder tidak boleh dihapus';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.kind = 'system'
     AND (NEW.username <> OLD.username OR NEW.kind <> OLD.kind OR NOT NEW.is_active) THEN
    RAISE EXCEPTION 'Akun seeder tidak boleh diubah';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER accounts_protect_system
BEFORE UPDATE OR DELETE ON accounts
FOR EACH ROW EXECUTE FUNCTION protect_system_accounts();
--> statement-breakpoint
-- Log audit hanya bisa ditambah.
CREATE FUNCTION protect_audit_logs() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.actor_account_id IS NULL AND OLD.actor_account_id IS NOT NULL
     AND NEW.action = OLD.action AND NEW.entity_type = OLD.entity_type THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Log audit tidak boleh diubah';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_audit_logs();
