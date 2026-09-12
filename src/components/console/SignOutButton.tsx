"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      variant="outline"
      className={className}
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        await getSupabaseBrowserClient().auth.signOut();
        // refresh() as well as push(): the layout's gate is server-rendered, so the cached
        // console tree has to be discarded or a signed-out admin keeps seeing it.
        router.push("/login");
        router.refresh();
      }}
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}
