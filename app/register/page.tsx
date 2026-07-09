import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-2xl font-bold text-ink">Create an account</h1>
          <p className="text-sm text-muted">New users start with least-privilege access.</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <Input placeholder="Full name" />
            <Input type="email" placeholder="Email address" />
            <Input type="password" placeholder="Password" />
            <Button className="w-full" type="button">
              Register
            </Button>
          </form>
          <p className="mt-5 text-sm text-accent">
            Already have an account?{" "}
            <Link className="font-semibold text-primary" href="/login">
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
