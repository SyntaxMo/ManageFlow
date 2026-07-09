import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-ink">Login to MangeFlow</h1>
          <p className="text-sm text-muted">Supabase authentication connects in Phase 2.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
            <Button className="w-full" type="button">
              Login
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-between text-sm">
            <Link className="font-semibold text-primary" href="/forgot-password">
              Forgot password?
            </Link>
            <Link className="font-semibold text-primary" href="/register">
              Register
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
