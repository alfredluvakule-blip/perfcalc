import { useEffect, useId, useState } from "react";
import { CloudUpload, LogIn, LogOut, MailPlus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { backend } from "@/platform/backend";
import { useAccount } from "@/platform/account";
import type { Role } from "@/platform/modules";
import { localOutbox } from "@/lib/clinical/auditSync";
import { Button, Grid, Note, Panel, Pill, Segmented, SelectField, TextField } from "@/components/calculators/shared";

const ROLES: { value: Role; label: string }[] = [
  { value: "nurse", label: "Nurse" },
  { value: "anaesthetist", label: "Anaesthetist or anaesthesia provider" },
  { value: "icu", label: "ICU staff" },
  { value: "theatre", label: "Theatre staff" },
  { value: "perfusionist", label: "Perfusionist" },
  { value: "educator", label: "Educator" },
  { value: "admin", label: "Hospital administrator" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

function Input({ label, type = "text", value, onChange, autoComplete }: { label: string; type?: string; value: string; onChange: (v: string) => void; autoComplete?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input id={id} type={type} value={value} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>
  );
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ tone: "warn" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const sb = backend();
    const res =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email: email.trim(), password })
        : await sb.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname + "#/account" } });
    setBusy(false);
    if (res.error) return setMsg({ tone: "warn", text: res.error.message });
    if (mode === "up" && !res.data.session) setMsg({ tone: "info", text: "Check your email and confirm your address, then sign in here." });
  };
  return (
    <Panel title="Staff sign-in" icon={LogIn}>
      <Note>An account is optional. Every calculator, score, chart and record works without one. Signing in adds your hospital role and copies the audit log to your hospital's server. Only staff invited by their hospital administrator get access.</Note>
      <Segmented label="" value={mode} onChange={setMode} options={[{ value: "in", label: "Sign in" }, { value: "up", label: "Create account" }]} />
      <Grid cols={2}>
        {mode === "up" ? <Input label="Full name" value={name} onChange={setName} autoComplete="name" /> : null}
        <Input label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Input label="Password" type="password" value={password} onChange={setPassword} autoComplete={mode === "in" ? "current-password" : "new-password"} />
      </Grid>
      <Button variant="primary" icon={mode === "in" ? LogIn : UserPlus} onClick={submit} disabled={busy || !email.includes("@") || password.length < 8}>
        {mode === "in" ? "Sign in" : "Create account"}
      </Button>
      {mode === "up" ? <p className="text-xs text-muted-foreground">Use the email address your administrator invited. Password: at least 8 characters.</p> : null}
      {msg ? <Note tone={msg.tone}>{msg.text}</Note> : null}
    </Panel>
  );
}

function SyncStatus() {
  const [left, setLeft] = useState(localOutbox.read().length);
  useEffect(() => {
    const on = () => setTimeout(() => setLeft(localOutbox.read().length), 1500);
    window.addEventListener("nap-audit", on);
    window.addEventListener("online", on);
    return () => {
      window.removeEventListener("nap-audit", on);
      window.removeEventListener("online", on);
    };
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill tone={left ? "warn" : "ok"}>{left ? `${left} audit events waiting to upload` : "Audit log up to date on the server"}</Pill>
      <Button
        icon={CloudUpload}
        className="h-9 text-xs"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("nap-audit"));
          setTimeout(() => setLeft(localOutbox.read().length), 1500);
        }}
      >
        Send now
      </Button>
    </div>
  );
}

interface StaffRow {
  id: string;
  full_name: string;
  role: Role;
  approved: boolean;
}
interface InviteRow {
  id: string;
  email: string;
  role: Role;
  used_at: string | null;
  created_at: string;
}

