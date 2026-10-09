import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2,
  MessageCircle,
  Copy,
  Calendar,
  Users,
  Check,
  X,
  Clock,
  ArrowLeft,
  Plus,
  Pencil,
  Phone,
  Archive,
  ArchiveRestore,
  FileText,
  UserCheck,
  IndianRupee,
} from "lucide-react";
import { AppShell, Sheet } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FacultyReportModal } from "@/components/FacultyReportModal";
import { FacultyDetailsModal } from "@/components/FacultyDetailsModal";
import { useLanguage, formatGujaratiDate, getStudentDisplayName, toGujaratiName } from "@/lib/i18n";
import {
  useStore,
  update,
  uid,
  today,
  rupee,
  niceDate,
  buildWaMessage,
  openWhatsApp,
  facultyAttendanceStats,
  type AttendanceRecord,
  type Faculty,
  type SalaryType,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance & Faculty Reports — Gurukul Group Tuition" },
      {
        name: "description",
        content: "Mark student and faculty attendance, generate faculty reports, and WhatsApp notifications.",
      },
      { property: "og:title", content: "Attendance — Gurukul" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Attendance,
});

type AttendanceTab = "students" | "faculty";

function Attendance() {
  const s = useStore();
  const { lang } = useLanguage();
  const isGu = lang === "gu";

  // Top Tabs State: Students or Faculty
  const [activeTab, setActiveTab] = useState<AttendanceTab>("students");

  // Student Attendance States
  const [batchId, setBatchId] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<AttendanceRecord | null>(null);
  const [msg, setMsg] = useState("");

  // Faculty Attendance States
  const [facDate, setFacDate] = useState(today());
  const [reportFaculty, setReportFaculty] = useState<Faculty | null>(null);
  const [detailsFaculty, setDetailsFaculty] = useState<Faculty | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultySheetOpen, setFacultySheetOpen] = useState(false);
  const [facultyArchiveTarget, setFacultyArchiveTarget] = useState<Faculty | null>(null);

  const [facultyForm, setFacultyForm] = useState({
    name: "",
    nameGu: "",
    subject: "",
    phone: "",
    salaryType: "per_student" as SalaryType,
    ratePerStudent: "1500",
    ratePerLecture: "600",
    salary: "25000",
    qualification: "",
    notes: "",
  });

  const pickBatch = (id: string) => {
    const existing = s.attendance.find((r) => r.batchId === id && r.date === date);
    setAbsent(new Set(existing?.absent ?? []));
    setBatchId(id);
    setSaved(null);
  };

  // ----------------------------------------------------
  // FACULTY ACTIONS
  // ----------------------------------------------------
  const faForDate = s.facultyAttendance[facDate] ?? {};

  const markFaculty = (id: string, value: "P" | "A") => {
    update((state) => ({
      ...state,
      facultyAttendance: {
        ...state.facultyAttendance,
        [facDate]: { ...(state.facultyAttendance[facDate] ?? {}), [id]: value },
      },
    }));
  };

  const markAllFaculty = (value: "P" | "A") => {
    const updated: Record<string, "P" | "A"> = { ...(s.facultyAttendance[facDate] ?? {}) };
    s.faculty.filter((f) => !f.archived).forEach((f) => {
      updated[f.id] = value;
    });
    update((state) => ({
      ...state,
      facultyAttendance: {
        ...state.facultyAttendance,
        [facDate]: updated,
      },
    }));
    toast.success(
      value === "P"
        ? isGu
          ? "બધા શિક્ષકો હાજર તરીકે નોંધાયા"
          : "Marked all faculty present"
        : isGu
        ? "બધા શિક્ષકો ગેરહાજર તરીકે નોંધાયા"
        : "Marked all faculty absent"
    );
  };

  function startAddFaculty() {
    setEditingFaculty(null);
    setFacultyForm({
      name: "",
      nameGu: "",
      subject: "",
      phone: "",
      salaryType: "per_student",
      ratePerStudent: "1500",
      ratePerLecture: "600",
      salary: "25000",
      qualification: "",
      notes: "",
    });
    setFacultySheetOpen(true);
  }

  function startEditFaculty(person: Faculty) {
    setEditingFaculty(person);
    const model: SalaryType =
      person.salaryType ||
      (person.ratePerLecture && !person.ratePerStudent ? "per_lecture" : "per_student");

    setFacultyForm({
      name: person.name,
      nameGu: person.nameGu || "",
      subject: person.subject,
      phone: person.phone,
      salaryType: model,
      ratePerStudent: String(person.ratePerStudent ?? 1500),
      ratePerLecture: String(person.ratePerLecture ?? 600),
      salary: String(person.salary ?? 25000),
      qualification: person.qualification || "",
      notes: person.notes || "",
    });
    setFacultySheetOpen(true);
  }

  function saveFaculty() {
    if (!facultyForm.name.trim()) {
      toast.error(isGu ? "કૃપા કરીને શિક્ષકનું નામ દાખલ કરો." : "Please enter faculty name.");
      return;
    }

    const item: Faculty = {
      id: editingFaculty?.id ?? uid(),
      name: facultyForm.name.trim(),
      nameGu: facultyForm.nameGu.trim() || undefined,
      subject: facultyForm.subject.trim() || "General",
      phone: facultyForm.phone.trim(),
      salaryType: facultyForm.salaryType,
      ratePerStudent:
        facultyForm.salaryType === "per_student"
          ? Number(facultyForm.ratePerStudent) || 1500
          : undefined,
      ratePerLecture:
        facultyForm.salaryType === "per_lecture"
          ? Number(facultyForm.ratePerLecture) || 600
          : undefined,
      salary: Number(facultyForm.salary) || 0,
      qualification: facultyForm.qualification.trim() || undefined,
      notes: facultyForm.notes.trim() || undefined,
      joiningDate: editingFaculty?.joiningDate || today(),
      ...(editingFaculty?.archived ? { archived: true } : {}),
    };

    update((state) => ({
      ...state,
      faculty: editingFaculty
        ? state.faculty.map((entry) => (entry.id === editingFaculty.id ? item : entry))
        : [...state.faculty, item],
    }));

    toast.success(
      editingFaculty
        ? isGu
          ? `${item.name} વિગતો અપડેટ થઈ`
          : `${item.name} updated`
        : isGu
        ? `${item.name} ઉમેરાયા`
        : `${item.name} added`
    );
    setFacultySheetOpen(false);
    setEditingFaculty(null);
  }

  function handleFacultyArchiveConfirm() {
    if (!facultyArchiveTarget) return;
    const target = facultyArchiveTarget;
    update((state) => ({
      ...state,
      faculty: state.faculty.map((entry) =>
        entry.id === target.id ? { ...entry, archived: !entry.archived } : entry
      ),
    }));
    toast.success(
      target.archived
        ? isGu
          ? `${target.name} પુનઃસ્થાપિત થયા`
          : `${target.name} restored`
        : isGu
        ? `${target.name} સંગ્રહિત થયા`
        : `${target.name} archived`
    );
    setFacultyArchiveTarget(null);
  }

  // ----------------------------------------------------
  // VIEW: Student Attendance Success / Summary Screen
  // ----------------------------------------------------
  if (saved) {
    return (
      <AppShell title={isGu ? "હાજરી સચવાઈ ગઈ" : "Attendance Saved"}>
        <div className="card text-center space-y-3">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-success-soft text-success shadow-xs">
            <CheckCircle2 className="size-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground">
              {isGu ? "હાજરી સફળતાપૂર્વક સચવાઈ ગઈ" : "Attendance Saved Successfully"}
            </h2>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              {s.batches.find((b) => b.id === saved.batchId)?.name} (
              {s.batches.find((b) => b.id === saved.batchId)?.standard}) ·{" "}
              {isGu ? formatGujaratiDate(saved.date) : niceDate(saved.date)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-2xl bg-success-soft p-3.5 border border-success/20">
              <p className="text-3xl font-black text-success">
                {saved.present.length}
              </p>
              <p className="text-xs font-bold text-success/80">
                {isGu ? "હાજર" : "Present"}
              </p>
            </div>
            <div className="rounded-2xl bg-danger-soft p-3.5 border border-destructive/20">
              <p className="text-3xl font-black text-destructive">
                {saved.absent.length}
              </p>
              <p className="text-xs font-bold text-destructive/80">
                {isGu ? "ગેરહાજર" : "Absent"}
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Message Preview */}
        <div className="card space-y-2">
          <p className="label font-bold text-foreground">
            {isGu ? "ગેરહાજર વિદ્યાર્થીઓનો વ્હોટ્સએપ સંદેશ" : "WhatsApp Absentees Message"}
          </p>
          <textarea
            className="field min-h-36 py-2.5 text-xs font-mono leading-relaxed"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
        </div>

        <Button
          className="btn-wa w-full h-12 text-sm font-bold shadow-md"
          onClick={() => openWhatsApp(msg)}
        >
          <MessageCircle className="size-5" /> {isGu ? "વોટ્સએપ પર મોકલો" : "Share on WhatsApp"}
        </Button>

        <Button
          variant="secondary"
          className="w-full h-11 text-xs font-bold"
          onClick={() => {
            navigator.clipboard.writeText(msg);
            toast.success(isGu ? "સંદેશ ક્લિપબોર્ડ પર કોપી થયો" : "Absentee message copied to clipboard");
          }}
        >
          <Copy className="size-4 mr-1.5" /> {isGu ? "મેસેજ કોપી કરો" : "Copy Message"}
        </Button>

        <Button
          variant="outline"
          className="w-full h-11 text-xs font-bold"
          onClick={() => {
            setSaved(null);
            setBatchId(null);
          }}
        >
          {isGu ? "પૂર્ણ" : "Done"}
        </Button>
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // VIEW: Student Marking Screen for Selected Batch
  // ----------------------------------------------------
  if (batchId) {
    const batch = s.batches.find((b) => b.id === batchId)!;
    const list = s.students.filter((x) => x.batchId === batchId && !x.archived);
    const existingRec = s.attendance.find(
      (r) => r.batchId === batchId && r.date === date
    );

    const toggle = (id: string) => {
      setAbsent((a) => {
        const n = new Set(a);
        if (n.has(id)) {
          n.delete(id);
        } else {
          n.add(id);
        }
        return n;
      });
    };

    const handleSave = () => {
      const presentList = list.filter((x) => !absent.has(x.id)).map((x) => x.id);
      const absentList = list.filter((x) => absent.has(x.id)).map((x) => x.id);

      const rec: AttendanceRecord = {
        date,
        batchId,
        absent: absentList,
        present: presentList,
        updatedAt: new Date().toISOString(),
      };

      update((x) => ({
        ...x,
        attendance: [
          ...x.attendance.filter(
            (r) => !(r.batchId === batchId && r.date === date)
          ),
          rec,
        ],
      }));

      setMsg(buildWaMessage(s, rec, lang));
      setSaved(rec);
      toast.success(
        existingRec
          ? isGu
            ? "હાજરી સુધારો સાચવ્યો!"
            : "Attendance changes saved!"
          : isGu
          ? "હાજરી સચવાઈ ગઈ!"
          : "Attendance saved!"
      );
    };

    return (
      <AppShell
        title={isGu ? `બેચ ${batch.name}` : `Batch ${batch.name}`}
        action={
          <button
            type="button"
            className="text-xs font-bold text-primary-foreground/90 underline hover:text-primary-foreground"
            onClick={() => setBatchId(null)}
          >
            {isGu ? "બેચ બદલો" : "Change Batch"}
          </button>
        }
      >
        {/* Subheader banner */}
        <div className="rounded-2xl border bg-card p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <b className="text-base font-extrabold text-foreground">
                {batch.name} ({batch.standard})
              </b>
              <p className="text-xs text-muted-foreground">
                {isGu ? formatGujaratiDate(date) : niceDate(date)} · {list.length} {isGu ? "કુલ વિદ્યાર્થી" : "total students"}
              </p>
            </div>
            {existingRec && (
              <span className="chip bg-secondary text-primary font-bold text-xs">
                {isGu ? "અગાઉની હાજરી સુધારો" : "Editing Existing"}
              </span>
            )}
          </div>

          {/* Quick action buttons: All Present, All Absent */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold"
              onClick={() => setAbsent(new Set())}
            >
              <Check className="size-3.5 mr-1 text-success" /> {isGu ? "બધા હાજર" : "Mark All Present"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold"
              onClick={() => setAbsent(new Set(list.map((st) => st.id)))}
            >
              <X className="size-3.5 mr-1 text-destructive" /> {isGu ? "બધા ગેરહાજર" : "Mark All Absent"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground px-1 font-semibold">
          {isGu ? "હાજર અથવા ગેરહાજર બદલવા વિદ્યાર્થી પર ટેપ કરો:" : "Tap any student to toggle between Present and Absent:"}
        </p>

        {/* Student List */}
        <div className="space-y-2">
          {list.map((st) => {
            const isAbsent = absent.has(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => toggle(st.id)}
                className={`card flex w-full items-center justify-between text-left transition active:scale-[0.99] ${
                  isAbsent
                    ? "border-destructive bg-danger-soft shadow-xs"
                    : "border-success/30 bg-card hover:border-success"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-extrabold text-foreground block truncate">
                    {getStudentDisplayName(st, lang)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isGu ? "વાલી:" : "Parent:"} {st.parentPhone || "—"}
                  </span>
                </div>
                <span
                  className={`chip px-3.5 py-1 text-xs font-black transition ${
                    isAbsent
                      ? "bg-destructive text-destructive-foreground shadow-xs"
                      : "bg-success text-primary-foreground shadow-xs"
                  }`}
                >
                  {isAbsent ? (isGu ? "ગેરહાજર" : "Absent") : (isGu ? "હાજર" : "Present")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Primary Action Button: SAVE CHANGES */}
        <div className="sticky bottom-20 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
          <Button
            className="h-14 w-full rounded-2xl bg-primary text-base font-black tracking-wide text-primary-foreground shadow-xl active:scale-[0.99]"
            onClick={handleSave}
          >
            <CheckCircle2 className="size-5 mr-1" />
            {existingRec ? (isGu ? "સુધારેલી હાજરી સાચવો" : "SAVE CHANGES") : (isGu ? "હાજરી સાચવો" : "SAVE ATTENDANCE")}
          </Button>
        </div>
      </AppShell>
    );
  }

  // ----------------------------------------------------
  // MAIN VIEW: Tabs for [ Students | Faculty ]
  // ----------------------------------------------------
  const activeFaculty = s.faculty.filter((f) => !f.archived);
  const facultyPresentCount = activeFaculty.filter((f) => faForDate[f.id] === "P").length;
  const facultyAbsentCount = activeFaculty.filter((f) => faForDate[f.id] === "A").length;

  return (
    <AppShell title={isGu ? "હાજરી વિભાગ" : "Attendance"}>
      {/* TWO TOP TABS: STUDENTS & FACULTY */}
      <div className="grid grid-cols-2 rounded-2xl border bg-card p-1 shadow-sm text-xs font-bold">
        <button
          type="button"
          className={`rounded-xl py-2.5 text-xs font-black transition ${
            activeTab === "students"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("students")}
        >
          {isGu ? "વિદ્યાર્થીઓ (Students)" : "Students"}
        </button>
        <button
          type="button"
          className={`rounded-xl py-2.5 text-xs font-black transition ${
            activeTab === "faculty"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("faculty")}
        >
          {isGu ? "શિક્ષકો / ફેકલ્ટી (Faculty)" : "Faculty"}
        </button>
      </div>

      {/* ----------------------------------------------------
          TAB 1: STUDENTS ATTENDANCE
          ---------------------------------------------------- */}
      {activeTab === "students" && (
        <div className="space-y-3">
          {/* Date Selector */}
          <div className="card space-y-1.5">
            <label className="label font-bold text-foreground">
              {isGu ? "તારીખ પસંદ કરો" : "Select Date"}
            </label>
            <div className="relative">
              <input
                type="date"
                className="field font-semibold text-sm"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isGu ? "હાજરી તારીખ: " : "Marking attendance for: "}
              <b>{isGu ? formatGujaratiDate(date) : niceDate(date)}</b>
            </p>
          </div>

          {/* Batches List */}
          <div className="space-y-2 pt-1">
            <p className="font-extrabold text-foreground text-sm px-1">
              {isGu ? "હાજરી પૂરવા / સુધારવા માટે બેચ પસંદ કરો" : "Select Batch to Mark / Edit"}
            </p>
            {s.batches.map((b) => {
              const rec = s.attendance.find(
                (r) => r.batchId === b.id && r.date === date
              );
              const count = s.students.filter(
                (x) => x.batchId === b.id && !x.archived
              ).length;

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pickBatch(b.id)}
                  className="card flex w-full items-center justify-between text-left transition hover:border-primary/40 active:scale-[0.99]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-extrabold text-foreground">
                        {b.name}
                      </p>
                      <span className="text-xs text-muted-foreground font-semibold">
                        ({b.standard})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.time} · {b.days} · {count} {isGu ? "વિદ્યાર્થી" : "students"}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`chip font-black ${
                        rec
                          ? "bg-success-soft text-success border border-success/20"
                          : "bg-warning-soft text-warning border border-warning/20"
                      }`}
                    >
                      {rec
                        ? `${rec.present.length}P / ${rec.absent.length}A`
                        : (isGu ? "બાકી છે" : "Not marked")}
                    </span>
                    {rec && (
                      <span className="text-[10px] text-primary font-bold block mt-1">
                        {isGu ? "સુધારો →" : "Tap to Edit →"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          TAB 2: FACULTY ATTENDANCE & REPORT
          ---------------------------------------------------- */}
      {activeTab === "faculty" && (
        <div className="space-y-3">
          {/* Faculty Header Banner & Date Selector */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-foreground text-sm">
                  {isGu ? "શિક્ષકોની દૈનિક હાજરી" : "Faculty Daily Attendance"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isGu ? formatGujaratiDate(facDate) : niceDate(facDate)}
                </p>
              </div>
              <Button
                size="sm"
                onClick={startAddFaculty}
                className="h-8 gap-1 text-xs font-bold"
              >
                <Plus className="size-3.5" /> {isGu ? "શિક્ષક ઉમેરો" : "Add Faculty"}
              </Button>
            </div>

            {/* Date Picker */}
            <div className="relative">
              <input
                type="date"
                className="field font-semibold text-sm"
                value={facDate}
                max={today()}
                onChange={(e) => setFacDate(e.target.value)}
              />
            </div>

            {/* Daily Stat Counters */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="rounded-xl border bg-muted/30 p-2">
                <p className="text-[10px] font-bold text-muted-foreground">
                  {isGu ? "કુલ શિક્ષકો" : "Total Faculty"}
                </p>
                <p className="text-xl font-black text-foreground mt-0.5">
                  {activeFaculty.length}
                </p>
              </div>
              <div className="rounded-xl border border-success/30 bg-success-soft p-2">
                <p className="text-[10px] font-bold text-success">
                  {isGu ? "હાજર" : "Present"}
                </p>
                <p className="text-xl font-black text-success mt-0.5">
                  {facultyPresentCount}
                </p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-danger-soft p-2">
                <p className="text-[10px] font-bold text-destructive">
                  {isGu ? "ગેરહાજર" : "Absent"}
                </p>
                <p className="text-xl font-black text-destructive mt-0.5">
                  {facultyAbsentCount}
                </p>
              </div>
            </div>

            {/* Quick Mark All Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t">
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold h-9"
                onClick={() => markAllFaculty("P")}
              >
                <Check className="size-3.5 mr-1 text-success" />
                {isGu ? "બધા શિક્ષક હાજર" : "Mark All Present"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold h-9"
                onClick={() => markAllFaculty("A")}
              >
                <X className="size-3.5 mr-1 text-destructive" />
                {isGu ? "બધા ગેરહાજર" : "Mark All Absent"}
              </Button>
            </div>
          </div>

          {/* Faculty Members List */}
          <div className="space-y-2.5">
            <p className="font-extrabold text-foreground text-sm px-1">
              {isGu ? "શિક્ષકોની યાદી અને હાજરી નોંધણી" : "Faculty Directory & Attendance"}
            </p>

            {s.faculty.map((person) => {
              const facName = isGu
                ? person.nameGu || toGujaratiName(person.name)
                : person.name;
              const fStats = facultyAttendanceStats(s, person.id);
              const status = faForDate[person.id];
              const isPerLecture =
                person.salaryType === "per_lecture" ||
                (!person.salaryType && person.ratePerLecture && !person.ratePerStudent);

              return (
                <article
                  key={person.id}
                  onClick={() => setDetailsFaculty(person)}
                  className={`card space-y-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-md ${
                    person.archived ? "opacity-75 bg-muted/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary font-black text-primary">
                      {person.name[0]}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-extrabold text-foreground text-sm">
                          {facName}
                        </p>
                        {person.archived && (
                          <span className="text-[10px] text-muted-foreground font-bold">
                            ({isGu ? "સંગ્રહિત" : "Archived"})
                          </span>
                        )}
                        {fStats.pct !== null && (
                          <span className="chip bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5">
                            {fStats.present}/{fStats.total} {isGu ? "હાજર" : "P"} ({fStats.pct}%)
                          </span>
                        )}
                      </div>

                      {/* Rate (Either Per Student OR Per Lecture, not both) & Subject Info */}
                      <div className="flex items-center gap-2 flex-wrap mt-1 text-xs">
                        <span className="text-muted-foreground">
                          {person.subject}
                          {person.qualification ? ` · ${person.qualification}` : ""}
                        </span>
                        {isPerLecture ? (
                          <span className="chip bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold text-[10px] px-2 py-0.5">
                            {rupee(person.ratePerLecture ?? 600)}/{isGu ? "લેક્ચર" : "lecture"}
                          </span>
                        ) : (
                          <span className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] px-2 py-0.5">
                            {rupee(person.ratePerStudent ?? 1500)}/{isGu ? "વિદ્યાર્થી" : "student"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Call */}
                    {!person.archived && person.phone && (
                      <a
                        href={`tel:${person.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-xl bg-secondary p-2 text-primary hover:bg-secondary/80"
                        aria-label={`Call ${person.name}`}
                      >
                        <Phone className="size-4" />
                      </a>
                    )}

                    {/* Edit Faculty */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditFaculty(person);
                      }}
                      aria-label={`Edit ${person.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>

                    {/* Archive Faculty */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFacultyArchiveTarget(person);
                      }}
                      aria-label="Archive faculty"
                    >
                      {person.archived ? (
                        <ArchiveRestore className="size-4" />
                      ) : (
                        <Archive className="size-4" />
                      )}
                    </Button>
                  </div>

                  {/* Attendance Marking & Action Buttons */}
                  {!person.archived && (
                    <div className="border-t pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Left: Segmented Attendance Pill for Selected Date */}
                      <div className="flex items-center justify-between sm:justify-start gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground sm:hidden">
                          {isGu ? "આજની હાજરી:" : "Today's Status:"}
                        </span>
                        <div className="inline-flex rounded-2xl bg-muted/70 p-1 border border-border/80 shadow-2xs">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markFaculty(person.id, "P");
                            }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              status === "P"
                                ? "bg-emerald-600 text-white shadow-sm font-black"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            }`}
                          >
                            <Check className={`size-3.5 ${status === "P" ? "stroke-[2.8]" : ""}`} />
                            <span>{isGu ? "હાજર" : "Present"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markFaculty(person.id, "A");
                            }}
                            className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              status === "A"
                                ? "bg-rose-600 text-white shadow-sm font-black"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                            }`}
                          >
                            <X className={`size-3.5 ${status === "A" ? "stroke-[2.8]" : ""}`} />
                            <span>{isGu ? "ગેરહાજર" : "Absent"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Right: Management Buttons */}
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 px-3 text-xs font-extrabold gap-1.5 rounded-xl border-primary/25 text-primary hover:bg-primary/10 hover:border-primary/50 shadow-2xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsFaculty(person);
                          }}
                        >
                          <IndianRupee className="size-3.5" />
                          <span>{isGu ? "વિગતો અને પગાર" : "Details & Salary"}</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-9 px-3 text-xs font-bold gap-1.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportFaculty(person);
                          }}
                        >
                          <FileText className="size-3.5 text-muted-foreground" />
                          <span>{isGu ? "ફેકલ્ટી રિપોર્ટ" : "Faculty Report"}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          FACULTY DETAILS & MONTHLY SALARY MODAL
          ---------------------------------------------------- */}
      {detailsFaculty && (
        <FacultyDetailsModal
          faculty={detailsFaculty}
          onClose={() => setDetailsFaculty(null)}
          onEdit={(fac) => {
            setDetailsFaculty(null);
            startEditFaculty(fac);
          }}
          onGenerateReport={(fac) => {
            setDetailsFaculty(null);
            setReportFaculty(fac);
          }}
        />
      )}

      {/* ----------------------------------------------------
          FACULTY REPORT MODAL
          ---------------------------------------------------- */}
      {reportFaculty && (
        <FacultyReportModal
          faculty={reportFaculty}
          settings={s.settings}
          onClose={() => setReportFaculty(null)}
        />
      )}

      {/* ----------------------------------------------------
          ADD / EDIT FACULTY SHEET
          ---------------------------------------------------- */}
      <Sheet
        open={facultySheetOpen}
        onClose={() => setFacultySheetOpen(false)}
        title={
          editingFaculty
            ? isGu
              ? `${editingFaculty.name} સુધારો`
              : `Edit ${editingFaculty.name}`
            : isGu
            ? "નવા શિક્ષક ઉમેરો"
            : "Add New Faculty"
        }
      >
        <div className="space-y-3 pb-6">
          <div>
            <label className="label">
              {isGu ? "શિક્ષકનું પૂરું નામ *" : "Full Name *"}
            </label>
            <input
              className="field font-bold"
              placeholder="e.g. Rakesh Sir"
              value={facultyForm.name}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">
              {isGu ? "ગુજરાતી નામ" : "Gujarati Name"}
            </label>
            <input
              className="field font-bold"
              placeholder="દા.ત. રાકેશ સર"
              value={facultyForm.nameGu}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, nameGu: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">
              {isGu ? "વિષય *" : "Subject Taught *"}
            </label>
            <input
              className="field"
              placeholder="e.g. Mathematics, Science"
              value={facultyForm.subject}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, subject: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">
              {isGu ? "મોબાઈલ નંબર" : "Phone Number"}
            </label>
            <input
              className="field"
              inputMode="tel"
              placeholder="e.g. 9876500001"
              value={facultyForm.phone}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, phone: e.target.value })
              }
            />
          </div>
          {/* Salary Model Selection (EITHER per student OR per lecture) */}
          <div>
            <label className="label">
              {isGu ? "પગાર ગણતરી પદ્ધતિ (મોડેલ) *" : "Salary Calculation Model *"}
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                className={`rounded-xl py-2 px-3 text-xs font-bold border transition ${
                  facultyForm.salaryType === "per_student"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() =>
                  setFacultyForm({ ...facultyForm, salaryType: "per_student" })
                }
              >
                {isGu ? "👨‍🎓 પ્રતિ વિદ્યાર્થી ફી" : "👨‍🎓 Per Student"}
              </button>
              <button
                type="button"
                className={`rounded-xl py-2 px-3 text-xs font-bold border transition ${
                  facultyForm.salaryType === "per_lecture"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
                onClick={() =>
                  setFacultyForm({ ...facultyForm, salaryType: "per_lecture" })
                }
              >
                {isGu ? "📚 પ્રતિ લેક્ચર દર" : "📚 Per Lecture"}
              </button>
            </div>
          </div>

          {/* Conditional Single Rate Input based on Model */}
          {facultyForm.salaryType === "per_student" ? (
            <div>
              <label className="label">
                {isGu ? "પ્રતિ વિદ્યાર્થી ફી દર (₹) *" : "Fee Per Student Rate (₹) *"}
              </label>
              <input
                className="field font-bold text-primary"
                inputMode="numeric"
                placeholder="1500"
                value={facultyForm.ratePerStudent}
                onChange={(e) =>
                  setFacultyForm({
                    ...facultyForm,
                    ratePerStudent: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isGu
                  ? "પગાર = (કુલ સક્રિય વિદ્યાર્થીઓ × પ્રતિ વિદ્યાર્થી ફી) × હાજરી ગુણોત્તર"
                  : "Salary = (Active Students × Rate) × Attendance Ratio"}
              </p>
            </div>
          ) : (
            <div>
              <label className="label">
                {isGu ? "પ્રતિ લેક્ચર દર (₹) *" : "Rate Per Lecture (₹) *"}
              </label>
              <input
                className="field font-bold text-primary"
                inputMode="numeric"
                placeholder="600"
                value={facultyForm.ratePerLecture}
                onChange={(e) =>
                  setFacultyForm({
                    ...facultyForm,
                    ratePerLecture: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {isGu
                  ? "પગાર = લીધેલા લેક્ચર્સ (હાજર દિવસો) × પ્રતિ લેક્ચર દર"
                  : "Salary = Attended Lectures (Present Days) × Rate Per Lecture"}
              </p>
            </div>
          )}
          <div>
            <label className="label">
              {isGu ? "સામાન્ય માસિક પગાર (સંદર્ભ માટે ₹)" : "Base Monthly Reference Salary (₹)"}
            </label>
            <input
              className="field"
              inputMode="numeric"
              value={facultyForm.salary}
              onChange={(e) =>
                setFacultyForm({
                  ...facultyForm,
                  salary: e.target.value.replace(/\D/g, ""),
                })
              }
            />
          </div>
          <div>
            <label className="label">
              {isGu ? "શૈક્ષણિક લાયકાત" : "Qualification"}
            </label>
            <input
              className="field"
              placeholder="e.g. M.Sc. Maths, B.Ed"
              value={facultyForm.qualification}
              onChange={(e) =>
                setFacultyForm({
                  ...facultyForm,
                  qualification: e.target.value,
                })
              }
            />
          </div>
          <div>
            <label className="label">
              {isGu ? "નોંધ" : "Notes / Remarks"}
            </label>
            <textarea
              className="field min-h-20 py-2 text-sm"
              placeholder={isGu ? "વિશેષ નોંધ..." : "Additional details..."}
              value={facultyForm.notes}
              onChange={(e) =>
                setFacultyForm({ ...facultyForm, notes: e.target.value })
              }
            />
          </div>
          <Button
            className="w-full h-12 text-base font-bold"
            onClick={saveFaculty}
          >
            {editingFaculty
              ? isGu
                ? "સુધારો સાચવો"
                : "Save Faculty Changes"
              : isGu
              ? "શિક્ષક ઉમેરો"
              : "Add Faculty"}
          </Button>
        </div>
      </Sheet>

      {/* ----------------------------------------------------
          ARCHIVE CONFIRM DIALOG
          ---------------------------------------------------- */}
      <ConfirmDialog
        open={!!facultyArchiveTarget}
        onOpenChange={(op) => !op && setFacultyArchiveTarget(null)}
        title={
          facultyArchiveTarget?.archived
            ? isGu
              ? `${facultyArchiveTarget?.name} પુનઃસ્થાપિત કરવા છે?`
              : `Restore ${facultyArchiveTarget?.name}?`
            : isGu
            ? `${facultyArchiveTarget?.name} સંગ્રહિત કરવા છે?`
            : `Archive ${facultyArchiveTarget?.name}?`
        }
        description={
          facultyArchiveTarget?.archived
            ? isGu
              ? "આ શિક્ષકને પુનઃ સક્રિય ડિરેક્ટરીમાં પરત કરવામાં આવશે."
              : "This faculty member will be returned to the active directory."
            : isGu
            ? "આ શિક્ષક આર્કાઇવમાં ખસેડવામાં આવશે પરંતુ તેમનો ઇતિહાસ સુરક્ષિત રહેશે."
            : `${facultyArchiveTarget?.name} will be moved to archives, but their past class and salary history will remain intact.`
        }
        confirmLabel={
          facultyArchiveTarget?.archived
            ? isGu
              ? "પુનઃસ્થાપિત કરો"
              : "Restore Faculty"
            : isGu
            ? "સંગ્રહિત કરો"
            : "Archive Faculty"
        }
        variant={facultyArchiveTarget?.archived ? "default" : "destructive"}
        onConfirm={handleFacultyArchiveConfirm}
      />
    </AppShell>
  );
}
