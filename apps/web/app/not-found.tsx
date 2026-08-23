import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm rounded-lg border-border p-8 text-center shadow-none">
        <CardContent className="p-0 font-[350]">
          <div className="text-display font-[500] leading-[1.15] tracking-[-0.02em] text-foreground">404</div>
          <h1 className="mt-3 text-heading-4 font-[500]">Page not found</h1>
          <p className="mt-2 text-sm font-[350] text-muted-foreground">
            The page you are looking for does not exist or has moved.
          </p>
          <Link href="/" className={`${buttonClassName("default", "default")} mt-6`}>
            Back to home
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
