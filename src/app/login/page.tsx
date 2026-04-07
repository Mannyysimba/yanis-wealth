"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (rememberMe) {
      localStorage.setItem("yw-remember-me", "1");
    } else {
      localStorage.removeItem("yw-remember-me");
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-radial">
      <div className="card-gradient-border rounded-2xl p-8 w-full max-w-sm animate-fade-in-scale">
        <div className="text-center mb-6">
          <Image
            src="/logo.svg"
            alt="Yanis Wealth"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          <h1 className="text-xl font-bold tracking-tight">Yanis Wealth</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connectez-vous pour accéder au dashboard
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yanis@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background text-primary accent-primary cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">Se rappeler de moi</span>
          </label>
          {error && (
            <p className="text-sm text-[var(--accent-red)]">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
