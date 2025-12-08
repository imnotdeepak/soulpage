import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Lock, Search, Sparkles } from "lucide-react";
import { ReactNode } from "react";

export default function Features() {
  return (
    <section className="py-16 md:py-32">
      <div className="@container mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            Your thoughts, truly yours
          </h2>
          <p className="mt-4">
            A private, encrypted journal where your memories are protected with
            zero-knowledge security and a calming, reflective experience.
          </p>
        </div>
        <div className="@min-4xl:max-w-full @min-4xl:grid-cols-3 mx-auto mt-8 grid max-w-sm gap-6 *:text-center md:mt-16">
          <Card className="group shadow-zinc-950/5 bg-background">
            <CardHeader className="pb-3">
              <CardDecorator>
                <Lock className="size-6" aria-hidden />
              </CardDecorator>

              <h3 className="mt-6 font-medium">Zero-Knowledge Security</h3>
            </CardHeader>

            <CardContent>
              <p className="text-sm">
                Your entries are encrypted end-to-end. Only you can decrypt your
                thoughts—not even we can see them. Your privacy is truly
                protected.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-zinc-950/5 bg-background">
            <CardHeader className="pb-3">
              <CardDecorator>
                <Search className="size-6" aria-hidden />
              </CardDecorator>

              <h3 className="mt-6 font-medium">Timeline & Search</h3>
            </CardHeader>

            <CardContent>
              <p className="mt-3 text-sm">
                Browse your memories through a beautiful timeline view. Search
                your entries locally and privately—all decryption happens in
                your browser.
              </p>
            </CardContent>
          </Card>

          <Card className="group shadow-zinc-950/5 bg-background">
            <CardHeader className="pb-3">
              <CardDecorator>
                <Sparkles className="size-6" aria-hidden />
              </CardDecorator>

              <h3 className="mt-6 font-medium">Optional AI Summaries</h3>
            </CardHeader>

            <CardContent>
              <p className="mt-3 text-sm">
                Get AI-powered insights when you want them. Summaries are only
                generated on-demand and run entirely in your browser for
                complete privacy.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="relative mx-auto size-36 duration-200">
    <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t">
      {children}
    </div>
  </div>
);
