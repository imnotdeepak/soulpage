import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  return (
    <section className="py-16 md:py-32">
      <div className="@container mx-auto max-w-5xl rounded-xl border px-6 py-8 md:px-8 md:py-12">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4">
            One simple plan with everything you need. Includes zero-knowledge
            encryption and complete privacy.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-sm md:mt-16">
          <Card className="group shadow-zinc-950/5 bg-background">
            <CardHeader className="pb-3">
              <h3 className="text-2xl font-semibold">Soft Pages</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold">$2</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <span>Unlimited journal entries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <span>Zero-knowledge encryption</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <span>Timeline & local search</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <span>Unlimited AI summaries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <span>Export & backup tools</span>
                </li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/signup">Get Started</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
