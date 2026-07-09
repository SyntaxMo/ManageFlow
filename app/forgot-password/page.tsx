import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-ink">Reset password</h1>
          <p className="text-sm text-muted">A secure Supabase reset flow will be added in Phase 2.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input type="email" placeholder="Email address" />
            <Button className="w-full" type="button">
              Send reset link
            </Button>
          </form>
          <Link className="mt-5 block text-sm font-semibold text-primary" href="/login">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
