import { createClient } from "@supabase/supabase-js";

const url = "https://xvqmfmwpkddxudgcunvf.supabase.co";
const key = "sb_publishable_oi9q52f3DO1D3lWSgXyUpw_S96NnlkF";

export const supabase = createClient(url, key);
export const STATE_ID = "adar";

export async function loadRemote(): Promise<unknown | null> {
  const { data, error } = await supabase.from("app_state").select("data").eq("id", STATE_ID).maybeSingle();
  if (error) { console.error("loadRemote", error.message); return null; }
  return data ? (data as { data: unknown }).data : null;
}

export async function saveRemote(state: unknown): Promise<void> {
  const { error } = await supabase.from("app_state").upsert({ id: STATE_ID, data: state, updated_at: new Date().toISOString() });
  if (error) console.error("saveRemote", error.message);
}
