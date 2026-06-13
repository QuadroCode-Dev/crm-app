import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function DashboardCard({
    className,
    ...props
}) {
	return (
        <Card
            className={cn(
                "rounded-[1.75rem] border border-border/70 bg-card/95 shadow-[var(--crm-shadow-card)] ring-0 backdrop-blur-sm",
                className
            )}
            {...props} />
    );
}
