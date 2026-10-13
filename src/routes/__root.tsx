import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { clearLocalCache, hydrateFromCloud, flushCloud } from "@/lib/store";
import { getLockStatus, lockApp, unlockApp, FIXED_MASTER_PIN } from "@/lib/cloud.functions";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/lib/auth-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link></div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or head back home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
          <a href="/" className="inline-flex h-9 items-center rounded-md border px-4 text-sm">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gurukul Group Tuition" }, { name: "description", content: "Owner app for Gurukul Group Tuition" },
      { name: "author", content: "Lovable" }, { property: "og:title", content: "Gurukul Group Tuition" },
      { property: "og:description", content: "Owner app for Gurukul Group Tuition" }, { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Noto+Sans+Gujarati:wght@400;500;600;700;800&display=swap" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [gate, setGate] = useState<"loading" | "locked" | "open">("loading");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getLockStatus()
      .then(async (status) => {
        if (!active) return;
        const localUnlocked =
          typeof window !== "undefined"
            ? sessionStorage.getItem("gurukul-unlocked") === "true"
            : false;
        if (status.unlocked && localUnlocked) {
          await hydrateFromCloud();
          if (active) setGate("open");
        } else {
          setGate("locked");
        }
      })
      .catch(async () => {
        if (active) {
          const localUnlocked =
            typeof window !== "undefined"
              ? sessionStorage.getItem("gurukul-unlocked") === "true"
              : false;
          if (localUnlocked) {
            try {
              await hydrateFromCloud();
            } catch {}
            if (active) setGate("open");
          } else {
            setGate("locked");
          }
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pin) {
      toast.error("Please enter the PIN.");
      return;
    }
    setBusy(true);
    try {
      if (pin !== FIXED_MASTER_PIN) {
        toast.error("Incorrect PIN. Please enter the correct PIN.");
        setPin("");
        return;
      }
      const result = await unlockApp({ data: { pin } });
      if (!result.ok) {
        toast.error("Incorrect PIN. Please try again.");
        setPin("");
        return;
      }
      if (typeof window !== "undefined") {
        sessionStorage.setItem("gurukul-unlocked", "true");
        localStorage.setItem("gurukul-owner-pin", FIXED_MASTER_PIN);
      }
      await hydrateFromCloud();
      setPin("");
      setGate("open");
      toast.success("Welcome back! All records unlocked.");
    } catch {
      if (pin === FIXED_MASTER_PIN) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("gurukul-unlocked", "true");
          localStorage.setItem("gurukul-owner-pin", FIXED_MASTER_PIN);
        }
        try {
          await hydrateFromCloud();
        } catch {}
        setPin("");
        setGate("open");
        toast.success("Welcome back! All records unlocked.");
      } else {
        toast.error("Incorrect PIN. Please enter the correct PIN.");
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLock() {
    try {
      await flushCloud();
    } catch {
      return;
    }
    try {
      await lockApp();
    } catch {}
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("gurukul-unlocked");
    }
    clearLocalCache();
    queryClient.clear();
    setPin("");
    setGate("locked");
  }

  if (gate !== "open") {
    return (
      <main className="owner-gate">
        <section className="gate-panel">
          <div className="gate-mark">
            <img src="/favicon.png" alt="" />
          </div>
          <p className="gate-eyebrow">GURUKUL GROUP TUITION</p>
          <h1>{gate === "loading" ? "Opening records…" : "Owner Login"}</h1>
          <p className="gate-copy">
            {gate === "loading"
              ? "Connecting to your records…"
              : "Enter your owner PIN to access all student, fee and class records."}
          </p>
          {gate !== "loading" && (
            <form className="gate-form" onSubmit={submitPin}>
              <label className="gate-label" htmlFor="owner-pin">
                Enter PIN to Login
              </label>
              <input
                id="owner-pin"
                type="password"
                autoComplete="current-password"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                minLength={4}
                autoFocus
                required
                className="field text-center text-2xl font-bold tracking-[0.4em]"
                placeholder="••••"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
              <Button
                className="mt-5 h-12 w-full text-base font-bold shadow-md gap-2"
                type="submit"
                disabled={busy}
              >
                {busy ? "Signing in…" : "LOGIN"}
                <LockKeyhole className="size-4" />
              </Button>
            </form>
          )}
          {gate === "locked" && (
            <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              Single-owner protected portal
            </p>
          )}
        </section>
      </main>
    );
  }

  return (
    <AuthContext.Provider value={{ lockApp: handleLock }}>
      <QueryClientProvider client={queryClient}>
        <Outlet />
        <Toaster position="top-center" richColors />
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}