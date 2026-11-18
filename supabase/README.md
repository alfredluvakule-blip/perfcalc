# Supabase backend (Phase 3)

`migrations/` holds the database schema and row level security (RLS) policies. This first slice stores staff accounts and roles, hospital formulary and checklist versions with approval, and an append-only audit log. **No patient data is stored on the server** until the Tanzania Personal Data Protection Act 2022 review is done.

## Access model

- Staff join by **invitation**: a hospital administrator invites an email with a role; when that person signs up they are linked to the hospital and approved. Anyone else who signs up has no hospital and sees nothing.
- Staff can change only their own name. Role, hospital and approval are changed only by an administrator of the same hospital.
- Formulary and checklist changes are saved as **new draft versions**; only an administrator approves them, and approved versions cannot be edited in place.
- The audit log is insert-only: nobody can edit or delete an event through the API.
- One hospital never sees another hospital's data.

## Tests

`npm run test:rls` starts a throwaway local PostgreSQL (15 or newer), applies a stand-in for Supabase's `auth` schema (`tests/stub_auth.sql`) and the migrations, then runs `tests/rls_test.sql`, which signs in as different staff and checks what each can and cannot do.
