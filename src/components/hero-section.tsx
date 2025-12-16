"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Logo } from "@/components/logo";
import { Menu, Rocket, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { name: "Features", href: "#" },
  { name: "Solution", href: "#" },
  { name: "Pricing", href: "#" },
  { name: "About", href: "#" },
];

export default function HeroSection() {
  const [menuState, setMenuState] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  return (
    <>
      <header>
        <nav
          data-state={menuState && "active"}
          className="fixed z-20 w-full border-b border-dashed bg-white backdrop-blur md:relative dark:bg-zinc-950/50 lg:dark:bg-transparent"
        >
          <div className="m-auto max-w-5xl px-6">
            <div className="flex flex-wrap items-center gap-6 py-3 lg:gap-0 lg:py-4">
              <div className="flex w-full justify-between lg:w-auto lg:flex-1">
                <Link
                  href="/"
                  aria-label="home"
                  className="flex items-center space-x-2"
                >
                  <Logo />
                </Link>

                <button
                  onClick={() => setMenuState(!menuState)}
                  aria-label={menuState == true ? "Close Menu" : "Open Menu"}
                  className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
                >
                  <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                  <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>

              <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-center space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:flex-1 lg:justify-center lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                <div className="lg:pr-4">
                  <ul className="space-y-6 text-base lg:flex lg:gap-8 lg:space-y-0 lg:text-sm">
                    {menuItems.map((item, index) => (
                      <li key={index}>
                        <Link
                          href={item.href}
                          className="text-foreground hover:text-accent-foreground block duration-150 font-medium"
                        >
                          <span>{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="hidden lg:flex lg:flex-1 lg:justify-end">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    aria-label="Toggle theme"
                    className="relative"
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/login")}
                  >
                    <span>Sign In</span>
                  </Button>
                  <Button size="sm" onClick={() => router.push("/signup")}>
                    <span>Sign Up</span>
                  </Button>
                </div>
              </div>

              <div className="bg-background in-data-[state=active]:block lg:hidden mb-6 hidden w-full flex-wrap items-center justify-center space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap dark:shadow-none">
                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    aria-label="Toggle theme"
                    className="relative sm:order-first"
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/login")}
                  >
                    <span>Sign In</span>
                  </Button>
                  <Button size="sm" onClick={() => router.push("/signup")}>
                    <span>Sign Up</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main className="overflow-hidden">
        <section className="relative">
          <div className="relative py-24 lg:py-28">
            <div className="mx-auto max-w-7xl px-6 md:px-12">
              <div className="text-center sm:mx-auto sm:w-10/12 lg:mr-auto lg:mt-0 lg:w-4/5">
                <h1 className="mt-8 text-4xl font-semibold md:text-5xl xl:text-5xl xl:leading-[1.125]">
                  Your Private, Cozy <br /> Journaling Space
                </h1>
                <p className="mx-auto mt-8 hidden max-w-2xl text-wrap text-lg sm:block">
                  Soft Pages is a private, encrypted journal where your thoughts
                  are truly yours. Write freely, browse your timeline, and
                  search your memories—all with zero-knowledge security and a
                  calming, reflective experience.
                </p>
                <p className="mx-auto mt-6 max-w-2xl text-wrap sm:hidden">
                  A private, encrypted journal where your thoughts are truly
                  yours. Write freely with optional AI summaries and
                  zero-knowledge security.
                </p>

                <div className="mt-8">
                  <Button size="lg" asChild>
                    <Link href="/signup">
                      <Rocket className="relative size-4" />
                      <span className="text-nowrap">Start Journaling</span>
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="x-auto relative mx-auto mt-8 max-w-lg sm:mt-12">
                <div className="absolute inset-x-0 top-12 -z-1 mx-auto h-1/3 w-2/3 rounded-full bg-blue-300 blur-3xl dark:bg-white/20"></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
