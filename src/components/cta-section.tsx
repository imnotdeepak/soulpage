import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Rocket } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Ready to start your journaling journey?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg">
            Join thousands of users who trust Soft Pages with their most
            personal thoughts. Your privacy is our priority.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">
                <Rocket className="relative size-4" />
                <span className="text-nowrap">Start Journaling Free</span>
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
