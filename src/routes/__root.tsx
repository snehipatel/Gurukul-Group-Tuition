import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { clearLocalCache, hydrateFromCloud, flushCloud } from "@/lib/store";
import { changePin, getLockStatus, lockApp, unlockApp } from "@/lib/cloud.functions";
import { Button } from "@/components/ui/button";

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
  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void getLockStatus().then(async (status) => {
      if (!active) return;
      setHasPin(status.hasPin);
      if (status.unlocked) {
        await hydrateFromCloud();
        if (active) setGate("open");
      } else setGate("locked");
    }).catch(() => { if (active) { setGate("locked"); toast.error("Unable to connect to your saved records. Please try again."); } });
    return () => { active = false; };
  }, []);

  async function submitPin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) { toast.error("Choose a PIN with 4 to 8 numbers."); return; }
    if ((!hasPin || changingPin) && pin !== confirmPin) { toast.error("The PINs do not match."); return; }
    setBusy(true);
    try {
      const result = !hasPin ? await unlockApp({ data: { pin } }) : changingPin ? await changePin({ data: { pin } }) : await unlockApp({ data: { pin } });
      if (!result.ok) { toast.error("That PIN did not match. Try again in a moment."); return; }
      if (!hasPin || changingPin) { setHasPin(true); setChangingPin(false); }
      await hydrateFromCloud();
      setPin(""); setConfirmPin(""); setGate("open");
    } catch {
      toast.error("Could not open your records. Please check your connection and try again.");
    } finally { setBusy(false); }
  }

  async function handleLock() {
    try { await flushCloud(); } catch { return; }
    await lockApp();
    clearLocalCache();
    queryClient.clear();
    setPin(""); setConfirmPin(""); setChangingPin(false); setGate("locked");
  }

  if (gate !== "open") {
    const setup = !hasPin;
    return (
      <main className="owner-gate">
        <section className="gate-panel">
          <div className="gate-mark"><img src="/favicon.png" alt="" /></div>
          <p className="gate-eyebrow">GURUKUL GROUP TUITION</p>
          <h1>{gate === "loading" ? "Opening your records" : setup ? "Set your owner PIN" : changingPin ? "Choose a new PIN" : "Welcome back"}</h1>
          <p className="gate-copy">{gate === "loading" ? "Connecting to your saved information…" : setup ? "Choose 4 to 8 numbers to keep your students and fee records private." : "Enter your PIN to open your saved records."}</p>
          {gate !== "loading" && (
            <form className="gate-form" onSubmit={submitPin}>
              <label className="gate-label" htmlFor="owner-pin">{changingPin || setup ? "New PIN" : "Owner PIN"}</label>
              <input id="owner-pin" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} minLength={4} required className="field text-center text-2xl font-bold tracking-[0.3em]" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))} />
              {(setup || changingPin) && <><label className="gate-label mt-3" htmlFor="confirm-pin">Confirm PIN</label><input id="confirm-pin" autoComplete="new-password" inputMode="numeric" pattern="[0-9]{4,8}" maxLength={8} minLength={4} required className="field text-center text-2xl font-bold tracking-[0.3em]" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))} /></>}
              <Button className="mt-5 h-12 w-full text-base" type="submit" disabled={busy}>{busy ? "Please wait…" : setup ? "SAVE PIN" : changingPin ? "UPDATE PIN" : "OPEN GURUKUL"}<LockKeyhole className="size-4" /></Button>
              {changingPin && <Button variant="ghost" className="mt-2 w-full" type="button" onClick={() => { setChangingPin(false); setPin(""); setConfirmPin(""); }}>Cancel</Button>}
            </form>
          )}
          {gate === "locked" && hasPin && <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 text-success" />Your saved records are private</p>}
        </section>
      </main>
    );
  }

  return <QueryClientProvider client={queryClient}><Outlet /><Toaster position="top-center" richColors /><button className="fixed right-3 top-3 z-40 grid size-9 place-items-center rounded-full border bg-card text-primary shadow-sm" aria-label="Lock app" title="Lock app" onClick={handleLock}><LockKeyhole className="size-4" /></button><button className="fixed right-14 top-3 z-40 grid size-9 place-items-center rounded-full border bg-card text-primary shadow-sm" aria-label="Change PIN" title="Change PIN" onClick={() => { setChangingPin(true); setGate("locked"); }}><ShieldCheck className="size-4" /></button></QueryClientProvider>;
}