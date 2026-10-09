import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Pencil,
  FileText,
  CheckSquare,
  Archive,
  ArchiveRestore,
  User,
  School,
  MapPin,
  Calendar,
  IndianRupee,
  BookOpen,
  Award,
  Printer,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AppShell, Sheet } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StudentReportModal } from "@/components/StudentReportModal";
import {
  useLanguage,
  formatGujaratiDate,
  getStudentDisplayName,
  toGujaratiName,
} from "@/lib/i18n";
import {
  useStore,
  update,
  uid,
  today,
  thisMonth,
  pendingFor,
  attendancePct,
  studentAttendanceStats,
  studentMonthlyStats,
  studentAllMonthsHistory,
  formatMonthLabel,
  formatDayDate,
  studentTotalFee,
  getStudentTestMarks,
  rupee,
  niceDate,
  paidThisMonth,
  totalPaid,
  formatStudentId,
  formatReceiptNumber,
  type Student,
  type RecordItem,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/students/$id")({
  head: () => ({
    meta: [
      { title: "Student Profile — Gurukul" },
      { name: "description", content: "Student attendance, fees and details." },
      { property: "og:title", content: "Student Profile — Gurukul" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const s = useStore();
  const nav = useNavigate();
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const st = s.students.find((x) => x.id === id);
  const displayName = st ? getStudentDisplayName(st, lang) : "";

  const [editOpen, setEditOpen] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedAttMonth, setSelectedAttMonth] = useState<string>("all");
  const [testMarkModalOpen, setTestMarkModalOpen] = useState(false);
  const [testMarkDraft, setTestMarkDraft] = useState({
    testName: "",
    subject: "Mathematics",
    date: today(),
    score: "",
    outOf: "50",
    remarks: "",
  });

  // Edit form state
  const [form, setForm] = useState({
    name: st?.name || "",
    phone: st?.phone || "",
    parentPhone: st?.parentPhone || "",
    batchId: st?.batchId || "",
    standard: st?.standard || "",
    school: st?.school || "",
    address: st?.address || "",
    monthlyFee: String(st?.monthlyFee || ""),
    totalFee: String(st?.totalFee || ""),
    dueDate: st?.dueDate || "",
    notes: st?.notes || "",
  });

  if (!st) {
    return (
      <AppShell title="Student" back>
        <div className="card py-12 text-center text-muted-foreground">
          <p className="font-bold">Student not found</p>
          <Link to="/students" className="mt-3 text-sm text-primary underline">
            Back to students
          </Link>
        </div>
      </AppShell>
    );
  }

  const batch = s.batches.find((b) => b.id === st.batchId);
  const att = attendancePct(s, st.id);
  const pend = pendingFor(s, st);
  const recs = s.attendance
    .filter((r) => r.present.includes(st.id) || r.absent.includes(st.id))
    .slice(-10)
    .reverse();
  const pays = s.payments.filter((p) => p.studentId === st.id).reverse();
  const totalPaidAmt = totalPaid(s, st.id);
  const formattedId = formatStudentId(st);
  const attStats = studentAttendanceStats(s, st.id);
  const studentMonthsHistory = studentAllMonthsHistory(s, st.id);
  const activeMonthStats =
    selectedAttMonth === "all"
      ? null
      : studentMonthlyStats(s, st.id, selectedAttMonth);

  const activePresent = activeMonthStats ? activeMonthStats.present : attStats.present;
  const activeAbsent = activeMonthStats ? activeMonthStats.absent : attStats.absent;
  const activeTotal = activeMonthStats ? activeMonthStats.total : attStats.total;
  const activePct = activeMonthStats ? activeMonthStats.pct : attStats.pct;
  const activeAbsentDates = activeMonthStats
    ? activeMonthStats.absentDates
    : s.attendance
        .filter((r) => r.absent.includes(st.id))
        .map((r) => r.date)
        .sort()
        .reverse();

  const totalFeeVal = studentTotalFee(st);
  const testsList = getStudentTestMarks(s, st);

  function startEdit() {
    setForm({
      name: st!.name,
      phone: st!.phone || "",
      parentPhone: st!.parentPhone || "",
      batchId: st!.batchId || "",
      standard: st!.standard || batch?.standard || "",
      school: st!.school || "",
      address: st!.address || "",
      monthlyFee: String(st!.monthlyFee || ""),
      totalFee: String(st!.totalFee || ""),
      dueDate: st!.dueDate || "",
      notes: st!.notes || "",
    });
    setEditOpen(true);
  }

  function handleSaveEdit() {
    if (!form.name.trim() || !form.batchId) {
      toast.error("Please enter a student name and select a batch.");
      return;
    }

    const selectedBatch = s.batches.find((b) => b.id === form.batchId);
    const updatedStudent: Student = {
      ...st!,
      name: form.name.trim(),
      nameGu: toGujaratiName(form.name.trim()),
      phone: form.phone.trim(),
      parentPhone: form.parentPhone.trim(),
      batchId: form.batchId,
      standard: form.standard.trim() || selectedBatch?.standard || "10th",
      school: form.school.trim(),
      address: form.address.trim(),
      monthlyFee: Number(form.monthlyFee) || 0,
      totalFee: Number(form.totalFee) || (Number(form.monthlyFee) || 0) * 12,
      dueDate: form.dueDate || undefined,
      notes: form.notes.trim() || undefined,
    };

    update((state) => ({
      ...state,
      students: state.students.map((x) => (x.id === st!.id ? updatedStudent : x)),
    }));

    toast.success(
      isGu
        ? `${getStudentDisplayName(updatedStudent, "gu")} ની વિગતો સુધારી લેવાઈ છે`
        : `${updatedStudent.name}'s profile updated`
    );
    setEditOpen(false);
  }

  function handleArchive() {
    update((state) => ({
      ...state,
      students: state.students.map((x) =>
        x.id === st!.id ? { ...x, archived: true } : x
      ),
    }));
    toast.success(
      isGu
        ? `${displayName} આર્કાઇવ થયા`
        : `${st!.name} archived`
    );
    setArchiveConfirm(false);
    nav({ to: "/students" });
  }

  function handleRestore() {
    update((state) => ({
      ...state,
      students: state.students.map((x) =>
        x.id === st!.id ? { ...x, archived: false } : x
      ),
    }));
    toast.success(`${st!.name} restored to active students`);
  }

  function handleSaveTestMark(e: React.FormEvent) {
    e.preventDefault();
    if (!testMarkDraft.testName.trim()) {
      toast.error(isGu ? "કૃપા કરીને પરીક્ષાનું નામ લખો" : "Please enter test name");
      return;
    }
    const scoreNum = Number(testMarkDraft.score);
    const outOfNum = Number(testMarkDraft.outOf) || 50;
    if (isNaN(scoreNum) || scoreNum < 0) {
      toast.error(isGu ? "કૃપા કરીને સાચા ગુણ દાખલ કરો" : "Please enter valid marks");
      return;
    }
    const newMarkItem: RecordItem = {
      id: uid(),
      studentId: st!.id,
      student: st!.name,
      test: testMarkDraft.testName.trim(),
      score: String(scoreNum),
      outOf: String(outOfNum),
      remarks: testMarkDraft.remarks.trim(),
      createdAt: new Date().toISOString(),
    };

    const existingTest = (s.tests || []).find(
      (t) => String(t.name).toLowerCase() === testMarkDraft.testName.trim().toLowerCase()
    );

    update((state) => {
      const updatedMarks = [...(state.marks || []), newMarkItem];
      let updatedTests = state.tests || [];
      if (!existingTest) {
        updatedTests = [
          ...updatedTests,
          {
            id: uid(),
            name: testMarkDraft.testName.trim(),
            subject: testMarkDraft.subject.trim() || "General",
            date: testMarkDraft.date,
            batch: batch?.name || "All",
            outOf: String(outOfNum),
            createdAt: new Date().toISOString(),
          },
        ];
      }
      return {
        ...state,
        marks: updatedMarks,
        tests: updatedTests,
      };
    });

    toast.success(isGu ? "પરીક્ષાના ગુણ સાચવવામાં આવ્યા!" : "Test marks recorded successfully!");
    setTestMarkModalOpen(false);
    setTestMarkDraft({
      testName: "",
      subject: "Mathematics",
      date: today(),
      score: "",
      outOf: "50",
      remarks: "",
    });
  }

  return (
    <AppShell
      title={displayName}
      back
      action={
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5 rounded-full font-bold shadow-sm"
          onClick={startEdit}
        >
          <Pencil className="size-3.5" /> Edit
        </Button>
      }
    >
      {/* Archived banner if archived */}
      {st.archived && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-center">
          <p className="text-xs font-bold text-destructive">
            This student is currently ARCHIVED.
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Historical attendance and payment records are preserved.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs font-bold"
            onClick={handleRestore}
          >
            <ArchiveRestore className="size-3.5 mr-1" /> Restore Student
          </Button>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="card text-center relative overflow-hidden">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary text-3xl font-black text-primary shadow-sm">
          {displayName.slice(0, 1) || st.name[0]}
        </div>
        <p className="mt-3 text-2xl font-black text-foreground">{displayName}</p>
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          {formattedId}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">
          {batch?.standard || st.standard || "10th"} · Batch {batch?.name || "—"}
          {st.school ? ` · ${st.school}` : ""}
        </p>

        {/* Primary Contact Buttons */}
        <div className="mt-4 flex justify-center gap-2">
          {st.parentPhone && (
            <a
              href={`tel:${st.parentPhone}`}
              className="btn-soft h-10 px-4 text-xs font-bold"
            >
              <Phone className="h-4 w-4" /> Call Parent
            </a>
          )}
          {st.parentPhone && (
            <a
              href={`https://wa.me/91${st.parentPhone}`}
              target="_blank"
              rel="noreferrer"
              className="btn-wa h-10 px-4 text-xs font-bold"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>

        {/* Quick Action Bar: Generate Report, Collect Fee, Attendance, Edit */}
        <div className="mt-4 space-y-2 border-t pt-3">
          <Button
            className="w-full h-11 text-xs font-black shadow-sm gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setReportOpen(true)}
          >
            <Printer className="size-4" />
            {isGu
              ? "📄 એક પાનાનો પ્રગતિ અહેવાલ બનાવો (Generate Report)"
              : "📄 Generate Single-Page Report"}
          </Button>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 text-xs font-bold"
              onClick={startEdit}
            >
              <Pencil className="size-3.5 mr-1" /> {isGu ? "સુધારો" : "Edit"}
            </Button>
            <Link
              to="/fees"
              className="btn-primary h-10 text-xs font-bold px-2"
            >
              <FileText className="size-3.5 mr-1" /> {isGu ? "ફી પહોંચ" : "Collect Fee"}
            </Link>
            <Link
              to="/attendance"
              className="btn-soft h-10 text-xs font-bold px-2"
            >
              <CheckSquare className="size-3.5 mr-1" /> {isGu ? "હાજરી" : "Attendance"}
            </Link>
          </div>
        </div>
      </div>

      {/* 1. ATTENDANCE SNAPSHOT: MONTH-WISE PRESENT & ABSENT DAYS + SPECIFIC ABSENT DATES */}
      <div className="card space-y-3.5">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
            <CheckSquare className="size-4 text-primary" />
            {isGu ? "હાજરી વિગતો (Attendance Record)" : "Attendance Performance"}
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            {activeTotal} {isGu ? "કુલ ક્લાસ" : "Sessions"} · {selectedAttMonth === "all" ? (isGu ? "સમગ્ર સમયગાળો" : "All Time") : formatMonthLabel(selectedAttMonth, isGu)}
          </span>
        </div>

        {/* Month Selector Tabs */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-muted-foreground">
              {isGu ? "મહિનો પસંદ કરો:" : "Select Month:"}
            </span>
            <span className="font-black text-primary">
              {selectedAttMonth === "all"
                ? isGu ? "સમગ્ર સમયગાળો (All Time)" : "All Time"
                : formatMonthLabel(selectedAttMonth, isGu)}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              className={`chip shrink-0 px-3 py-1 font-bold transition ${
                selectedAttMonth === "all"
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setSelectedAttMonth("all")}
            >
              {isGu ? "બધા મહિના (All)" : "All Time"}
            </button>
            {studentMonthsHistory.map((m) => (
              <button
                key={m.month}
                type="button"
                className={`chip shrink-0 px-3 py-1 font-bold transition ${
                  selectedAttMonth === m.month
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedAttMonth(m.month)}
              >
                {formatMonthLabel(m.month, isGu)}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Metric Boxes for Present / Absent */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border bg-muted/40 p-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
              {isGu ? "કુલ દિવસ" : "Total"}
            </span>
            <p className="text-xl font-black text-foreground mt-0.5">
              {activeTotal}
            </p>
          </div>

          <div className="rounded-xl bg-success/10 border border-success/20 p-2">
            <span className="text-[10px] font-bold text-success uppercase tracking-wider block">
              {isGu ? "હાજર" : "Present"}
            </span>
            <p className="text-xl font-black text-success mt-0.5">
              {activePresent}
            </p>
          </div>

          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2">
            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider block">
              {isGu ? "ગેરહાજર" : "Absent"}
            </span>
            <p className="text-xl font-black text-destructive mt-0.5">
              {activeAbsent}
            </p>
          </div>

          <div className="rounded-xl bg-primary/10 border border-primary/20 p-2">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
              {isGu ? "હાજરી દર" : "Rate"}
            </span>
            <p
              className={`text-xl font-black mt-0.5 ${
                activePct !== null && activePct < 75
                  ? "text-destructive"
                  : "text-primary"
              }`}
            >
              {activePct !== null ? `${activePct}%` : "—"}
            </p>
          </div>
        </div>

        {/* SPECIFIC DATES OF ABSENCE */}
        <div className="rounded-2xl border p-3.5 space-y-2 bg-muted/20">
          <span className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
            <Calendar className="size-3.5 text-destructive" />
            {isGu
              ? `ગેરહાજર રહેલ તારીખો (${activeAbsentDates.length} દિવસ)`
              : `Specific Dates of Absence (${activeAbsentDates.length} Days)`}
          </span>

          {activeAbsentDates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeAbsentDates.map((dateStr) => (
                <span
                  key={dateStr}
                  className="chip bg-destructive text-destructive-foreground font-black text-xs px-2.5 py-1 flex items-center gap-1 shadow-2xs"
                >
                  <XCircle className="size-3.5" />
                  {formatDayDate(dateStr, isGu)}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-success-soft border border-success/30 p-2.5 text-success font-bold text-xs flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              {isGu
                ? "🎉 આ સમયગાળામાં ૧૦૦% સંપૂર્ણ હાજરી છે (એક પણ દિવસ ગેરહાજર નથી)!"
                : "🎉 Perfect attendance! Zero absent days recorded."}
            </div>
          )}
        </div>

        {/* Month-by-Month History Breakdown Table */}
        {studentMonthsHistory.length > 0 && (
          <div className="space-y-2 border-t pt-2.5">
            <p className="text-xs font-extrabold text-foreground">
              {isGu ? "મહિનાવાર હાજરી ઇતિહાસ:" : "Month-by-Month Attendance Breakdown:"}
            </p>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-3 py-2">{isGu ? "મહિનો" : "Month"}</th>
                    <th className="px-3 py-2 text-center text-success">{isGu ? "હાજર" : "Present"}</th>
                    <th className="px-3 py-2 text-center text-destructive">{isGu ? "ગેરહાજર" : "Absent"}</th>
                    <th className="px-3 py-2">{isGu ? "ગેરહાજર તારીખો" : "Absent Dates"}</th>
                    <th className="px-3 py-2 text-right">{isGu ? "ટકાવારી" : "Rate"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {studentMonthsHistory.map((m) => (
                    <tr
                      key={m.month}
                      onClick={() => setSelectedAttMonth(m.month)}
                      className={`hover:bg-muted/30 transition cursor-pointer ${
                        selectedAttMonth === m.month ? "bg-primary/5 font-bold" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-bold text-foreground">
                        {formatMonthLabel(m.month, isGu)}
                      </td>
                      <td className="px-3 py-2 text-center text-success font-extrabold">
                        {m.present}
                      </td>
                      <td className="px-3 py-2 text-center text-destructive font-extrabold">
                        {m.absent}
                      </td>
                      <td className="px-3 py-2">
                        {m.absentDates.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {m.absentDates.map((d) => (
                              <span
                                key={d}
                                className="chip bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5"
                              >
                                {formatDayDate(d, isGu)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-success font-bold">
                            {isGu ? "સંપૂર્ણ હાજરી" : "Perfect"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-primary">
                        {m.pct !== null ? `${m.pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 2. FEE SNAPSHOT: OUT OF ENTIRE FEE */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
            <IndianRupee className="size-4 text-primary" />
            {isGu ? "કુલ ફી ખાતું (Fee Ledger)" : "Academic Fee Ledger"}
          </span>
          <span
            className={`chip font-black text-[10px] ${
              pend === 0
                ? "bg-success-soft text-success"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            }`}
          >
            {pend === 0
              ? isGu ? "પૂર્ણ ચૂકતે" : "Paid in Full"
              : isGu ? "બાકી રકમ" : "Dues Pending"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-muted/60 p-2.5">
            <span className="text-[10px] text-muted-foreground block font-semibold">
              {isGu ? "કુલ વાર્ષિક ફી" : "Total Fee"}
            </span>
            <b className="text-sm font-black text-foreground mt-0.5 block">
              {rupee(totalFeeVal)}
            </b>
          </div>

          <div className="rounded-xl bg-success/10 border border-success/20 p-2.5">
            <span className="text-[10px] text-success block font-bold">
              {isGu ? "અત્યાર સુધી ભરેલ" : "Paid Till Date"}
            </span>
            <b className="text-sm font-black text-success mt-0.5 block">
              {rupee(totalPaidAmt)}
            </b>
          </div>

          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-2.5">
            <span className="text-[10px] text-destructive block font-bold">
              {isGu ? "બાકી રહેતી રકમ" : "Remaining Due"}
            </span>
            <b className="text-sm font-black text-destructive mt-0.5 block">
              {rupee(pend)}
            </b>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{isGu ? "ફી ચુકવણી પ્રગતિ" : "Fee Clearance Progress"}</span>
            <b className="text-foreground">
              {totalFeeVal > 0
                ? `${Math.min(100, Math.round((totalPaidAmt / totalFeeVal) * 100))}%`
                : "100%"}
            </b>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${
                  totalFeeVal > 0
                    ? Math.min(100, (totalPaidAmt / totalFeeVal) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* 3. CONDUCTED TEST MARKS RECORDS */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
            <Award className="size-4 text-primary" />
            {isGu ? "પરીક્ષા અને ગુણ પત્રક" : "Conducted Tests & Marks"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {testsList.length} {isGu ? "પરીક્ષાઓ" : "Tests"}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
              onClick={() => setTestMarkModalOpen(true)}
            >
              <Plus className="size-3.5" />
              {isGu ? "ગુણ ઉમેરો" : "Add Marks"}
            </Button>
          </div>
        </div>

        {testsList.length > 0 ? (
          <div className="space-y-2">
            {testsList.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border bg-muted/20 p-2.5 text-xs hover:border-primary/40 transition"
              >
                <div>
                  <b className="text-foreground text-sm block">{t.testName}</b>
                  <p className="text-muted-foreground text-[11px]">
                    {t.subject} · {isGu ? formatGujaratiDate(t.date) : niceDate(t.date)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <b className="text-sm font-black text-foreground">
                      {t.score} / {t.outOf}
                    </b>
                    <span
                      className={`chip text-[10px] font-black ${
                        t.pct >= 80
                          ? "bg-success-soft text-success"
                          : t.pct >= 50
                          ? "bg-primary/10 text-primary"
                          : "bg-danger-soft text-destructive"
                      }`}
                    >
                      {t.pct}%
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    {t.remarks}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
            <p>
              {isGu
                ? "આ વિદ્યાર્થી માટે હજુ કોઈ પરીક્ષાના ગુણ નોંધાયા નથી."
                : "No test records found for this student till date."}
            </p>
            <Link
              to="/more"
              className="text-primary font-bold underline inline-block"
            >
              {isGu ? "વ્યવસ્થાપનમાંથી પરીક્ષા ઉમેરો →" : "Record tests in More →"}
            </Link>
          </div>
        )}
      </div>

      {/* 4. Personal & Academic Details */}
      <div className="card space-y-2 text-sm">
        <div className="flex items-center justify-between border-b pb-2">
          <p className="font-extrabold text-foreground">
            {isGu ? "વિદ્યાર્થીની સંપૂર્ણ માહિતી" : "Student Information"}
          </p>
          <button
            type="button"
            onClick={startEdit}
            className="text-xs font-bold text-primary underline"
          >
            {isGu ? "સુધારો" : "Edit Info"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div>
            <span className="text-muted-foreground block">
              {isGu ? "વિદ્યાર્થી ફોન" : "Student Phone"}
            </span>
            <b className="text-foreground">{st.phone || "—"}</b>
          </div>
          <div>
            <span className="text-muted-foreground block">
              {isGu ? "વાલીનો ફોન" : "Parent Phone"}
            </span>
            <b className="text-foreground">{st.parentPhone || "—"}</b>
          </div>
          <div>
            <span className="text-muted-foreground block">
              {isGu ? "કુલ વાર્ષિક ફી" : "Total Course Fee"}
            </span>
            <b className="text-foreground">{rupee(totalFeeVal)}</b>
          </div>
          <div>
            <span className="text-muted-foreground block">
              {isGu ? "અત્યાર સુધી ભરેલ ફી" : "Paid Till Date"}
            </span>
            <b className="text-success font-bold">{rupee(totalPaidAmt)}</b>
          </div>
          <div>
            <span className="text-muted-foreground block">
              {isGu ? "શાળા / સંસ્થા" : "School"}
            </span>
            <b className="text-foreground">{st.school || "—"}</b>
          </div>
          <div>
            <span className="text-muted-foreground block">
              {isGu ? "પ્રવેશ તારીખ" : "Joined Date"}
            </span>
            <b className="text-foreground">{niceDate(st.joined)}</b>
          </div>
        </div>
        {st.address && (
          <div className="border-t pt-2 text-xs">
            <span className="text-muted-foreground block">
              {isGu ? "સરનામું" : "Address"}
            </span>
            <p className="text-foreground font-semibold">{st.address}</p>
          </div>
        )}
        {st.notes && (
          <div className="border-t pt-2 text-xs">
            <span className="text-muted-foreground block">
              {isGu ? "નોંધ" : "Notes"}
            </span>
            <p className="text-foreground font-semibold italic">{st.notes}</p>
          </div>
        )}
      </div>

      {/* Payment & Receipt History */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-foreground">Fee Receipts</p>
          <Link to="/fees" className="text-xs font-bold text-primary underline">
            + New Receipt
          </Link>
        </div>
        {pays.length ? (
          pays.map((p) => (
            <div
              key={p.id}
              className="flex justify-between items-center border-t py-2.5 first:border-t-0 text-xs"
            >
              <div>
                <b className="text-primary font-black">
                  {formatReceiptNumber(p)}
                </b>
                <p className="text-muted-foreground">
                  {niceDate(p.date)} · {p.method}
                </p>
              </div>
              <div className="text-right">
                <b
                  className={`text-sm font-black ${
                    p.voided ? "line-through text-muted-foreground" : "text-success"
                  }`}
                >
                  {rupee(p.amount)}
                </b>
                {p.voided && (
                  <span className="chip bg-destructive text-destructive-foreground text-[9px] block">
                    VOID
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            No receipts recorded yet.
          </p>
        )}
      </div>

      {/* Recent Attendance */}
      <div className="card">
        <p className="mb-2 font-bold text-foreground">Recent Attendance</p>
        {recs.length ? (
          recs.map((r) => (
            <div
              key={r.date + r.batchId}
              className="flex justify-between items-center border-t py-2 first:border-t-0 text-xs"
            >
              <span className="font-semibold">{niceDate(r.date)}</span>
              <span
                className={`chip ${
                  r.present.includes(st.id)
                    ? "bg-success-soft text-success"
                    : "bg-danger-soft text-destructive"
                }`}
              >
                {r.present.includes(st.id) ? "Present" : "Absent"}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            No attendance marked yet.
          </p>
        )}
      </div>

      {/* Archive Student Button */}
      {!st.archived && (
        <button
          type="button"
          className="btn w-full border border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => setArchiveConfirm(true)}
        >
          <Archive className="size-4 mr-2" /> Archive Student
        </button>
      )}

      {/* EDIT STUDENT SHEET */}
      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Student Profile"
      >
        <div className="space-y-3 pb-6">
          <div>
            <label className="label">Student Name *</label>
            <input
              className="field font-bold"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Student Phone</label>
              <input
                className="field"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Parent Phone</label>
              <input
                className="field"
                inputMode="tel"
                value={form.parentPhone}
                onChange={(e) =>
                  setForm({ ...form, parentPhone: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Standard</label>
              <input
                className="field"
                placeholder="e.g. 10th"
                value={form.standard}
                onChange={(e) => setForm({ ...form, standard: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Batch *</label>
              <select
                className="field"
                value={form.batchId}
                onChange={(e) => setForm({ ...form, batchId: e.target.value })}
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
            <label className="label">School</label>
            <input
              className="field"
              placeholder="e.g. Shree Vidhyalaya"
              value={form.school}
              onChange={(e) => setForm({ ...form, school: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Monthly Fee (₹)</label>
              <input
                className="field"
                inputMode="numeric"
                value={form.monthlyFee}
                onChange={(e) =>
                  setForm({
                    ...form,
                    monthlyFee: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </div>
            <div>
              <label className="label">Total Fee (₹)</label>
              <input
                className="field"
                inputMode="numeric"
                value={form.totalFee}
                onChange={(e) =>
                  setForm({
                    ...form,
                    totalFee: e.target.value.replace(/\D/g, ""),
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Fee Due Date</label>
            <input
              className="field"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Address</label>
            <input
              className="field"
              placeholder="e.g. Nikol, Ahmedabad"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Notes / Remarks</label>
            <textarea
              className="field min-h-20 py-2 text-sm"
              placeholder="Any special remarks..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <Button className="w-full h-12 text-base font-bold" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </div>
      </Sheet>

      {/* CONFIRM ARCHIVE DIALOG */}
      <ConfirmDialog
        open={archiveConfirm}
        onOpenChange={setArchiveConfirm}
        title={isGu ? `${displayName} ને આર્કાઇવ કરો?` : `Archive ${st.name}?`}
        description={
          isGu
            ? `${displayName} સક્રિય વિદ્યાર્થીઓની યાદીમાંથી દૂર થશે, પરંતુ તેમની હાજરી અને ફી હિસ્ટ્રી સચવાયેલી રહેશે.`
            : `${st.name} will be removed from the active student list, but their attendance, payment and receipt history will remain safely available.`
        }
        confirmLabel={isGu ? "વિદ્યાર્થી આર્કાઇવ કરો" : "Archive Student"}
        variant="destructive"
        onConfirm={handleArchive}
      />

      {/* RECORD TEST MARK SHEET */}
      <Sheet
        open={testMarkModalOpen}
        onClose={() => setTestMarkModalOpen(false)}
        title={isGu ? `${displayName} ના પરીક્ષા ગુણ દાખલ કરો` : `Record Test Marks — ${st.name}`}
      >
        <form onSubmit={handleSaveTestMark} className="space-y-3 pb-6">
          <div>
            <label className="label">
              {isGu ? "પરીક્ષાનું નામ" : "Test Name"} <span className="text-destructive">*</span>
            </label>
            <input
              required
              list="conducted-tests-list"
              className="field font-semibold"
              placeholder={isGu ? "દા.ત. Unit Test 1 અથવા ગણિત માસિક ટેસ્ટ" : "e.g. Unit Test 1 or Chapter 3 Test"}
              value={testMarkDraft.testName}
              onChange={(e) => {
                const val = e.target.value;
                const match = (s.tests || []).find((t) => t.name === val);
                setTestMarkDraft({
                  ...testMarkDraft,
                  testName: val,
                  subject: match?.subject ? String(match.subject) : testMarkDraft.subject,
                  outOf: match?.outOf ? String(match.outOf) : testMarkDraft.outOf,
                });
              }}
            />
            <datalist id="conducted-tests-list">
              {(s.tests || []).map((t) => (
                <option key={t.id} value={String(t.name)} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">{isGu ? "વિષય" : "Subject"}</label>
              <input
                className="field"
                placeholder={isGu ? "દા.ત. ગણિત, વિજ્ઞાન" : "e.g. Mathematics"}
                value={testMarkDraft.subject}
                onChange={(e) => setTestMarkDraft({ ...testMarkDraft, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{isGu ? "પરીક્ષા તારીખ" : "Exam Date"}</label>
              <input
                type="date"
                required
                className="field"
                value={testMarkDraft.date}
                onChange={(e) => setTestMarkDraft({ ...testMarkDraft, date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">
                {isGu ? "મેળવેલ ગુણ" : "Marks Scored"} <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                className="field font-bold text-lg"
                placeholder="45"
                value={testMarkDraft.score}
                onChange={(e) => setTestMarkDraft({ ...testMarkDraft, score: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{isGu ? "કુલ ગુણ (Max)" : "Total Out Of"}</label>
              <input
                type="number"
                min="1"
                required
                className="field font-bold text-lg"
                placeholder="50"
                value={testMarkDraft.outOf}
                onChange={(e) => setTestMarkDraft({ ...testMarkDraft, outOf: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">{isGu ? "અભિપ્રાય / ખાસ નોંધ (વૈકલ્પિક)" : "Remarks (Optional)"}</label>
            <input
              className="field"
              placeholder={isGu ? "દા.ત. ખૂબ સરસ પરિણામ" : "e.g. Excellent performance"}
              value={testMarkDraft.remarks}
              onChange={(e) => setTestMarkDraft({ ...testMarkDraft, remarks: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full h-12 text-base font-bold mt-2">
            {isGu ? "પરીક્ષાના ગુણ સાચવો" : "Save Test Marks"}
          </Button>
        </form>
      </Sheet>

      {/* STUDENT PROGRESS REPORT MODAL */}
      {reportOpen && (
        <StudentReportModal
          student={st}
          batch={batch}
          settings={s.settings}
          onClose={() => setReportOpen(false)}
        />
      )}
    </AppShell>
  );
}
