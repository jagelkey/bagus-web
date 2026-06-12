import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadPrivateFile(bucket: string, file: File, folder: string) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createAdminClient();

  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function getSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 60 * 10) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