function AdminPanel({ hospitalId, selfId }: { hospitalId: string; selfId: string }) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("nurse");
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    const sb = backend();
    const [s, i] = await Promise.all([
      sb.from("nap_profiles").select("id, full_name, role, approved").eq("hospital_id", hospitalId).order("full_name"),
      sb.from("nap_staff_invites").select("id, email, role, used_at, created_at").order("created_at", { ascending: false }),
    ]);
    setStaff((s.data as StaffRow[]) ?? []);
    setInvites((i.data as InviteRow[]) ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitalId]);
  const update = async (id: string, patch: Partial<StaffRow>) => {
    const { error } = await backend().from("nap_profiles").update(patch).eq("id", id);
    setErr(error ? error.message : null);
    load();
  };
  const invite = async () => {
    const { error } = await backend().from("nap_staff_invites").insert({ hospital_id: hospitalId, email: email.trim().toLowerCase(), role, created_by: selfId });
    setErr(error ? (error.code === "23505" ? "That email has already been invited." : error.message) : null);
    if (!error) setEmail("");
    load();
  };
  return (
    <>
      <Panel title="Invite staff" icon={MailPlus}>
        <Note>Invite by email with a role. When that person creates an account with the same email, they join your hospital with that role. Send them the app link yourself; no email is sent from here.</Note>
        <Grid cols={2}>
          <TextField label="Email" value={email} onChange={setEmail} />
          <SelectField label="Role" value={role} onChange={setRole} options={ROLES} />
        </Grid>
        <Button variant="primary" icon={MailPlus} onClick={invite} disabled={!email.includes("@")}>
          Add invitation
        </Button>
        {err ? <Note tone="warn">{err}</Note> : null}
        <ul className="divide-y text-sm">
          {invites.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
              <span className="min-w-0 flex-1 break-all">{i.email}</span>
              <Pill>{roleLabel(i.role)}</Pill>
              {i.used_at ? (
                <Pill tone="ok">Joined</Pill>
              ) : (
                <button type="button" aria-label={`Withdraw invitation for ${i.email}`} onClick={async () => (await backend().from("nap_staff_invites").delete().eq("id", i.id), load())} className="grid h-9 w-9 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {invites.length === 0 ? <li className="py-2 text-muted-foreground">No invitations yet.</li> : null}
        </ul>
      </Panel>
      <Panel title="Staff" icon={Users}>
        <ul className="divide-y text-sm">
          {staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-end gap-3 py-2">
              <span className="min-w-0 flex-1 font-medium">{s.full_name || "(no name)"}{s.id === selfId ? " (you)" : ""}</span>
              <SelectField label="Role" value={s.role} onChange={(r) => update(s.id, { role: r })} options={ROLES} className="w-56" />
              <Button className="h-11" onClick={() => update(s.id, { approved: !s.approved })} disabled={s.id === selfId}>
                {s.approved ? "Suspend access" : "Restore access"}
              </Button>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

export default function AccountModule() {
  const { session, profile, ready, refresh } = useAccount();
  const [name, setName] = useState("");
  useEffect(() => setName(profile?.full_name ?? ""), [profile?.full_name]);
  if (!ready) return <Note>Loading…</Note>;
  if (!session) return <SignIn />;
  return (
    <div className="space-y-4">
      <Panel title="Your account" icon={ShieldCheck} aside={<Button icon={LogOut} className="h-8 text-xs" onClick={() => backend().auth.signOut()}>Sign out</Button>}>
        <Grid cols={2}>
          <TextField label="Full name" value={name} onChange={setName} />
          <div className="flex items-end">
            <Button
              disabled={!profile || name.trim() === profile.full_name}
              onClick={async () => {
                if (profile) await backend().from("nap_profiles").update({ full_name: name.trim() }).eq("id", profile.id);
                refresh();
              }}
            >
              Save name
            </Button>
          </div>
        </Grid>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{session.user.email}</dd>
          <dt className="text-muted-foreground">Hospital</dt>
          <dd>{profile?.hospital_name ?? "Not linked"}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd>{profile?.approved ? roleLabel(profile.role) : "—"}</dd>
        </dl>
        {profile?.approved ? <SyncStatus /> : <Note tone="warn">Your account is not linked to a hospital yet. Ask your hospital administrator to invite this email address. If they invited a different address, create an account with that one.</Note>}
      </Panel>
      {profile?.approved && profile.role === "admin" && profile.hospital_id ? <AdminPanel hospitalId={profile.hospital_id} selfId={profile.id} /> : null}
      <Note>Patient details are never sent to the server. Shared hospital formulary and checklists with approval come in the next update.</Note>
    </div>
  );
}

