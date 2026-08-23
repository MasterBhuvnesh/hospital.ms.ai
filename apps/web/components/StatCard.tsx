import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="rounded-lg border-border shadow-none">
      <CardHeader className="p-5 pb-2">
        <CardDescription className="text-label font-[450] text-muted-foreground">{label}</CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="text-2xl font-[500] leading-[1.2] tracking-[-0.02em]">{value}</div>
        {sub != null && (
          <p className="mt-2 text-xs font-[350] text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}
