import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, ArchiveRestore, UserPlus, IndianRupee } from "lucide-react";
import { AppShell, Sheet } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useLanguage, translate, getStudentDisplayName, toGujaratiName } from "@/lib/i18n";
import {
  useStore,
  update,
  uid,
  today,
  pendingFor,
  attendancePct,
  studentTotalFee,
  totalPaid,
  rupee,
  formatStudentId,
  type Student,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Students — Gurukul Group Tuition" },
      {
        name: "description",
        content: "All Gurukul students with attendance, profile and fee status.",
      },
      { property: "og:title", content: "Students — Gurukul" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Students,
});

function Students() {
  const s = useStore();
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const [q, setQ] = useState("");
  const [batch, setBatch] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const list = s.students.filter((x) => {
    if (!!x.archived !== showArchived) return false;
    if (batch !== "all" && x.batchId !== batch) return false;
    const query = q.toLowerCase();
    const guName = getStudentDisplayName(x, "gu").toLowerCase();
    const enName = x.name.toLowerCase();
    return (
      enName.includes(query) ||
      guName.includes(query) ||
      x.phone.includes(q) ||
      x.parentPhone.includes(q) ||
      formatStudentId(x).toLowerCase().includes(query)
    );
  });

  return (
    <AppShell
      title={isGu ? "વિદ્યાર્થીઓ" : "Students"}
      action={
        <Button
          size="icon"
          className="size-10 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
          onClick={() => setAddOpen(true)}
          aria-label="Add student"
        >
          <Plus className="size-5" />
        </Button>
      }
    >
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
        <input
          className="field pl-10 text-sm"
          placeholder={
            isGu
              ? "વિદ્યાર્થીનું નામ, ID અથવા ફોન નંબરથી શોધો..."
              : "Search by name, student ID or phone..."
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Batch Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        {[{ id: "all", name: isGu ? "બધી બેચ" : "All Batches" }, ...s.batches].map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBatch(b.id)}
            className={`chip shrink-0 px-3.5 py-1.5 font-bold transition ${
              batch === b.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border text-muted-foreground"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {/* Active vs Archived Toggle */}
      <div className="flex items-center justify-between text-xs font-semibold px-1">
        <span className="text-muted-foreground">
          {isGu ? "કુલ" : "Showing"} {list.length} {showArchived ? (isGu ? "આર્કાઇવ કરેલ" : "archived") : (isGu ? "સક્રિય વિદ્યાર્થીઓ" : "active students")}
        </span>
        <button
          type="button"
          className="text-primary font-bold hover:underline"
          onClick={() => setShowArchived((v) => !v)}
        >
          {showArchived
            ? (isGu ? "← સક્રિય વિદ્યાર્થીઓ જુઓ" : "← Show active students")
            : (isGu ? "આર્કાઇવ વિદ્યાર્થીઓ જુઓ →" : "View archived students →")}
        </button>
      </div>

      {/* Students List */}
      <div className="space-y-2.5">
        {list.map((st) => {
          const totalFee = studentTotalFee(st);
          const paid = totalPaid(s, st.id);
          const pend = pendingFor(s, st);
          const att = attendancePct(s, st.id);
          const batchInfo = s.batches.find((b) => b.id === st.batchId);
          const formattedId = formatStudentId(st);
          const feePct =
            totalFee > 0
              ? Math.min(100, Math.round((paid / totalFee) * 100))
              : 100;

          return (
            <div
              key={st.id}
              className={`card space-y-2 transition hover:border-primary/40 ${
                st.archived ? "opacity-75 bg-muted/40" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Link
                  to="/students/$id"
                  params={{ id: st.id }}
                  className="flex items-center gap-3 min-w-0 flex-1 text-left"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-base font-black text-primary shadow-xs">
                    {getStudentDisplayName(st, lang).slice(0, 1) || st.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-foreground truncate text-sm">
                        {getStudentDisplayName(st, lang)}
                      </p>
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {formattedId}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {batchInfo?.standard || st.standard || "10th"} · Batch{" "}
                      {batchInfo?.name || "—"}
                      {att !== null ? ` · ${isGu ? "હાજરી" : "Att"}: ${att}%` : ""}
                    </p>
                  </div>
                </Link>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`chip ${
                      st.archived
                        ? "bg-muted text-muted-foreground"
                        : pend > 0
                        ? "bg-danger-soft text-destructive font-black"
                        : "bg-success-soft text-success font-black"
                    }`}
                  >
                    {st.archived
                      ? isGu ? "આર્કાઇવ" : "Archived"
                      : pend > 0
                      ? isGu ? `${rupee(pend)} બાકી` : `${rupee(pend)} due`
                      : isGu ? "પૂર્ણ ચૂકતે" : "Paid in Full"}
                  </span>

                  {st.archived && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-bold"
                      onClick={() => {
                        update((state) => ({
                          ...state,
                          students: state.students.map((x) =>
                            x.id === st.id ? { ...x, archived: false } : x
                          ),
                        }));
                        toast.success(
                          isGu
                            ? `${getStudentDisplayName(st, "gu")} સક્રિય યાદીમાં ઉમેરાયા`
                            : `${st.name} restored to active list`
                        );
                      }}
                    >
                      <ArchiveRestore className="size-3.5 mr-1" /> Restore
                    </Button>
                  )}
                </div>
              </div>

              {/* Total Fee Paid Till Date Indicator Bar */}
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {isGu ? "અત્યાર સુધી ભરેલ ફી:" : "Paid Till Date:"}{" "}
                    <b className="text-success font-black">{rupee(paid)}</b>
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      / {rupee(totalFee)}
                    </span>
                  </span>
                  <span className="font-black text-[11px] text-foreground">
                    {feePct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{ width: `${feePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {!list.length && (
          <div className="card py-12 text-center text-muted-foreground">
            <UserPlus className="mx-auto size-10 opacity-30" />
            <p className="mt-2 font-bold text-foreground">No students found</p>
            <p className="text-xs">
              {q
                ? "Try searching with a different name or phone."
                : "Click the + button above to add a new student."}
            </p>
          </div>
        )}
      </div>

      {/* ADD STUDENT SHEET */}
      <AddStudentSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </AppShell>
  );
}

function AddStudentSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const s = useStore();
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const [f, setF] = useState({
    name: "",
    phone: "",
    parentPhone: "",
    batchId: s.batches[0]?.id || "",
    standard: "10th",
    school: "",
    monthlyFee: "2500",
    totalFee: "30000",
    dueDate: "",
    address: "",
    notes: "",
  });

  const save = () => {
    if (!f.name.trim() || !f.batchId) {
      toast.error(isGu ? "કૃપા કરીને વિદ્યાર્થીનું નામ અને બેચ પસંદ કરો." : "Please enter student name and choose a batch.");
      return;
    }

    const selectedBatch = s.batches.find((b) => b.id === f.batchId);
    const mFee = Number(f.monthlyFee) || 0;
    const tFee = Number(f.totalFee) || (mFee > 0 ? mFee * 12 : 30000);

    const newStudent: Student = {
      id: uid(),
      name: f.name.trim(),
      nameGu: toGujaratiName(f.name.trim()),
      phone: f.phone.trim(),
      parentPhone: f.parentPhone.trim(),
      batchId: f.batchId,
      standard: f.standard.trim() || selectedBatch?.standard || "10th",
      school: f.school.trim(),
      address: f.address.trim(),
      notes: f.notes.trim(),
      monthlyFee: mFee,
      totalFee: tFee,
      dueDate: f.dueDate || undefined,
      joined: today(),
    };

    update((state) => ({
      ...state,
      students: [...state.students, newStudent],
    }));

    toast.success(`${getStudentDisplayName(newStudent, lang)} ${isGu ? "સફળતાપૂર્વક ઉમેરાયા!" : "added successfully!"}`);
    setF({
      name: "",
      phone: "",
      parentPhone: "",
      batchId: s.batches[0]?.id || "",
      standard: "10th",
      school: "",
      monthlyFee: "2500",
      totalFee: "30000",
      dueDate: "",
      address: "",
      notes: "",
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={isGu ? "નવો વિદ્યાર્થી ઉમેરો" : "Add New Student"}>
      <div className="space-y-3 pb-6">
        <div>
          <label className="label">{isGu ? "વિદ્યાર્થીનું પૂરું નામ" : "Student Name"} *</label>
          <input
            className="field font-bold"
            placeholder={isGu ? "દા.ત. રાહુલ પટેલ" : "e.g. Rahul Patel"}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{isGu ? "વિદ્યાર્થી ફોન" : "Student Phone"}</label>
            <input
              className="field"
              inputMode="tel"
              placeholder="e.g. 9825010001"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{isGu ? "વાલીનો ફોન" : "Parent Phone"}</label>
            <input
              className="field"
              inputMode="tel"
              placeholder="e.g. 9898020001"
              value={f.parentPhone}
              onChange={(e) => setF({ ...f, parentPhone: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{isGu ? "ધોરણ" : "Standard"}</label>
            <input
              className="field"
              placeholder="e.g. 10th"
              value={f.standard}
              onChange={(e) => setF({ ...f, standard: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{isGu ? "બેચ" : "Batch"} *</label>
            <select
              className="field"
              value={f.batchId}
              onChange={(e) => {
                const b = s.batches.find((item) => item.id === e.target.value);
                setF({
                  ...f,
                  batchId: e.target.value,
                  standard: b?.standard || f.standard,
                });
              }}
            >
              {s.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.standard})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">{isGu ? "શાળાનું નામ" : "School"}</label>
          <input
            className="field"
            placeholder={isGu ? "દા.ત. શ્રી વિદ્યાલય" : "e.g. Shree Vidhyalaya"}
            value={f.school}
            onChange={(e) => setF({ ...f, school: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">{isGu ? "માસિક અંદાજ (₹)" : "Monthly Fee (₹)"}</label>
            <input
              className="field"
              inputMode="numeric"
              value={f.monthlyFee}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setF({
                  ...f,
                  monthlyFee: val,
                  totalFee: val ? String(Number(val) * 12) : f.totalFee,
                });
              }}
            />
          </div>
          <div>
            <label className="label">{isGu ? "કુલ શૈક્ષણિક ફી (₹)" : "Total Course Fee (₹)"}</label>
            <input
              className="field font-bold"
              inputMode="numeric"
              value={f.totalFee}
              onChange={(e) =>
                setF({ ...f, totalFee: e.target.value.replace(/\D/g, "") })
              }
            />
          </div>
        </div>

        <div>
          <label className="label">{isGu ? "નિયત ચુકવણી તારીખ" : "Fee Due Date"}</label>
          <input
            className="field"
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </div>

        <div>
          <label className="label">{isGu ? "સરનામું (વૈકલ્પિક)" : "Address (Optional)"}</label>
          <input
            className="field"
            placeholder={isGu ? "દા.ત. નિકોલ, અમદાવાદ" : "e.g. Nikol, Ahmedabad"}
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
          />
        </div>

        <Button
          className="w-full h-12 text-base font-black tracking-wide"
          onClick={save}
        >
          {isGu ? "વિદ્યાર્થી ઉમેરો" : "ADD STUDENT"}
        </Button>
      </div>
    </Sheet>
  );
}
