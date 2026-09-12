import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { readAdminGate } from "@/lib/auth/admin";
import { SignOutButton } from "@/components/console/SignOutButton";

export default async function DeniedPage() {
  const gate = await readAdminGate();
  const email = gate.status === "denied" ? gate.email : null;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>No console access</CardTitle>
          <CardDescription>
            {email
              ? `${email} is not on the admin allow-list.`
              : "This account is not on the admin allow-list."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Sign out and try a different Google account.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </main>
  );
}
