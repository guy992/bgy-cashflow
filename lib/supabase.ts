import { createClient, type Session } from "@supabase/supabase-js";

const url = "https://xvqmfmwpkddxudgcunvf.supabase.co";
const key = "sb_publishable_oi9q52f3DO1D3lWSgXyUpw_S96NnlkF";

export const supabase = createClient(url, key);

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
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

export async function loadRemote(): Promise<unknown | null> {
  const { data, error } = await supabase.from("app_state").select("data").maybeSingle();
  if (error) { console.error("loadRemote", error.message); return null; }
  return data ? (data as { data: unknown }).data : null;
}

export async function saveRemote(state: unknown): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase
    .from("app_state")
    .upsert({ owner: u.user.id, data: state, updated_at: new Date().toISOString() }, { onConflict: "owner" });
  if (error) console.error("saveRemote", error.message);
}
