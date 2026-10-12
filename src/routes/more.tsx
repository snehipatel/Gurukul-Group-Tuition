import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Pencil,
  Plus,
  Phone,
  ArchiveRestore,
  Archive,
  Copy,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  DollarSign,
  User,
  GraduationCap,
  Building,
  KeyRound,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { AppShell, Sheet } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLanguage, toGujaratiName, getStudentDisplayName } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import {
  useStore,
  update,
  uid,
  today,
  rupee,
  niceDate,
  type Batch,
  type RecordItem,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "Management & Settings — Gurukul Group Tuition" },
      {
        name: "description",
        content: "Manage Gurukul faculty, batches, timetable, academic records and settings.",
      },
      { property: "og:title", content: "Management — Gurukul" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: More,
});

type Tab = "batches" | "records" | "settings";

function More() {
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const [tab, setTab] = useState<Tab>("batches");

  return (
    <AppShell title={isGu ? "વ્યવસ્થાપન" : "Management"}>
      {/* Top Navigation Tabs */}
      <div className="grid grid-cols-3 rounded-2xl border bg-card p-1 shadow-sm text-xs font-bold">
        {(
          [
            { id: "batches", label: isGu ? "બેચ" : "Batches" },
            { id: "records", label: isGu ? "રેકોર્ડ્સ" : "Records" },
            { id: "settings", label: isGu ? "સેટિંગ્સ" : "Settings" },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-xl py-2 text-[11px] font-bold transition ${
              tab === item.id
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "batches" && <BatchesTab />}
      {tab === "records" && <RecordsTab />}
      {tab === "settings" && <SettingsTab />}
    </AppShell>
  );
}



// ----------------------------------------------------
// 2. BATCH CRUD
// ----------------------------------------------------
function BatchesTab() {
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const s = useStore();
  const [editing, setEditing] = useState<Batch | null>(null);
  const [open, setOpen] = useState(false);
  const [standard, setStandard] = useState("");
  const [archiveTarget, setArchiveTarget] = useState<Batch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Batch | null>(null);

  function startAdd() {
    setEditing(null);
    setStandard("");
    setOpen(true);
  }

  function startEdit(b: Batch) {
    setEditing(b);
    setStandard(b.standard || b.name);
    setOpen(true);
  }

  function save() {
    const trimmed = standard.trim();
    if (!trimmed) {
      toast.error(isGu ? "કૃપા કરીને ધોરણ દાખલ કરો (દા.ત. 10th)." : "Please enter standard (e.g. 10th).");
      return;
    }

    const item: Batch = {
      id: editing?.id ?? uid(),
      name: trimmed,
      standard: trimmed,
      time: editing?.time || "",
      days: editing?.days || "",
      ...(editing?.archived ? { archived: true } : {}),
    };

    update((state) => ({
      ...state,
      batches: editing
        ? state.batches.map((entry) => (entry.id === editing.id ? item : entry))
        : [...state.batches, item],
    }));

    toast.success(
      editing
        ? (isGu ? `ધોરણ ${item.standard} અપડેટ થયું` : `Batch ${item.standard} updated`)
        : (isGu ? `ધોરણ ${item.standard} ઉમેરાયું` : `Batch ${item.standard} added`)
    );
    setOpen(false);
    setEditing(null);
    setStandard("");
  }

  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    const target = archiveTarget;
    update((state) => ({
      ...state,
      batches: state.batches.map((entry) =>
        entry.id === target.id ? { ...entry, archived: !entry.archived } : entry
      ),
    }));
    toast.success(
      target.archived
        ? (isGu ? `બેચ ${target.name} પુનઃસ્થાપિત કરી` : `Batch ${target.name} restored`)
        : (isGu ? `બેચ ${target.name} આર્કાઇવ કરી` : `Batch ${target.name} archived`)
    );
    setArchiveTarget(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    update((state) => ({
      ...state,
      batches: state.batches.filter((entry) => entry.id !== target.id),
    }));
    toast.success(
      isGu
        ? `બેચ ${target.name} કાયમી કાઢી નાખવામાં આવી`
        : `Batch ${target.name} deleted permanently`
    );
    setDeleteTarget(null);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-extrabold text-foreground text-sm">
            {isGu ? "બેચ અને ધોરણ" : "Batches & Standards"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isGu ? "ધોરણ અને ક્લાસ મેનેજ કરો" : "Manage academic standards & classes"}
          </p>
        </div>
        <Button size="sm" onClick={startAdd} className="h-8 gap-1 text-xs font-bold shadow-2xs">
          <Plus className="size-3.5" /> {isGu ? "નવી બેચ" : "Add Batch"}
        </Button>
      </div>

      <div className="space-y-2">
        {s.batches.map((batch) => {
          const studentCount = s.students.filter(
            (x) => x.batchId === batch.id && !x.archived
          ).length;

          return (
            <article
              key={batch.id}
              className={`card flex items-center gap-3 ${
                batch.archived ? "opacity-75 bg-muted/40" : ""
              }`}
            >
              <div className="rounded-2xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-center text-xs font-black text-primary shrink-0">
                {batch.standard}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-foreground text-sm">
                  {isGu ? "ધોરણ" : "Standard"} {batch.standard}
                  {batch.archived && (
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-bold">
                      ({isGu ? "આર્કાઇવ" : "Archived"})
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {studentCount} {isGu ? "વિદ્યાર્થીઓ જોડાયેલા છે" : "students enrolled"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(batch)}
                  aria-label="Edit batch"
                  title={isGu ? "સંપાદિત કરો" : "Edit batch"}
                >
                  <Pencil className="size-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => setArchiveTarget(batch)}
                  aria-label={batch.archived ? "Restore batch" : "Archive batch"}
                  title={
                    batch.archived
                      ? (isGu ? "પુનઃસ્થાપિત કરો" : "Restore batch")
                      : (isGu ? "આર્કાઇવ કરો" : "Archive batch")
                  }
                >
                  {batch.archived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(batch)}
                  aria-label="Delete batch"
                  title={isGu ? "કાયમી કાઢી નાખો" : "Delete batch permanently"}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </article>
          );
        })}

        {!s.batches.length && (
          <div className="card py-12 text-center text-muted-foreground">
            <GraduationCap className="size-8 mx-auto mb-2 opacity-50" />
            <p className="font-bold">{isGu ? "કોઈ બેચ મળ્યા નથી" : "No batches found"}</p>
            <p className="text-xs mt-1">
              {isGu
                ? "નવો બેચ ઉમેરવા માટે ઉપર 'નવી બેચ' બટન દબાવો."
                : "Click 'Add Batch' above to create your first standard."}
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Sheet (ONLY Standard) */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? (isGu ? `બેચ સંપાદિત કરો: ${editing.standard}` : `Edit Batch: ${editing.standard}`)
            : (isGu ? "નવી બેચ ઉમેરો" : "Add New Batch")
        }
      >
        <div className="space-y-4 pb-6">
          <div>
            <label className="label">{isGu ? "ધોરણ (Standard) *" : "Standard *"}</label>
            <input
              className="field font-bold text-base"
              placeholder={isGu ? "દા.ત. 10th અથવા 12th Science" : "e.g. 10th, 9th, 12th Science"}
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {isGu
                ? "ઝડપી પસંદગી માટે નીચેના ધોરણ પર ક્લિક કરો:"
                : "Quick select standard:"}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                "8th",
                "9th",
                "10th",
                "11th Science",
                "11th Commerce",
                "11th Arts",
                "12th Science",
                "12th Commerce",
                "12th Arts",
              ].map((std) => (
                <button
                  key={std}
                  type="button"
                  className={`chip border text-[11px] font-bold transition ${
                    standard === std
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted text-foreground"
                  }`}
                  onClick={() => setStandard(std)}
                >
                  {std}
                </button>
              ))}
            </div>
          </div>

          <Button className="w-full h-12 text-base font-bold shadow-md" onClick={save}>
            {editing
              ? (isGu ? "સાચવો" : "Save Changes")
              : (isGu ? "બેચ ઉમેરો" : "Add Batch")}
          </Button>
        </div>
      </Sheet>

      {/* Archive / Restore Confirm Dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title={
          archiveTarget?.archived
            ? (isGu
                ? `બેચ ${archiveTarget?.name} પુનઃસ્થાપિત કરો?`
                : `Restore Batch ${archiveTarget?.name}?`)
            : (isGu
                ? `બેચ ${archiveTarget?.name} આર્કાઇવ કરો?`
                : `Archive Batch ${archiveTarget?.name}?`)
        }
        description={
          archiveTarget?.archived
            ? (isGu
                ? "આ બેચ ફરીથી સક્રિય લિસ્ટમાં દેખાશે."
                : "This batch will be restored to active schedules.")
            : (isGu
                ? `બેચ ${archiveTarget?.name} આર્કાઇવ થશે. વિદ્યાર્થીઓનો રેકોર્ડ સુરક્ષિત રહેશે.`
                : `Batch ${archiveTarget?.name} will be archived. All student records will remain intact.`)
        }
        confirmLabel={
          archiveTarget?.archived
            ? (isGu ? "પુનઃસ્થાપિત કરો" : "Restore Batch")
            : (isGu ? "આર્કાઇવ કરો" : "Archive Batch")
        }
        variant={archiveTarget?.archived ? "default" : "destructive"}
        onConfirm={handleArchiveConfirm}
      />

      {/* Permanent Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          isGu
            ? `બેચ ${deleteTarget?.name} કાયમી કાઢી નાખો?`
            : `Delete Batch ${deleteTarget?.name}?`
        }
        description={
          isGu
            ? `શું તમે ખરેખર બેચ ${deleteTarget?.name} કાયમી કાઢી નાખવા માંગો છો? આ ક્રિયા પૂર્વવત્ કરી શકાશે નહીં.`
            : `Are you sure you want to permanently delete batch ${deleteTarget?.name}? This action cannot be undone.`
        }
        confirmLabel={isGu ? "કાયમી કાઢી નાખો" : "Delete Batch Permanently"}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </section>
  );
}



// ----------------------------------------------------
// 4. ACADEMIC RECORDS CRUD (Tests, Marks)
// ----------------------------------------------------
type Collection = "tests" | "marks";

function getConfigs(isGu: boolean): {
  key: Collection;
  title: string;
  fields: { key: string; label: string; type?: string; placeholder?: string }[];
}[] {
  return [
    {
      key: "tests",
      title: isGu ? "પરીક્ષાઓ (Tests)" : "Tests & Exams",
      fields: [
        { key: "name", label: isGu ? "પરીક્ષાનું નામ" : "Test Name", placeholder: "e.g. Unit Test 1" },
        { key: "subject", label: isGu ? "વિષય" : "Subject", placeholder: "e.g. Mathematics" },
        { key: "date", label: isGu ? "પરીક્ષા તારીખ" : "Exam Date", type: "date" },
        { key: "batch", label: isGu ? "બેચ" : "Target Batch", placeholder: "e.g. 10-A" },
        { key: "outOf", label: isGu ? "કુલ ગુણ" : "Max Marks", placeholder: "e.g. 50" },
      ],
    },
    {
      key: "marks",
      title: isGu ? "ગુણ પત્રક (Marks)" : "Marks & Scores",
      fields: [
        { key: "student", label: isGu ? "વિદ્યાર્થીનું નામ" : "Student Name", placeholder: "e.g. Rahul Patel" },
        { key: "test", label: isGu ? "પરીક્ષાનું નામ" : "Test Name", placeholder: "e.g. Unit Test 1" },
        { key: "score", label: isGu ? "મેળવેલ ગુણ" : "Marks Scored", placeholder: "e.g. 46" },
        { key: "outOf", label: isGu ? "કુલ ગુણ" : "Total Marks", placeholder: "e.g. 50" },
      ],
    },
  ];
}

function RecordsTab() {
  const s = useStore();
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const configs = getConfigs(isGu);
  const [selected, setSelected] = useState<Collection>("tests");
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [open, setOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<RecordItem | null>(null);

  const config = configs.find((item) => item.key === selected) ?? configs[0]!;
  const records = s[selected] || [];
  const [form, setForm] = useState<Record<string, string>>({});

  function startEdit(item?: RecordItem) {
    setEditing(item ?? null);
    setForm(
      item
        ? Object.fromEntries(
            config.fields.map((field) => [
              field.key,
              String(item[field.key] ?? ""),
            ])
          )
        : Object.fromEntries(
            config.fields.map((field) => [
              field.key,
              field.type === "date" ? today() : "",
            ])
          )
    );
    setOpen(true);
  }

  function save() {
    if (!config.fields.some((field) => form[field.key]?.trim())) {
      toast.error(isGu ? "કૃપા કરીને વિગતો ભરો." : "Please fill in the record details.");
      return;
    }

    let item = {
      ...form,
      id: editing?.id ?? uid(),
      ...(editing?.["archived"] ? { archived: true } : {}),
    } as RecordItem;

    if (selected === "marks") {
      const formStudent = String(form.student || "").trim().toLowerCase();
      const matchedStudent = s.students.find(
        (st) =>
          st.name.toLowerCase() === formStudent ||
          (st.nameGu && st.nameGu.toLowerCase() === formStudent)
      );
      if (matchedStudent) {
        item.studentId = matchedStudent.id;
      }
      const matchedTest = (s.tests || []).find(
        (t) => String(t.name).toLowerCase() === String(form.test || "").trim().toLowerCase()
      );
      if (matchedTest) {
        item.testId = matchedTest.id;
      }
    }

    update((state) => ({
      ...state,
      [selected]: editing
        ? (state[selected] || []).map((entry) =>
            entry.id === editing.id ? item : entry
          )
        : [...(state[selected] || []), item],
    }));

    toast.success(editing ? (isGu ? "રેકોર્ડ સુધારવામાં આવ્યો" : "Record updated") : (isGu ? "રેકોર્ડ ઉમેરાયો" : "Record added"));
    setOpen(false);
    setEditing(null);
  }

  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    const target = archiveTarget;
    update((state) => ({
      ...state,
      [selected]: (state[selected] || []).map((entry) =>
        entry.id === target.id
          ? { ...entry, archived: !entry["archived"] }
          : entry
      ),
    }));
    toast.success(
      target["archived"]
        ? (isGu ? "રેકોર્ડ પુનઃસ્થાપિત થયો" : "Record restored")
        : (isGu ? "રેકોર્ડ સંગ્રહિત થયો" : "Record archived safely")
    );
    setArchiveTarget(null);
  }

  return (
    <section className="space-y-3">
      {/* Category selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
        {configs.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`chip shrink-0 px-3 py-1.5 font-bold transition ${
              selected === item.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border text-muted-foreground"
            }`}
            onClick={() => {
              setSelected(item.key);
              setEditing(null);
            }}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-extrabold text-foreground text-sm">
            {config.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {records.length} {isGu ? "નોંધાયેલ રેકોર્ડ" : "items logged"}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => startEdit()}
          className="h-8 gap-1 text-xs font-bold"
        >
          <Plus className="size-3.5" /> {isGu ? "+ નવું ઉમેરો" : `Add ${config.title.split(" ")[0]}`}
        </Button>
      </div>

      {/* Record list */}
      <div className="space-y-2">
        {records.map((item) => {
          const titleField =
            config.fields.find((f) =>
              ["name", "student", "faculty"].includes(f.key)
            ) ?? config.fields[0]!;

          return (
            <article
              key={item.id}
              className={`card flex items-center justify-between gap-2 ${
                item["archived"] ? "opacity-75 bg-muted/40" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold text-foreground text-sm">
                  {selected === "marks" && isGu
                    ? toGujaratiName(String(item[titleField.key] ?? "Record"))
                    : String(item[titleField.key] ?? "Record")}
                  {item["archived"] && (
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-bold">
                      ({isGu ? "સંગ્રહિત" : "Archived"})
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {config.fields
                    .filter((f) => f.key !== titleField.key)
                    .map((f) => {
                      const val = item[f.key];
                      if (!val) return null;
                      if (f.label.includes("Amount") || f.label.includes("Fee") || f.label.includes("રકમ")) {
                        return `${f.label}: ${rupee(Number(val))}`;
                      }
                      return `${f.label}: ${val}`;
                    })
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={() => startEdit(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setArchiveTarget(item)}
                >
                  {item["archived"] ? (
                    <ArchiveRestore className="size-3.5" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}
                </Button>
              </div>
            </article>
          );
        })}

        {!records.length && (
          <div className="card py-12 text-center text-muted-foreground">
            <p className="font-bold text-foreground">
              {isGu ? `હજુ સુધી કોઈ રેકોર્ડ નોંધાયેલ નથી` : `No ${config.title.toLowerCase()} recorded yet`}
            </p>
            <p className="text-xs">{isGu ? "નવો રેકોર્ડ ઉમેરવા ઉપર આપેલ બટન દબાવો." : "Tap Add above to log an entry."}</p>
          </div>
        )}
      </div>

      {/* Add / Edit Sheet */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`${editing ? (isGu ? "સુધારો" : "Edit") : (isGu ? "ઉમેરો" : "Add")} ${config.title}`}
      >
        <div className="space-y-3 pb-6">
          {config.fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                className="field font-semibold"
                type={f.type || "text"}
                placeholder={f.placeholder}
                list={
                  f.key === "student" && selected === "marks"
                    ? "more-students-list"
                    : f.key === "test" && selected === "marks"
                    ? "more-tests-list"
                    : undefined
                }
                value={form[f.key] ?? ""}
                inputMode={
                  f.label.includes("Amount") ||
                  f.label.includes("Fee") ||
                  f.label.includes("રકમ") ||
                  f.key === "score" ||
                  f.key === "outOf"
                    ? "numeric"
                    : undefined
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (f.key === "test" && selected === "marks") {
                    const matchedTest = (s.tests || []).find((t) => t.name === val);
                    setForm({
                      ...form,
                      test: val,
                      outOf: matchedTest?.outOf ? String(matchedTest.outOf) : form.outOf || "50",
                    });
                  } else {
                    setForm({ ...form, [f.key]: val });
                  }
                }}
              />
            </div>
          ))}

          <datalist id="more-students-list">
            {s.students.filter((st) => !st.archived).map((st) => (
              <option key={st.id} value={isGu ? (st.nameGu || toGujaratiName(st.name)) : st.name} />
            ))}
          </datalist>

          <datalist id="more-tests-list">
            {(s.tests || []).map((t) => (
              <option key={t.id} value={String(t.name)} />
            ))}
          </datalist>

          <Button className="w-full h-12 text-base font-bold" onClick={save}>
            {isGu ? "રેકોર્ડ સાચવો" : "Save Record"}
          </Button>
        </div>
      </Sheet>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(op) => !op && setArchiveTarget(null)}
        title={
          archiveTarget?.["archived"]
            ? (isGu ? "રેકોર્ડ પુનઃસ્થાપિત કરવો છે?" : "Restore record?")
            : (isGu ? "રેકોર્ડ આર્કાઇવ કરવો છે?" : "Archive record?")
        }
        description={
          archiveTarget?.["archived"]
            ? (isGu ? "આ રેકોર્ડ ફરીથી સક્રિય યાદીમાં દેખાશે." : "This record will be restored to active view.")
            : (isGu ? "આ રેકોર્ડ સુરક્ષિત રીતે સંગ્રહિત થશે અને હિસાબ સચવાશે." : "This record will be moved to archives, preserving full audit history.")
        }
        confirmLabel={archiveTarget?.["archived"] ? (isGu ? "પુનઃસ્થાપિત કરો" : "Restore") : (isGu ? "આર્કાઇવ કરો" : "Archive")}
        variant={archiveTarget?.["archived"] ? "default" : "destructive"}
        onConfirm={handleArchiveConfirm}
      />
    </section>
  );
}

// ----------------------------------------------------
// 5. SETTINGS TAB
// ----------------------------------------------------
function SettingsTab() {
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const { lockApp, updatePin } = useAuth();
  const s = useStore();
  const [form, setForm] = useState(s.settings);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);

  async function handleSavePin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(newPin)) {
      toast.error(isGu ? "પિન ૪ થી ૮ અંકોનો હોવો જોઈએ." : "PIN must be 4 to 8 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error(isGu ? "પિન મેળ ખાતા નથી." : "PINs do not match.");
      return;
    }
    setPinSubmitting(true);
    try {
      const res = await updatePin(newPin);
      if (res.ok) {
        toast.success(isGu ? "ઓનર પિન સફળતાપૂર્વક બદલાઈ ગયો!" : "Owner PIN updated successfully!");
        setNewPin("");
        setConfirmPin("");
        setChangePinOpen(false);
      } else {
        toast.error(res.message || (isGu ? "પિન બદલવામાં ભૂલ આવી." : "Failed to update PIN."));
      }
    } catch {
      toast.error(isGu ? "પિન બદલવામાં ભૂલ આવી." : "Failed to update PIN.");
    } finally {
      setPinSubmitting(false);
    }
  }

  async function handleConfirmLock() {
    toast.info(isGu ? "પોર્ટલ લોક થઈ રહ્યું છે..." : "Locking portal...");
    await lockApp();
  }

  return (
    <section className="space-y-4">
      {/* Security & Owner Access */}
      <div className="card space-y-3 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              {isGu ? "સુરક્ષા અને ઓનર પિન" : "Security & Owner Access"}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isGu
                ? "ઓનર પિન સુરક્ષા, પિન બદલો અથવા પોર્ટલ લોક / લોગ આઉટ કરો."
                : "Owner PIN security, change passcode or lock/logout the portal."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="h-11 font-bold text-xs flex items-center justify-center gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-foreground shadow-sm"
            onClick={() => {
              setNewPin("");
              setConfirmPin("");
              setChangePinOpen(true);
            }}
          >
            <KeyRound className="size-4 text-primary" />
            {isGu ? "ઓનર પિન બદલો" : "Change Owner PIN"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-11 font-bold text-xs flex items-center justify-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 shadow-sm"
            onClick={() => setLockConfirmOpen(true)}
          >
            <LogOut className="size-4 text-destructive" />
            {isGu ? "લોગ આઉટ / લોક કરો" : "Lock App / Log Out"}
          </Button>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-extrabold text-foreground text-sm border-b pb-2">
          Gurukul Institute Profile (On Receipts)
        </h3>
        <div>
          <label className="label">Institute Name</label>
          <input
            className="field font-bold"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Official Address</label>
          <input
            className="field"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Official Phone</label>
          <input
            className="field"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>

      <div className="card space-y-2">
        <h3 className="font-extrabold text-foreground text-sm border-b pb-2">
          WhatsApp Absentee Message Template
        </h3>
        <textarea
          className="field min-h-36 py-2.5 text-xs font-mono leading-relaxed"
          value={form.waTemplate}
          onChange={(e) => setForm({ ...form, waTemplate: e.target.value })}
        />
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            "{DATE}",
            "{BATCH}",
            "{STANDARD}",
            "{ABSENT_STUDENTS}",
            "{PRESENT_COUNT}",
            "{ABSENT_COUNT}",
            "{FACULTY}",
          ].map((token) => (
            <button
              key={token}
              type="button"
              className="chip border bg-muted/60 text-[10px] font-bold hover:bg-muted"
              onClick={() =>
                setForm({ ...form, waTemplate: form.waTemplate + " " + token })
              }
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      <Button
        className="w-full h-12 text-base font-bold shadow-md"
        onClick={() => {
          update((state) => ({ ...state, settings: form }));
          toast.success("Settings saved successfully!");
        }}
      >
        Save Settings
      </Button>

      {/* Change PIN Sheet */}
      <Sheet
        open={changePinOpen}
        onClose={() => setChangePinOpen(false)}
        title={isGu ? "ઓનર પિન બદલો" : "Change Owner PIN"}
      >
        <form onSubmit={handleSavePin} className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {isGu
              ? "તમારા વિદ્યાર્થીઓ અને ફી રેકોર્ડ્સને સુરક્ષિત રાખવા માટે ૪ થી ૮ અંકોનો નવો પિન દાખલ કરો."
              : "Enter a new 4 to 8 digit number to keep your student and fee records private."}
          </p>

          <div>
            <label className="label">{isGu ? "નવો પિન" : "New PIN"}</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              maxLength={8}
              minLength={4}
              required
              className="field text-center text-2xl font-bold tracking-[0.3em]"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </div>

          <div>
            <label className="label">{isGu ? "કન્ફર્મ પિન" : "Confirm PIN"}</label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              maxLength={8}
              minLength={4}
              required
              className="field text-center text-2xl font-bold tracking-[0.3em]"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setChangePinOpen(false)}
            >
              {isGu ? "રદ કરો" : "Cancel"}
            </Button>
            <Button
              type="submit"
              className="flex-1 font-bold"
              disabled={pinSubmitting}
            >
              {pinSubmitting
                ? (isGu ? "સાચવી રહ્યું છે…" : "Saving…")
                : (isGu ? "પિન સાચવો" : "Save New PIN")}
            </Button>
          </div>
        </form>
      </Sheet>

      {/* Lock Confirmation Dialog */}
      <ConfirmDialog
        open={lockConfirmOpen}
        onClose={() => setLockConfirmOpen(false)}
        title={isGu ? "પોર્ટલ લોક / લોગ આઉટ કરો?" : "Lock App / Log Out?"}
        description={
          isGu
            ? "તમારું સેશન લોક થઈ જશે. ફરીથી ખોલવા માટે તમારે તમારો ઓનર પિન દાખલ કરવો પડશે."
            : "Your session will be locked. You will need to enter your owner PIN to reopen the portal."
        }
        confirmLabel={isGu ? "લોક કરો" : "Lock App"}
        variant="destructive"
        onConfirm={handleConfirmLock}
      />
    </section>
  );
}