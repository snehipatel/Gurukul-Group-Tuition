import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, CheckSquare, IndianRupee, AlertTriangle, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, today, thisMonth, rupee, pendingFor, attendancePct, niceDate } from "@/lib/store";
import { useLanguage, formatGujaratiDate, getStudentDisplayName } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gurukul — Today" },
      { name: "description", content: "Owner's daily overview of Gurukul Group Tuition: attendance, classes and fees." },
      { property: "og:title", content: "Gurukul — Today" },
      { property: "og:description", content: "Owner's daily overview of Gurukul Group Tuition." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const s = useStore();
  const { lang, t: translate } = useLanguage();
  const isGu = lang === "gu";
  const t = today();
  const active = s.students.filter((x) => !x.archived);
  const recs = s.attendance.filter((r) => r.date === t);
  const present = recs.reduce((a, r) => a + r.present.length, 0);
  const absent = recs.reduce((a, r) => a + r.absent.length, 0);
  const fa = s.facultyAttendance[t] ?? {};
  const facPresent = Object.values(fa).filter((v) => v === "P").length;
  const collectedToday = s.payments.filter((p) => p.date === t && !p.voided && !p.archived).reduce((a, p) => a + p.amount, 0);
  const collectedMonth = s.payments.filter((p) => p.month === thisMonth() && !p.voided && !p.archived).reduce((a, p) => a + p.amount, 0);
  const pending = active.reduce((a, st) => a + pendingFor(s, st), 0);
  const pendingCount = active.filter((st) => pendingFor(s, st) > 0).length;
  const lowAtt = active.filter((st) => { const p = attendancePct(s, st.id); return p !== null && p < 75; });
  const unmarked = s.batches.filter((b) => !recs.some((r) => r.batchId === b.id));

  return (
    <AppShell title={isGu ? "ગુરુકુળ" : "Gurukul"}>
      <div>
        <p className="text-sm text-muted-foreground">{isGu ? formatGujaratiDate(t) : niceDate(t)}</p>
        <h2 className="text-2xl font-extrabold">{isGu ? "નમસ્તે 🙏" : "Namaste 🙏"}</h2>
      </div>

      <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg">
        <p className="text-sm opacity-80">{isGu ? "આ મહિને જમા થયેલ ફી" : "Collected this month"}</p>
        <p className="text-4xl font-extrabold">{rupee(collectedMonth)}</p>
        <div className="mt-3 flex justify-between text-sm border-t border-primary-foreground/20 pt-2">
          <span>{isGu ? "આજે મળેલ:" : "Today:"} <b>{rupee(collectedToday)}</b></span>
          <span>{isGu ? "કુલ બાકી ફી:" : "Pending:"} <b className="text-amber-300">{rupee(pending)}</b></span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={isGu ? "હાજર વિદ્યાર્થીઓ" : "Students present"}
          value={recs.length ? `${present}/${present + absent}` : "—"}
          sub={isGu ? `કુલ ${active.length} વિદ્યાર્થી` : `${active.length} total`}
        />
        <Stat
          label={isGu ? "હાજર શિક્ષકો" : "Faculty present"}
          value={Object.keys(fa).length ? `${facPresent}/${s.faculty.length}` : "—"}
          sub={isGu ? "હાજરી વિભાગમાં નોંધો" : "Mark in Attendance"}
        />
        <Stat
          label={isGu ? "આજના બેચ" : "Classes today"}
          value={String(s.batches.length)}
          sub={isGu ? `${unmarked.length} બાકી` : `${unmarked.length} not marked`}
        />
        <Stat
          label={isGu ? "બાકી ફી વાળા વિદ્યાર્થી" : "Fees pending"}
          value={String(pendingCount)}
          sub={isGu ? "વિદ્યાર્થીઓ" : "students"}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Quick to="/students" icon={UserPlus} label={isGu ? "વિદ્યાર્થી ઉમેરો" : "Add Student"} />
        <Quick to="/attendance" icon={CheckSquare} label={isGu ? "હાજરી પૂરો" : "Attendance"} />
        <Quick to="/fees" icon={FileText} label={isGu ? "ફી પહોંચ" : "Fee Receipt"} />
      </div>

      {(unmarked.length > 0 || pendingCount > 0 || lowAtt.length > 0) && (
        <div className="card space-y-2 border-warning/40 bg-warning-soft">
          <p className="flex items-center gap-2 font-bold text-foreground">
            <AlertTriangle className="h-5 w-5 text-warning" />
            {isGu ? "ધ્યાન આપવાની જરૂર છે" : "Needs your attention"}
          </p>
          {unmarked.length > 0 && (
            <p className="text-sm">
              • {isGu ? `હાજરી બાકી છે: ${unmarked.map((b) => b.name).join(", ")}` : `Attendance not marked: ${unmarked.map((b) => b.name).join(", ")}`}
            </p>
          )}
          {pendingCount > 0 && (
            <p className="text-sm">
              • {isGu ? `${pendingCount} વિદ્યાર્થીઓની ફી બાકી છે (${rupee(pending)})` : `${pendingCount} students have fees pending (${rupee(pending)})`}
            </p>
          )}
          {lowAtt.map((st) => (
            <p key={st.id} className="text-sm">
              • {isGu ? `${getStudentDisplayName(st, "gu")} ની હાજરી ૭૫% થી ઓછી છે` : `${st.name} attendance below 75%`}
            </p>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function Quick({ to, icon: Icon, label }: { to: "/students" | "/attendance" | "/fees"; icon: typeof UserPlus; label: string }) {
  return (
    <Link to={to} className="card flex flex-col items-center gap-2 p-3 text-center text-xs font-bold active:scale-95 shadow-sm hover:border-primary/40 transition">
      <span className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-6 w-6" /></span>
      {label}
    </Link>
  );
}
