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
} from "lucide-react";
import { AppShell, Sheet } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLanguage, toGujaratiName, getStudentDisplayName } from "@/lib/i18n";
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
  const s = useStore();
  const [editing, setEditing] = useState<Batch | null>(null);
  const [open, setOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Batch | null>(null);

  const empty = {
    name: "",
    standard: "10th",
    time: "4:00 PM",
    days: "Mon–Sat",
    subjects: "",
    classroom: "Room 1",
    capacity: "25",
  };
  const [form, setForm] = useState(empty);

  function startAdd() {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  }

  function startEdit(b: Batch) {
    setEditing(b);
    setForm({
      name: b.name,
      standard: b.standard,
      time: b.time,
      days: b.days,
      subjects: b.subjects || "",
      classroom: b.classroom || "Room 1",
      capacity: String(b.capacity || 25),
    });
    setOpen(true);
  }

  function save() {
    if (!form.name.trim()) {
      toast.error("Please enter a batch name (e.g. 10-A).");
      return;
    }

    const item: Batch = {
      id: editing?.id ?? uid(),
      name: form.name.trim(),
      standard: form.standard.trim(),
      time: form.time.trim(),
      days: form.days.trim(),
      subjects: form.subjects.trim(),
      classroom: form.classroom.trim(),
      capacity: Number(form.capacity) || 25,
      ...(editing?.archived ? { archived: true } : {}),
    };

    update((state) => ({
      ...state,
      batches: editing
        ? state.batches.map((entry) => (entry.id === editing.id ? item : entry))
        : [...state.batches, item],
    }));

    toast.success(editing ? `Batch ${item.name} updated` : `Batch ${item.name} added`);
    setOpen(false);
    setEditing(null);
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
        ? `Batch ${target.name} restored`
        : `Batch ${target.name} archived`
    );
    setArchiveTarget(null);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-extrabold text-foreground text-sm">
            Batches & Classes
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage standards, timings and classrooms
          </p>
        </div>
        <Button size="sm" onClick={startAdd} className="h-8 gap-1 text-xs font-bold">
          <Plus className="size-3.5" /> Add Batch
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
              <div className="rounded-2xl bg-secondary px-3 py-2 text-center text-xs font-black text-primary shrink-0">
                {batch.time || "—"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-foreground text-sm">
                  Batch {batch.name} · {batch.standard}
                  {batch.archived && (
                    <span className="text-[10px] text-muted-foreground ml-1.5 font-bold">
                      (Archived)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {batch.days}
                  {batch.subjects ? ` · ${batch.subjects}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {studentCount} students enrolled
                  {batch.classroom ? ` · ${batch.classroom}` : ""}
                </p>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => startEdit(batch)}
                aria-label="Edit batch"
              >
                <Pencil className="size-4" />
              </Button>

              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-destructive hover:bg-destructive/10"
                onClick={() => setArchiveTarget(batch)}
                aria-label="Archive batch"
              >
                {batch.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              </Button>
            </article>
          );
        })}
      </div>

      {/* Add / Edit Sheet */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit Batch ${editing.name}` : "Add New Batch"}
      >
        <div className="space-y-3 pb-6">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Batch Name *</label>
              <input
                className="field font-bold"
                placeholder="e.g. 10-A"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Standard</label>
              <input
                className="field"
                placeholder="e.g. 10th"
                value={form.standard}
                onChange={(e) => setForm({ ...form, standard: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Time</label>
              <input
                className="field"
                placeholder="e.g. 4:00 PM"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Days Schedule</label>
              <input
                className="field"
                placeholder="e.g. Mon–Sat"
                value={form.days}
                onChange={(e) => setForm({ ...form, days: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Classroom / Room</label>
              <input
                className="field"
                placeholder="e.g. Room 1"
                value={form.classroom}
                onChange={(e) => setForm({ ...form, classroom: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input
                className="field"
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) =>
                  setForm({
                    ...form,
                    capacity: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Subjects</label>
            <input
              className="field"
              placeholder="e.g. Mathematics, Science"
              value={form.subjects}
              onChange={(e) => setForm({ ...form, subjects: e.target.value })}
            />
          </div>

          <Button className="w-full h-12 text-base font-bold" onClick={save}>
            {editing ? "Save Batch Changes" : "Add Batch"}
          </Button>
        </div>
      </Sheet>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(op) => !op && setArchiveTarget(null)}
        title={
          archiveTarget?.archived
            ? `Restore Batch ${archiveTarget?.name}?`
            : `Archive Batch ${archiveTarget?.name}?`
        }
        description={
          archiveTarget?.archived
            ? `This batch will be restored to active schedules.`
            : `Batch ${archiveTarget?.name} will be archived. All student histories associated with it will remain intact.`
        }
        confirmLabel={archiveTarget?.archived ? "Restore Batch" : "Archive Batch"}
        variant={archiveTarget?.archived ? "default" : "destructive"}
        onConfirm={handleArchiveConfirm}
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
  const s = useStore();
  const [form, setForm] = useState(s.settings);

  return (
    <section className="space-y-4">
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
    </section>
  );
}