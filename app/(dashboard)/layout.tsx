import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import AppShell from "@/components/shell/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayUser = {
    name:
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Пользователь",
    email: user.email ?? "",
  };

  return (
    <AppShell user={displayUser}>
      {children}
    </AppShell>
  );
}
