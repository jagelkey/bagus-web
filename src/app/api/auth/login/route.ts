import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readJson } from "@/lib/api";

export async function POST(request: Request) {
  const body = await readJson<{ email?: string; password?: string }>(request);
  const email = body.email?.trim();
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
  }

  return NextResponse.json({ user: data.user });
}
