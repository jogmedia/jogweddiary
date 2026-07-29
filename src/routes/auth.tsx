import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — JOG MEDIA Studio Accounts" },
      {
        name: "description",
        content: "Secure sign in for the JOG MEDIA wedding studio project and accounting system.",
      },
      { property: "og:title", content: "Sign in — JOG MEDIA Studio Accounts" },
      {
        property: "og:description",
        content: "Secure sign in for the JOG MEDIA wedding studio project and accounting system.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/" });
  };

  const signUp = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Camera className="h-6 w-6" />
          </span>
          <h1 className="page-title">JOG MEDIA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wedding project & accounting system · Kozhikode, Kerala
          </p>
        </div>

        <div className="surface p-6">
          <Tabs defaultValue="signin">
            <TabsList className="mb-5 grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
              </div>
              <Button className="w-full" onClick={signIn} disabled={busy}>
                Sign in
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs">Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
              </div>
              <Button className="w-full" onClick={signUp} disabled={busy}>
                Create account
              </Button>
              <p className="text-xs text-muted-foreground">
                The first account created becomes the studio admin. Later accounts join as staff.
              </p>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
      </div>
    </main>
  );
}
