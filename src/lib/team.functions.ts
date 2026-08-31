import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only admins can perform this action");
}

const createTeamMemberSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  username: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().max(150).optional().nullable(),
  password: z.string().min(8).max(72),
  title: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(["admin", "member"]),
});

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createTeamMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const providedEmail = data.email?.trim().toLowerCase();
    const base =
      data.username?.trim() ||
      (providedEmail?.includes("@") ? providedEmail.split("@")[0] : providedEmail) ||
      data.full_name;
    const slug =
      base.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "") ||
      `user${Date.now()}`;
    const email =
      providedEmail && providedEmail.includes("@")
        ? providedEmail
        : `${slug}@cognilearn.local`;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: slug },
    });

    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");

    const userId = created.user.id;

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: data.full_name,
      title: data.title ?? null,
      phone: data.phone ?? null,
    });

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { ok: true, userId };
  });

const updateMemberRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateMemberRoleSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteMemberSchema = z.object({ user_id: z.string().uuid() });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteMemberSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("You cannot remove your own admin account");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
