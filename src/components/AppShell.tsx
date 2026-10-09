import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Users, CheckSquare, Wallet, Menu, ChevronLeft, Globe } from "lucide-react";
import logo from "@/assets/gurukul-logo.png";
import { useLanguage, translate, toGujaratiName } from "@/lib/i18n";

const tabs = [
  { to: "/", labelKey: "nav.home", defaultLabel: "Home", icon: Home },
  { to: "/students", labelKey: "nav.students", defaultLabel: "Students", icon: Users },
  { to: "/attendance", labelKey: "nav.attendance", defaultLabel: "Attendance", icon: CheckSquare },
  { to: "/fees", labelKey: "nav.fees", defaultLabel: "Fees", icon: Wallet },
  { to: "/more", labelKey: "nav.more", defaultLabel: "More", icon: Menu },
] as const;

export function AppShell({ title, back, children, action }: { title: string; back?: boolean; children: ReactNode; action?: ReactNode }) {
  const { lang, setLang } = useLanguage();

  const titleGujarati: Record<string, string> = {
    Gurukul: "ગુરૂકુલ",
    Students: "વિદ્યાર્થીઓ",
    Attendance: "દૈનિક હાજરી",
    "Fee Receipts": "ફી પહોંચ",
    Management: "વ્યવસ્થાપન",
    Student: "વિદ્યાર્થી",
  };

  const displayTitle =
    lang === "gu"
      ? titleGujarati[title] || toGujaratiName(title)
      : title;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24 shadow-xl print:max-w-none print:w-full print:m-0 print:p-0 print:pb-0 print:shadow-none print:bg-white">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-primary px-4 py-3 text-primary-foreground print:hidden">
        {back && (
          <button onClick={() => history.back()} aria-label="Back" className="-ml-2 rounded-full p-1">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img src={logo} alt="Gurukul Group Tuition" className="size-10 rounded-md bg-card object-contain p-0.5" />
        <h1 className="flex-1 text-xl font-bold truncate">{displayTitle}</h1>
        
        {/* Language Switch Toggle: EN / GU */}
        <button
          type="button"
          onClick={() => setLang(lang === "en" ? "gu" : "en")}
          className="flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-black text-primary-foreground transition hover:bg-primary-foreground/25 active:scale-95 border border-primary-foreground/25 shrink-0"
          title={lang === "en" ? "Switch to Gujarati (ગુજરાતી)" : "Switch to English"}
          aria-label="Toggle language"
        >
          <Globe className="size-3.5 opacity-80" />
          <span className={lang === "en" ? "text-amber-300 font-extrabold underline underline-offset-2" : "opacity-70"}>
            EN
          </span>
          <span className="opacity-40">/</span>
          <span className={lang === "gu" ? "text-amber-300 font-extrabold underline underline-offset-2" : "opacity-70"}>
            GU
          </span>
        </button>

        {action}
      </header>
      <main className="space-y-4 p-4 print:p-0 print:m-0 print:space-y-0 print:max-w-none print:w-full">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] print:hidden">
        {tabs.map(({ to, labelKey, defaultLabel, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-0.5 py-2 text-xs font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary font-bold" }}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] leading-tight truncate max-w-full px-1">
              {translate(labelKey, defaultLabel, lang)}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background p-5 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
