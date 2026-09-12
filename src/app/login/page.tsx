import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readAdminGate } from "@/lib/auth/admin";
import { safeInternalPath } from "@/lib/auth/safe-redirect";
import { SignInWithGoogle } from "./SignInWithGoogle";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Next 16: searchParams is a promise.
  const params = await searchParams;
  const nextParam = typeof params.next === "string" ? params.next : "/";
  const next = safeInternalPath(nextParam);
  const failedOAuth = params.authError === "oauth";

  const gate = await readAdminGate();
  if (gate.status === "ok") redirect(next);
  if (gate.status === "denied") redirect("/denied");

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Indie Hackers City — Admin</CardTitle>
          <CardDescription>
            Staff only. Sign in with a Google account on the console allow-list.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {gate.status === "unconfigured" ? (
            <p className="text-destructive text-sm" role="alert">{gate.detail}</p>
          ) : (
            <SignInWithGoogle next={next} />
          )}
          {failedOAuth ? (
            <p className="text-destructive text-sm" role="alert">
              Google sign-in did not complete. Try again.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
