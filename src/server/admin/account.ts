import "server-only";
import { getAdminSupabase } from "@/server/admin/supabase";

/**
 * Hard-deletes an account (SPEC §9). Call only with the id of the signed-in user who confirmed it.
 * Threads and posts stay and show "[deleted user]" (author_id is set null by the foreign keys);
 * with `removePosts` their bodies become "[deleted]" first. Avatar files are removed too.
 */
export async function deleteUserAccount(userId: string, { removePosts }: { removePosts: boolean }): Promise<void> {
  const admin = getAdminSupabase();

  const clearContent = async () => {
    if (!removePosts) return;
    const [posts, threads] = await Promise.all([
      admin.from("posts").update({ body_md: "[deleted]" }).eq("author_id", userId),
      admin.from("threads").update({ body_md: "[deleted]" }).eq("author_id", userId),
    ]);
    if (posts.error) throw new Error(`Couldn't clear posts: ${posts.error.message}`);
    if (threads.error) throw new Error(`Couldn't clear threads: ${threads.error.message}`);
  };
  const removeAvatars = async () => {
    const { data: files } = await admin.storage.from("avatars").list(userId, { limit: 100 });
    if (files && files.length > 0) {
      await admin.storage.from("avatars").remove(files.map((file) => `${userId}/${file.name}`));
    }
  };
  await Promise.all([clearContent(), removeAvatars()]);

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Couldn't delete the account: ${error.message}`);
}
