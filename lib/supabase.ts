import { createClient, type Session } from "@supabase/supabase-js";

const url = "https://xvqmfmwpkddxudgcunvf.supabase.co";
const key = "sb_publishable_oi9q52f3DO1D3lWSgXyUpw_S96NnlkF";

export const supabase = createClient(url, key);

export interface OrgRow { id: string; name: string; role?: string }
export interface ProfileRow { id: string; email: string }

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}
export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
}
export async function signOut() {
  return supabase.auth.signOut();
}
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function onAuthChange(cb: (s: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_e, s) => cb(s));
}

export async function isSuperAdmin(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data, error } = await supabase.from("super_admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
  if (error) { console.error("isSuperAdmin", error.message); return false; }
  return !!data;
}

export async function getMyOrgs(): Promise<OrgRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("memberships")
    .select("role, orgs(id, name)")
    .eq("user_id", u.user.id);
  if (error) { console.error("getMyOrgs", error.message); return []; }
  return (data || []).map((m: { role: string; orgs: { id: string; name: string } | { id: string; name: string }[] }) => {
    const o = Array.isArray(m.orgs) ? m.orgs[0] : m.orgs;
    return { id: o.id, name: o.name, role: m.role };
  });
}

export async function listOrgs(): Promise<OrgRow[]> {
  const { data, error } = await supabase.from("orgs").select("id, name").order("created_at", { ascending: true });
  if (error) { console.error("listOrgs", error.message); return []; }
  return (data || []) as OrgRow[];
}

export async function createOrg(name: string): Promise<string | null> {
  const { data, error } = await supabase.from("orgs").insert({ name }).select("id").single();
  if (error) { console.error("createOrg", error.message); return null; }
  return data ? (data as { id: string }).id : null;
}

export async function seedOrgState(orgId: string, state: unknown): Promise<boolean> {
  const { error } = await supabase
    .from("app_state")
    .upsert({ org_id: orgId, data: state, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
  if (error) { console.error("seedOrgState", error.message); return false; }
  return true;
}

export async function searchProfileByEmail(email: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("id, email").ilike("email", email.trim()).maybeSingle();
  if (error) { console.error("searchProfileByEmail", error.message); return null; }
  return data ? (data as ProfileRow) : null;
}

export async function addMembership(orgId: string, userId: string, role: string): Promise<boolean> {
  const { error } = await supabase.from("memberships").insert({ org_id: orgId, user_id: userId, role });
  if (error) { console.error("addMembership", error.message); return false; }
  return true;
}

export async function listMembers(orgId: string): Promise<{ user_id: string; role: string; email: string }[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role, profiles(email)")
    .eq("org_id", orgId);
  if (error) { console.error("listMembers", error.message); return []; }
  return (data || []).map((m: { user_id: string; role: string; profiles: { email: string } | { email: string }[] | null }) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { user_id: m.user_id, role: m.role, email: p ? p.email : "—" };
  });
}

export async function loadRemote(orgId: string): Promise<unknown | null> {
  const { data, error } = await supabase.from("app_state").select("data").eq("org_id", orgId).maybeSingle();
  if (error) { console.error("loadRemote", error.message); return null; }
  return data ? (data as { data: unknown }).data : null;
}

export async function saveRemote(orgId: string, state: unknown): Promise<void> {
  const { error } = await supabase
    .from("app_state")
    .upsert({ org_id: orgId, data: state, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
  if (error) console.error("saveRemote", error.message);
}
