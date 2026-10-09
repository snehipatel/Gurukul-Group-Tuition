import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FileText,
  Search,
  Download,
  Share2,
  Printer,
  MessageCircle,
  X,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Ban,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCheck,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  generateReceiptPdf,
  downloadReceiptPdf,
  getReceiptPdfBlob,
  numberToWords,
} from "@/lib/receipt-pdf";
import {
  useLanguage,
  numberToGujaratiWords,
  formatGujaratiDate,
  getStudentDisplayName,
} from "@/lib/i18n";
import {
  useStore,
  update,
  uid,
  today,
  thisMonth,
  rupee,
  niceDate,
  totalPaid,
  studentTotalFee,
  pendingFor,
  formatReceiptNumber,
  formatStudentId,
  openWhatsApp,
  type Payment,
  type Student,
  type Batch,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/fees")({
  head: () => ({
    meta: [
      { title: "Fees & Receipts — Gurukul Group Tuition" },
      {
        name: "description",
        content: "Generate branded fee receipts and manage tuition fee collections.",
      },
      { property: "og:title", content: "Fees & Receipts — Gurukul Group Tuition" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Fees,
});

type Tab = "create" | "history" | "overview";
type TimeFilter = "all" | "today" | "week" | "month" | "custom";

const PURPOSES = [
  "Monthly Fees",
  "Admission Fee",
  "Exam / Test Fee",
  "Study Material Fee",
  "Installment Fee",
  "Other",
];

const METHODS = ["UPI", "Cash", "Bank Transfer", "Cheque", "Other"];

function Fees() {
  const s = useStore();
  const { lang, t } = useLanguage();
  const isGu = lang === "gu";
  const [tab, setTab] = useState<Tab>("create");

  // Receipt Draft Form State
  const [draft, setDraft] = useState({
    studentId: "",
    date: today(),
    amount: "",
    purpose: "Monthly Fees",
    customPurpose: "",
    method: "UPI",
    remarks: "",
  });

  // Preview & Modal State
  const [previewPayment, setPreviewPayment] = useState<Payment | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);

  // Voiding State
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState("Duplicate entry / Correction");

  // History Search & Filters
  const [historySearch, setHistorySearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customDate, setCustomDate] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");

  const students = s.students.filter((st) => !st.archived);
  const pickedStudent = students.find((st) => st.id === draft.studentId);
  const pickedBatch = pickedStudent
    ? s.batches.find((b) => b.id === pickedStudent.batchId)
    : undefined;

  // Smart Autofill & Calculations - strictly out of ENTIRE course fee
  const totalFee = pickedStudent ? studentTotalFee(pickedStudent) : 0;

  const previouslyPaid = pickedStudent ? totalPaid(s, pickedStudent.id) : 0;
  const currentAmount = Math.max(0, Number(draft.amount) || 0);
  const remainingBalance = Math.max(
    0,
    totalFee - previouslyPaid - currentAmount
  );

  // Overview metrics
  const tToday = today();
  const tm = thisMonth();
  const collectedMonth = s.payments
    .filter((p) => p.month === tm && !p.voided && !p.archived)
    .reduce((sum, p) => sum + p.amount, 0);

  const collectedToday = s.payments
    .filter((p) => p.date === tToday && !p.voided && !p.archived)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = students.reduce((sum, st) => sum + pendingFor(s, st), 0);
  const pendingCount = students.filter((st) => pendingFor(s, st) > 0).length;
  const overdueCount = students.filter(
    (st) => pendingFor(s, st) > 0 && !!st.dueDate && st.dueDate < tToday
  ).length;

  // Filtered Receipt History
  const receipts = useMemo(() => {
    let list = [...s.payments].filter((p) => !p.archived);

    // Sort descending by date and receipt number
    list.sort(
      (a, b) => b.date.localeCompare(a.date) || b.receiptNo - a.receiptNo
    );

    // Time filter
    if (timeFilter === "today") {
      list = list.filter((p) => p.date === tToday);
    } else if (timeFilter === "week") {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      list = list.filter((p) => p.date >= weekAgo);
    } else if (timeFilter === "month") {
      list = list.filter((p) => p.month === tm);
    } else if (timeFilter === "custom" && customDate) {
      list = list.filter((p) => p.date === customDate);
    }

    // Student filter
    if (studentFilter !== "all") {
      list = list.filter((p) => p.studentId === studentFilter);
    }

    // Method filter
    if (methodFilter !== "all") {
      list = list.filter((p) => p.method === methodFilter);
    }

    // Text search
    const q = historySearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const st = s.students.find((x) => x.id === p.studentId);
        const receiptCode = formatReceiptNumber(p).toLowerCase();
        const stuId = st ? formatStudentId(st).toLowerCase() : "";
        const stuName = (st?.name || "").toLowerCase();
        const amt = String(p.amount);
        const dateStr = p.date;
        return (
          receiptCode.includes(q) ||
          stuName.includes(q) ||
          stuId.includes(q) ||
          amt.includes(q) ||
          dateStr.includes(q)
        );
      });
    }

    return list;
  }, [
    s.payments,
    s.students,
    timeFilter,
    customDate,
    studentFilter,
    methodFilter,
    historySearch,
    tToday,
    tm,
  ]);

  // Primary Action: Generate Receipt
  function handleGenerateReceipt(e: React.FormEvent) {
    e.preventDefault();

    if (!draft.studentId || !pickedStudent) {
      toast.error("Almost there! Please select a student.");
      return;
    }

    if (!currentAmount || currentAmount < 1) {
      toast.error("Almost there! Please enter the payment amount received.");
      return;
    }

    if (currentAmount > 10000000) {
      toast.error("Please enter a valid amount up to ₹1,00,00,000.");
      return;
    }

    const seqNo = s.nextReceipt || 422;
    const formattedCode = formatReceiptNumber({
      receiptNo: seqNo,
      date: draft.date,
    });

    const purposeToSave =
      draft.purpose === "Other" && draft.customPurpose.trim()
        ? draft.customPurpose.trim()
        : draft.purpose;

    const newPayment: Payment = {
      id: uid(),
      receiptNo: seqNo,
      receiptNumber: formattedCode,
      studentId: pickedStudent.id,
      amount: currentAmount,
      method: draft.method,
      date: draft.date,
      month: draft.date.slice(0, 7),
      purpose: purposeToSave,
      remarks: draft.remarks.trim(),
      note: draft.remarks.trim(),
      previousPaid: previouslyPaid,
      balance: remainingBalance,
      totalFee: totalFee,
      studentStandard:
        pickedStudent.standard || pickedBatch?.standard || "—",
      batchName: pickedBatch?.name || "—",
      createdAt: new Date().toISOString(),
    };

    // Save permanently to database / cloud store
    update((state) => ({
      ...state,
      payments: [...state.payments, newPayment],
      nextReceipt: state.nextReceipt + 1,
    }));

    toast.success(`Receipt ${formattedCode} generated successfully!`);

    // Reset draft form
    setDraft({
      studentId: "",
      date: today(),
      amount: "",
      purpose: "Monthly Fees",
      customPurpose: "",
      method: "UPI",
      remarks: "",
    });

    // Show preview modal with action buttons
    setJustGenerated(true);
    setPreviewPayment(newPayment);
  }

  // PDF Generation helpers
  function getPdf(payment: Payment) {
    const student = s.students.find((st) => st.id === payment.studentId);
    const batch = student
      ? s.batches.find((b) => b.id === student.batchId)
      : undefined;
    return generateReceiptPdf({
      payment,
      student,
      batch,
      settings: s.settings,
      lang,
    });
  }

  async function downloadPdf(payment: Payment) {
    const student = s.students.find((st) => st.id === payment.studentId);
    const batch = student
      ? s.batches.find((b) => b.id === student.batchId)
      : undefined;
    const toastId = toast.loading(
      isGu ? "પીડીએફ ડાઉનલોડ થઈ રહી છે..." : "Generating receipt PDF..."
    );
    try {
      await downloadReceiptPdf({
        payment,
        student,
        batch,
        settings: s.settings,
        lang,
      });
      toast.dismiss(toastId);
      toast.success(
        isGu ? "પહોંચ પીડીએફ ડાઉનલોડ થઈ ગઈ" : "Receipt PDF downloaded"
      );
    } catch (err) {
      console.error("Failed to generate receipt PDF:", err);
      toast.dismiss(toastId);
      toast.error(
        isGu ? "પીડીએફ બનાવવામાં ભૂલ પડી" : "Failed to generate receipt PDF"
      );
    }
  }

  async function sharePdf(payment: Payment) {
    const student = s.students.find((st) => st.id === payment.studentId);
    const batch = student
      ? s.batches.find((b) => b.id === student.batchId)
      : undefined;
    const stuName = student ? getStudentDisplayName(student, lang) : "Student";
    const filename = `Gurukul-Receipt-${formatReceiptNumber(payment)}.pdf`;
    const text = isGu
      ? `${s.settings.name}\nસત્તાવાર ફી પહોંચ ${formatReceiptNumber(payment)}\nવિદ્યાર્થી: ${stuName}\nસ્વીકારેલ રકમ: ${rupee(payment.amount)} (${payment.method})\nબાકી રકમ: ${rupee(payment.balance || 0)}`
      : `${s.settings.name}\nFee Payment Receipt ${formatReceiptNumber(payment)}\nStudent: ${stuName}\nAmount: ${rupee(payment.amount)} (${payment.method})\nRemaining Balance: ${rupee(payment.balance || 0)}`;

    const toastId = toast.loading(
      isGu ? "પીડીએફ શેર માટે તૈયાર થઈ રહી છે..." : "Preparing PDF for sharing..."
    );

    try {
      const { blob } = await getReceiptPdfBlob({
        payment,
        student,
        batch,
        settings: s.settings,
        lang,
      });
      toast.dismiss(toastId);

      const file = new File([blob], filename, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Fee Receipt — ${formatReceiptNumber(payment)}`,
          text,
          files: [file],
        });
        return;
      }
    } catch {
      toast.dismiss(toastId);
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Fee Receipt — ${formatReceiptNumber(payment)}`,
          text,
        });
        return;
      } catch {
        // cancelled
      }
    }

    await navigator.clipboard.writeText(text);
    toast.info(
      isGu
        ? "પહોંચ વિગત કોપી થઈ ગઈ. તમે પીડીએફ પણ ડાઉનલોડ કરી શકો છો."
        : "Receipt summary copied. You can paste and download the PDF."
    );
  }

  function printPdf(payment: Payment) {
    setPreviewPayment(payment);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  function buildWhatsAppText(payment: Payment) {
    const student = s.students.find((st) => st.id === payment.studentId);
    const batch = student
      ? s.batches.find((b) => b.id === student.batchId)
      : undefined;
    const stuName = student ? getStudentDisplayName(student, lang) : "Student";

    if (isGu) {
      return `*${s.settings.name}*
🧾 *સત્તાવાર ફી ચુકવણી પહોંચ*
પહોંચ નં.: ${formatReceiptNumber(payment)}
તારીખ: ${formatGujaratiDate(payment.date)}

વિદ્યાર્થી: ${stuName} (${student ? formatStudentId(student) : "—"})
ધોરણ: ${student?.standard || batch?.standard || "—"} · બેચ: ${batch?.name || "—"}

ચુકવણી હેતુ: ${payment.purpose || "ટ્યુશન ફી"}
સ્વીકારેલ રકમ: ${rupee(payment.amount)}
ચુકવણી પદ્ધતિ: ${payment.method}

*ફી હિસાબ (કુલ વાર્ષિક ફી માંથી):*
કુલ વાર્ષિક ફી: ${rupee(payment.totalFee || 0)}
અગાઉ ભરેલ: ${rupee(payment.previousPaid || 0)}
હાલ ભરેલ રકમ: ${rupee(payment.amount)}
બાકી રહેતી ફી: ${rupee(payment.balance || 0)}
${payment.remarks ? `\nનોંધ: ${payment.remarks}\n` : ""}
ગુરૂકુલ ગ્રુપ ટ્યુશન પર વિશ્વાસ મુકવા બદલ આભાર.
સંપર્ક: ${s.settings.phone || "9876543210"}`;
    }

    return `*${s.settings.name}*
🧾 *Official Fee Payment Receipt*
Receipt No: ${formatReceiptNumber(payment)}
Date: ${niceDate(payment.date)}

Student: ${stuName} (${student ? formatStudentId(student) : "—"})
Standard: ${student?.standard || batch?.standard || "—"} · Batch: ${batch?.name || "—"}

Payment For: ${payment.purpose || "Monthly Fees"}
Amount Received: ${rupee(payment.amount)}
Payment Method: ${payment.method}

*Fee Summary:*
Total Fee: ${rupee(payment.totalFee || 0)}
Previously Paid: ${rupee(payment.previousPaid || 0)}
Current Payment: ${rupee(payment.amount)}
Remaining Balance: ${rupee(payment.balance || 0)}
${payment.remarks ? `\nRemarks: ${payment.remarks}\n` : ""}
Thank you for choosing Gurukul Group Tuition.
Phone: ${s.settings.phone || "9876543210"}`;
  }

  function handleVoidConfirm() {
    if (!voidTarget) return;
    const targetId = voidTarget.id;
    update((state) => ({
      ...state,
      payments: state.payments.map((p) =>
        p.id === targetId
          ? {
              ...p,
              voided: true,
              voidReason: voidReason.trim() || "Voided by owner",
              voidedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
    toast.success(`Receipt ${formatReceiptNumber(voidTarget)} marked as VOID`);
    setVoidTarget(null);
  }

  return (
    <AppShell title={isGu ? "ફી પહોંચ" : "Fee Receipts"}>
      <div className={previewPayment ? "print:hidden space-y-4" : "space-y-4"}>
        {/* Top Workflow Switcher */}
      <div className="grid grid-cols-3 rounded-2xl border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
            tab === "create"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="size-4" />
          {isGu ? "પહોંચ બનાવો" : "Create Receipt"}
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
            tab === "history"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="size-4" />
          {isGu ? `પહોંચ ઇતિહાસ (${s.payments.length})` : `History (${s.payments.length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition ${
            tab === "overview"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="size-4" />
          {isGu ? "વિહંગાવલોકન" : "Overview"}
        </button>
      </div>

      {/* TAB 1: CREATE FEE RECEIPT (PRIMARY WORKFLOW) */}
      {tab === "create" && (
        <section className="space-y-4">
          {/* Header Receipt Book Banner */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                  {isGu ? "ગુરુકુળ ડિજિટલ પહોંચ પુસ્તિકા" : "Gurukul Digital Receipt Book"}
                </span>
                <h2 className="text-lg font-black text-foreground">
                  {isGu ? "નવી ફી પહોંચ" : "New Fee Receipt"}
                </h2>
              </div>
              <div className="rounded-xl border border-primary/20 bg-card px-3 py-1.5 text-right shadow-sm">
                <span className="block text-[10px] font-bold text-muted-foreground">
                  {isGu ? "આગામી પહોંચ નં." : "Next Receipt No."}
                </span>
                <span className="text-sm font-black text-primary">
                  {formatReceiptNumber({
                    receiptNo: s.nextReceipt || 422,
                    date: draft.date,
                  })}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isGu
                ? "ચુકવણી નોંધવા અને સત્તાવાર બ્રાન્ડેડ પહોંચ બનાવવા માટે નીચેની વિગતો ભરો."
                : "Fill receipt details below to automatically record payment and generate an official branded PDF."}
            </p>
          </div>

          <form onSubmit={handleGenerateReceipt} className="space-y-4">
            {/* 1. Student Information Card */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {isGu ? "૧. વિદ્યાર્થીની વિગત" : "1. Student Information"}
                </span>
                {pickedStudent && (
                  <span className="chip bg-secondary text-primary font-bold">
                    {isGu ? "આપમેળે ભરેલ" : "Autofilled"}
                  </span>
                )}
              </div>

              <div>
                <label className="label" htmlFor="student-select">
                  {isGu ? "વિદ્યાર્થીનું નામ" : "Student Name"} <span className="text-destructive">*</span>
                </label>
                <select
                  id="student-select"
                  required
                  className="field text-base font-semibold"
                  value={draft.studentId}
                  onChange={(e) =>
                    setDraft({ ...draft, studentId: e.target.value })
                  }
                >
                  <option value="">{isGu ? "વિદ્યાર્થી પસંદ કરો ▼" : "Select Student ▼"}</option>
                  {students.map((st) => {
                    const b = s.batches.find((batch) => batch.id === st.batchId);
                    return (
                      <option key={st.id} value={st.id}>
                        {getStudentDisplayName(st, lang)} ({b?.standard || "—"} - {b?.name || "—"})
                      </option>
                    );
                  })}
                </select>
              </div>

              {pickedStudent ? (
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/60 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      {isGu ? "વિદ્યાર્થી આઈડી" : "Student ID"}
                    </span>
                    <b className="font-extrabold text-foreground">
                      {formatStudentId(pickedStudent)}
                    </b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      {isGu ? "ધોરણ" : "Standard"}
                    </span>
                    <b className="font-extrabold text-foreground">
                      {pickedStudent.standard || pickedBatch?.standard || "10th"}
                    </b>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      {isGu ? "બેચ" : "Batch"}
                    </span>
                    <b className="font-extrabold text-foreground">
                      {pickedBatch?.name || "10-A"}
                    </b>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                  {isGu
                    ? "વિદ્યાર્થી પસંદ કરવાથી આઈડી, ધોરણ, બેચ અને અગાઉની ફી હિસાબ આપમેળે આવી જશે."
                    : "Select a student to automatically load ID, Standard, Batch and previous fee history."}
                </p>
              )}
            </div>

            {/* 2. Payment Information Card */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
              <span className="block border-b pb-2 text-xs font-bold uppercase tracking-wider text-primary">
                {isGu ? "૨. ચુકવણી વિગત" : "2. Payment Information"}
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="receipt-date">
                    {isGu ? "પહોંચ તારીખ" : "Receipt Date"}
                  </label>
                  <input
                    id="receipt-date"
                    type="date"
                    required
                    max={today()}
                    className="field text-sm font-semibold"
                    value={draft.date}
                    onChange={(e) =>
                      setDraft({ ...draft, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label" htmlFor="receipt-method">
                    {isGu ? "ચુકવણી પદ્ધતિ" : "Payment Method"}
                  </label>
                  <select
                    id="receipt-method"
                    className="field text-sm font-semibold"
                    value={draft.method}
                    onChange={(e) =>
                      setDraft({ ...draft, method: e.target.value })
                    }
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label" htmlFor="receipt-amount">
                  {isGu ? "મળેલ રકમ (₹)" : "Amount Received (₹)"} <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xl font-bold text-muted-foreground">
                    ₹
                  </span>
                  <input
                    id="receipt-amount"
                    inputMode="numeric"
                    required
                    min="1"
                    max="10000000"
                    placeholder={isGu ? "દા.ત. 5000" : "Enter amount (e.g. 5000)"}
                    className="field pl-8 text-2xl font-black text-foreground"
                    value={draft.amount}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        amount: e.target.value.replace(/\D/g, "").slice(0, 8),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="label">{isGu ? "ચુકવણી હેતુ" : "Payment For"}</label>
                <div className="flex flex-wrap gap-1.5">
                  {PURPOSES.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setDraft({ ...draft, purpose: p })}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        draft.purpose === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {p === "Monthly Fees" && isGu ? "ટ્યુશન ફી" : p}
                    </button>
                  ))}
                </div>
                {draft.purpose === "Other" && (
                  <input
                    type="text"
                    maxLength={100}
                    placeholder={isGu ? "ચુકવણીનું કારણ લખો..." : "Specify payment reason..."}
                    className="field mt-2 text-sm"
                    value={draft.customPurpose}
                    onChange={(e) =>
                      setDraft({ ...draft, customPurpose: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            {/* 3. Fee Information (Smart Live Calculations - strictly from ENTIRE course fee) */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  {isGu ? "૩. ફી ગણતરી (કુલ ફી માંથી)" : "3. Fee Calculations (Out of Entire Fee)"}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {isGu ? "આપમેળે ગણતરી થયેલ" : "Calculated automatically"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-card p-2.5 border">
                  <span className="text-xs text-muted-foreground block">
                    {isGu ? "કુલ શૈક્ષણિક ફી" : "Total Course Fee"}
                  </span>
                  <b className="text-base font-extrabold text-foreground">
                    {rupee(totalFee)}
                  </b>
                </div>
                <div className="rounded-xl bg-card p-2.5 border">
                  <span className="text-xs text-muted-foreground block">
                    {isGu ? "અગાઉ જમા થયેલ ફી" : "Previously Paid"}
                  </span>
                  <b className="text-base font-extrabold text-foreground">
                    {rupee(previouslyPaid)}
                  </b>
                </div>
                <div className="rounded-xl bg-primary/10 border border-primary/30 p-2.5">
                  <span className="text-xs font-bold text-primary block">
                    {isGu ? "હાલમાં મળેલ રકમ" : "Current Payment"}
                  </span>
                  <b className="text-base font-black text-primary">
                    {rupee(currentAmount)}
                  </b>
                </div>
                <div className="rounded-xl bg-card p-2.5 border">
                  <span className="text-xs text-muted-foreground block">
                    {isGu ? "બાકી રહેતી રકમ" : "Remaining Balance"}
                  </span>
                  <b
                    className={`text-base font-extrabold ${
                      remainingBalance > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-success"
                    }`}
                  >
                    {rupee(remainingBalance)}
                  </b>
                </div>
              </div>
            </div>

            {/* 4. Optional Fields */}
            <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-2">
              <label className="label" htmlFor="receipt-remarks">
                {isGu ? "ખાસ નોંધ (વૈકલ્પિક)" : "Remarks (Optional)"}
              </label>
              <input
                id="receipt-remarks"
                type="text"
                maxLength={200}
                placeholder={isGu ? "દા.ત. પ્રથમ હપ્તો, ડિજિટલ પહોંચ" : "e.g. October Fees, Cheque #0045"}
                className="field text-sm"
                value={draft.remarks}
                onChange={(e) =>
                  setDraft({ ...draft, remarks: e.target.value })
                }
              />
            </div>

            {/* PRIMARY ACTION: GENERATE RECEIPT */}
            <Button
              type="submit"
              className="h-14 w-full rounded-2xl bg-primary text-base font-black tracking-wide text-primary-foreground shadow-lg active:scale-[0.99]"
            >
              <FileText className="size-5" />
              {isGu ? "🧾 ફી પહોંચ બનાવો" : "🧾 GENERATE RECEIPT"}
            </Button>
          </form>

          {/* Quick Shortcuts to recent receipts */}
          {receipts.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recent Receipts
                </span>
                <button
                  type="button"
                  onClick={() => setTab("history")}
                  className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                >
                  View All ({s.payments.length}) <ArrowRight className="size-3" />
                </button>
              </div>
              <div className="space-y-2">
                {receipts.slice(0, 3).map((p) => {
                  const st = s.students.find((x) => x.id === p.studentId);
                  return (
                    <div
                      key={p.id}
                      className="card flex items-center justify-between p-3"
                    >
                      <div>
                        <b className="text-sm text-primary font-black">
                          {formatReceiptNumber(p)}
                        </b>
                        <p className="text-sm font-semibold">{st ? getStudentDisplayName(st, lang) : (isGu ? "વિદ્યાર્થી" : "Student")}</p>
                        <p className="text-xs text-muted-foreground">
                          {niceDate(p.date)} · {p.method}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <b className="text-base font-extrabold text-foreground">
                          {rupee(p.amount)}
                        </b>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setJustGenerated(false);
                            setPreviewPayment(p);
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: RECEIPT HISTORY & SEARCH */}
      {tab === "history" && (
        <section className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 size-4 text-muted-foreground" />
            <input
              className="field pl-10 text-sm"
              placeholder="Search by receipt no, student, student ID, amount..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
            />
          </div>

          {/* Time Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "week", label: "This Week" },
              { id: "month", label: "This Month" },
              { id: "custom", label: "Custom Date" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTimeFilter(f.id as TimeFilter)}
                className={`chip shrink-0 px-3 py-1.5 font-bold transition ${
                  timeFilter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {timeFilter === "custom" && (
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <input
                type="date"
                className="field text-sm"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </div>
          )}

          {/* Additional Filter dropdowns */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <select
              className="field text-xs"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="all">All Students</option>
              {s.students.map((st) => (
                <option key={st.id} value={st.id}>
                  {getStudentDisplayName(st, lang)}
                </option>
              ))}
            </select>
            <select
              className="field text-xs"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All Payment Methods</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Receipts List */}
          <div className="space-y-2 pt-1">
            {receipts.map((p) => {
              const st = s.students.find((x) => x.id === p.studentId);
              const b = st
                ? s.batches.find((item) => item.id === st.batchId)
                : undefined;
              const formattedNo = formatReceiptNumber(p);

              return (
                <article
                  key={p.id}
                  className={`card transition hover:border-primary/40 ${
                    p.voided ? "border-destructive/40 bg-destructive/5 opacity-80" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-primary text-base">
                          {formattedNo}
                        </span>
                        {p.voided && (
                          <span className="chip bg-destructive text-destructive-foreground text-[10px] font-black">
                            VOID
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-foreground text-sm truncate">
                        {st ? getStudentDisplayName(st, lang) : (isGu ? "આર્કાઇવ વિદ્યાર્થી" : "Archived student")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {niceDate(p.date)} · {p.method}
                        {b ? ` · Batch ${b.name}` : ""}
                      </p>
                      {p.remarks && (
                        <p className="text-[11px] text-muted-foreground italic mt-0.5">
                          "{p.remarks}"
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <b
                        className={`text-lg font-black ${
                          p.voided ? "line-through text-muted-foreground" : "text-success"
                        }`}
                      >
                        {rupee(p.amount)}
                      </b>
                      <p className="text-[11px] text-muted-foreground">
                        Bal: {rupee(p.balance || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1.5 border-t pt-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() => {
                        setJustGenerated(false);
                        setPreviewPayment(p);
                      }}
                    >
                      <FileText className="size-3.5" /> View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() => downloadPdf(p)}
                    >
                      <Download className="size-3.5" /> PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={() => {
                        const phone = st?.parentPhone || st?.phone || "";
                        openWhatsApp(buildWhatsAppText(p), phone);
                      }}
                    >
                      <MessageCircle className="size-3.5 text-success" />
                    </Button>
                    {!p.voided && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setVoidTarget(p);
                          setVoidReason("Duplicate entry / Correction");
                        }}
                      >
                        <Ban className="size-3.5 mr-1" /> Void
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}

            {!receipts.length && (
              <div className="card py-12 text-center text-muted-foreground">
                <FileText className="mx-auto size-10 opacity-30" />
                <p className="mt-2 font-bold text-foreground">
                  No receipts found
                </p>
                <p className="text-xs">
                  {historySearch
                    ? "Try adjusting your search query or filters."
                    : "Generate your first receipt using the Create Receipt tab."}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 3: FEE OVERVIEW */}
      {tab === "overview" && (
        <section className="space-y-4">
          <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg">
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">
              Total Collections (This Month)
            </span>
            <p className="mt-1 text-4xl font-black">{rupee(collectedMonth)}</p>
            <div className="mt-4 flex justify-between border-t border-primary-foreground/20 pt-3 text-sm">
              <span>
                Today: <b>{rupee(collectedToday)}</b>
              </span>
              <span>
                Pending:{" "}
                <b className="text-amber-300">{rupee(totalPending)}</b>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <span className="text-xs font-semibold text-muted-foreground block">
                Students with Pending Fees
              </span>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {pendingCount}
              </p>
              <span className="text-xs text-muted-foreground">
                out of {students.length} students
              </span>
            </div>
            <div className="card">
              <span className="text-xs font-semibold text-muted-foreground block">
                Overdue Balances
              </span>
              <p className="text-2xl font-black text-destructive">
                {overdueCount}
              </p>
              <span className="text-xs text-muted-foreground">
                passed due date
              </span>
            </div>
          </div>

          <div className="card space-y-3">
            <h3 className="font-bold text-foreground text-sm border-b pb-2">
              Students Needing Fee Collection
            </h3>
            <div className="space-y-2">
              {students
                .filter((st) => pendingFor(s, st) > 0)
                .slice(0, 10)
                .map((st) => {
                  const due = pendingFor(s, st);
                  const b = s.batches.find((item) => item.id === st.batchId);
                  const isOver = !!st.dueDate && st.dueDate < tToday;

                  return (
                    <div
                      key={st.id}
                      className="flex items-center justify-between border-b pb-2 last:border-b-0"
                    >
                      <div>
                        <p className="font-bold text-sm">{getStudentDisplayName(st, lang)}</p>
                        <p className="text-xs text-muted-foreground">
                          {b?.name || "—"} · {st.phone || "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-extrabold block ${
                            isOver ? "text-destructive" : "text-amber-600"
                          }`}
                        >
                          {rupee(due)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft({
                              studentId: st.id,
                              date: today(),
                              amount: String(due),
                              purpose: "Monthly Fees",
                              customPurpose: "",
                              method: "UPI",
                              remarks: "Monthly fee collection",
                            });
                            setTab("create");
                          }}
                          className="text-xs font-bold text-primary underline"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  );
                })}
              {!students.some((st) => pendingFor(s, st) > 0) && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  All active students have cleared their dues! 🎉
                </p>
              )}
            </div>
          </div>
        </section>
      )}
      </div>

      {/* RECEIPT PREVIEW MODAL */}
      {previewPayment && (
        <ReceiptPreviewModal
          payment={previewPayment}
          student={s.students.find((st) => st.id === previewPayment.studentId)}
          batch={s.batches.find(
            (b) =>
              b.id ===
              s.students.find((st) => st.id === previewPayment.studentId)
                ?.batchId
          )}
          settings={s.settings}
          justGenerated={justGenerated}
          onClose={() => {
            setPreviewPayment(null);
            setJustGenerated(false);
          }}
          onDownload={() => downloadPdf(previewPayment)}
          onShare={() => sharePdf(previewPayment)}
          onPrint={() => printPdf(previewPayment)}
          onWhatsApp={() => {
            const st = s.students.find(
              (x) => x.id === previewPayment.studentId
            );
            const phone = st?.parentPhone || st?.phone || "";
            openWhatsApp(buildWhatsAppText(previewPayment), phone);
          }}
          onGenerateAnother={() => {
            setPreviewPayment(null);
            setJustGenerated(false);
            setTab("create");
          }}
        />
      )}

      {/* VOID RECEIPT CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(open: boolean) => !open && setVoidTarget(null)}
        title={`Void Receipt ${voidTarget ? formatReceiptNumber(voidTarget) : ""}?`}
        description="This receipt will be officially stamped as CANCELLED / VOID. For audit and compliance, the record is permanently retained in the archive and will not be erased."
        confirmLabel="Void Receipt"
        variant="destructive"
        onConfirm={handleVoidConfirm}
      />
    </AppShell>
  );
}

// Receipt Preview Modal Component
function ReceiptPreviewModal({
  payment,
  student,
  batch,
  settings,
  justGenerated,
  onClose,
  onDownload,
  onShare,
  onPrint,
  onWhatsApp,
  onGenerateAnother,
}: {
  payment: Payment;
  student?: Student | undefined;
  batch?: Batch | undefined;
  settings: ReturnType<typeof useStore>["settings"];
  justGenerated: boolean;
  onClose: () => void;
  onDownload: () => void | Promise<void>;
  onShare: () => void | Promise<void>;
  onPrint: () => void;
  onWhatsApp: () => void;
  onGenerateAnother: () => void;
}) {
  const { lang } = useLanguage();
  const isGu = lang === "gu";
  const receiptNo = formatReceiptNumber(payment);
  const totalFeeVal =
    payment.totalFee ||
    (student ? studentTotalFee(student) : 30000);

  return (
    <div
      className="receipt-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 flex items-center justify-center print:static print:inset-auto print:bg-white print:p-0 print:overflow-visible print:w-full print:max-w-none print:m-0 print:block"
      onClick={onClose}
    >
      <div
        className="receipt-modal-inner w-full max-w-md my-auto space-y-3 print:max-w-none print:w-full print:m-0 print:p-0 print:space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success header if freshly generated */}
        {justGenerated && (
          <div className="rounded-2xl bg-success text-primary-foreground p-3.5 text-center shadow-lg print:hidden">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-5" />
              <b className="text-base font-extrabold">
                {isGu ? "પહોંચ સફળતાપૂર્વક બની ગઈ છે" : "Receipt Generated Successfully"}
              </b>
            </div>
            <p className="text-xs font-semibold opacity-90 mt-0.5">
              {isGu ? "પહોંચ નં:" : "Receipt No:"} {receiptNo}
            </p>
          </div>
        )}

        {/* Branded Official Receipt Preview Card */}
        <section className="printable-receipt-card rounded-3xl border bg-card p-5 shadow-2xl relative overflow-hidden print:rounded-2xl print:border-2 print:border-slate-800 print:bg-white print:p-8 print:shadow-none print:w-full print:max-w-none print:min-h-[260mm] print:flex print:flex-col print:justify-between print:break-inside-avoid print:page-break-inside-avoid">
          {payment.voided && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <span className="rotate-[-25deg] rounded-2xl border-4 border-destructive bg-destructive/90 px-6 py-2 text-2xl font-black text-destructive-foreground tracking-widest shadow-xl">
                {isGu ? "રદ કરેલ / VOID" : "CANCELLED / VOID"}
              </span>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 print:pb-5">
            <div className="flex items-center gap-3 print:gap-4">
              <img
                src="/favicon.png"
                alt="Gurukul"
                className="size-11 print:size-16 rounded-xl bg-primary/10 object-contain p-1 border"
              />
              <div>
                <span className="text-[10px] print:text-xs font-extrabold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                  {settings.name || "Gurukul Group Tuition"}
                </span>
                <h3 className="text-lg print:text-2xl font-black text-foreground leading-tight">
                  {isGu ? "સત્તાવાર ફી ચુકવણી પહોંચ" : "Fee Payment Receipt"}
                </h3>
                <p className="text-[11px] print:text-xs text-muted-foreground">
                  {settings.address || "Ahmedabad, Gujarat"} · {isGu ? "ફોન:" : "Phone:"} {settings.phone || "9876543210"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted print:hidden"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Receipt Info Bar */}
          <div className="mt-3 print:mt-5 flex items-center justify-between rounded-xl bg-muted/60 print:bg-slate-100 print:border print:border-slate-300 px-3 py-2 print:px-5 print:py-3 text-xs print:text-sm">
            <div>
              <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                {isGu ? "પહોંચ નં." : "Receipt No"}
              </span>
              <b className="text-sm print:text-base font-black text-primary">{receiptNo}</b>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                {isGu ? "તારીખ" : "Date of Issue"}
              </span>
              <b className="font-extrabold text-foreground print:text-base">
                {isGu ? formatGujaratiDate(payment.date) : niceDate(payment.date)}
              </b>
            </div>
          </div>

          {/* Student Details */}
          <div className="mt-3 print:mt-6 space-y-1.5 text-xs print:text-sm">
            <span className="font-extrabold uppercase text-[10px] print:text-xs text-muted-foreground tracking-wider block border-b pb-1">
              {isGu ? "વિદ્યાર્થીની વિગત" : "STUDENT DETAILS"}
            </span>
            <div className="grid grid-cols-2 gap-y-1 print:gap-y-3.5 border-y py-2 print:py-4">
              <div>
                <span className="text-muted-foreground">{isGu ? "વિદ્યાર્થીનું નામ:" : "Student Name:"}</span>{" "}
                <b className="text-foreground">{student ? getStudentDisplayName(student, lang) : "—"}</b>
              </div>
              <div>
                <span className="text-muted-foreground">{isGu ? "વિદ્યાર્થી આઈડી:" : "Student ID:"}</span>{" "}
                <b className="text-foreground">
                  {student ? formatStudentId(student) : "—"}
                </b>
              </div>
              <div>
                <span className="text-muted-foreground">{isGu ? "ધોરણ:" : "Standard / Grade:"}</span>{" "}
                <b className="text-foreground">
                  {student?.standard || batch?.standard || "—"}
                </b>
              </div>
              <div>
                <span className="text-muted-foreground">{isGu ? "બેચ:" : "Batch Assigned:"}</span>{" "}
                <b className="text-foreground">{batch?.name || "—"}</b>
              </div>
              {student?.parentPhone && (
                <div>
                  <span className="text-muted-foreground">{isGu ? "વાલીનો સંપર્ક:" : "Parent Contact:"}</span>{" "}
                  <b className="text-foreground">{student.parentPhone}</b>
                </div>
              )}
              {student?.school && (
                <div>
                  <span className="text-muted-foreground">{isGu ? "શાળા / સંસ્થા:" : "School / Institute:"}</span>{" "}
                  <b className="text-foreground">{student.school}</b>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          <div className="mt-3 print:mt-5 space-y-1 text-xs print:text-sm">
            <span className="font-extrabold uppercase text-[10px] print:text-xs text-muted-foreground tracking-wider block border-b pb-1">
              {isGu ? "ચુકવણી વિગત" : "PAYMENT DETAILS"}
            </span>
            <div className="grid grid-cols-2 gap-y-1 print:gap-y-2 py-1 print:py-2">
              <div>
                <span className="text-muted-foreground">{isGu ? "ચુકવણી હેતુ:" : "Payment For:"}</span>{" "}
                <b className="text-foreground">{payment.purpose || (isGu ? "ટ્યુશન ફી" : "Monthly Fees")}</b>
              </div>
              <div>
                <span className="text-muted-foreground">{isGu ? "ચુકવણી પદ્ધતિ:" : "Payment Method:"}</span>{" "}
                <b className="text-foreground">{payment.method}</b>
              </div>
              <div>
                <span className="text-muted-foreground">{isGu ? "ચુકવણી સ્થિતિ:" : "Payment Status:"}</span>{" "}
                <b className="text-success font-bold">{isGu ? "ચકાસાયેલ અને જમા" : "VERIFIED & CREDITED"}</b>
              </div>
              <div>
                <span className="text-muted-foreground">{isGu ? "પહોંચ પ્રકાર:" : "Receipt Type:"}</span>{" "}
                <b className="text-foreground">{isGu ? "સત્તાવાર શૈક્ષણિક પહોંચ" : "Official Academic Receipt"}</b>
              </div>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="mt-3 print:mt-5 space-y-1 border-t pt-2 print:pt-4 text-xs print:text-sm">
            <span className="font-extrabold uppercase text-[10px] print:text-xs text-muted-foreground tracking-wider block border-b pb-1">
              {isGu ? "ફી વિગત અને બાકી રકમ (કુલ ફી માંથી)" : "FEE SUMMARY & BALANCE"}
            </span>
            <div className="space-y-1 print:space-y-2 py-1">
              <div className="flex justify-between text-muted-foreground">
                <span>{isGu ? "કુલ શૈક્ષણિક ફી:" : "Total Academic Fee:"}</span>
                <b className="text-foreground">{rupee(totalFeeVal)}</b>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isGu ? "અગાઉ જમા થયેલ:" : "Previously Paid:"}</span>
                <b className="text-foreground">{rupee(payment.previousPaid || 0)}</b>
              </div>
              <div className="flex justify-between text-primary font-bold print:bg-slate-100 print:px-3 print:py-1.5 print:rounded-lg">
                <span>{isGu ? "હાલમાં મળેલ રકમ:" : "Current Payment Received:"}</span>
                <span>{rupee(payment.amount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{isGu ? "બાકી રહેતી રકમ:" : "Remaining Balance Due:"}</span>
                <b className="text-foreground">{rupee(payment.balance || 0)}</b>
              </div>
            </div>
          </div>

          {/* Highlighted Amount */}
          <div className="mt-3 print:mt-6 rounded-2xl bg-primary/10 print:bg-amber-50 print:border-2 print:border-amber-400 border border-primary/20 p-3 print:p-5 text-center">
            <span className="text-[11px] print:text-xs font-bold uppercase tracking-wider text-primary">
              {isGu ? "મળેલ રકમ" : "AMOUNT RECEIVED"}
            </span>
            <p className="text-3xl print:text-4xl font-black text-primary">
              {rupee(payment.amount)}
            </p>
            <p className="mt-1 print:mt-2 text-xs print:text-sm font-semibold italic text-muted-foreground print:text-slate-700">
              {isGu
                ? `શબ્દોમાં: ${numberToGujaratiWords(payment.amount)}`
                : `Amount in Words: ${numberToWords(payment.amount)}`}
            </p>
          </div>

          {payment.remarks && (
            <p className="mt-2.5 print:mt-4 text-center text-xs print:text-sm text-muted-foreground italic">
              {isGu ? `ખાસ નોંધ: "${payment.remarks}"` : `Remarks: "${payment.remarks}"`}
            </p>
          )}

          {/* Terms Notice */}
          <div className="mt-3 print:mt-6 text-[10px] print:text-xs text-muted-foreground print:text-slate-500 border-t print:pt-3 space-y-0.5">
            {isGu ? (
              <>
                <p>નિયમો: ૧. ભરેલ ફી કોઈપણ સંજોગોમાં પરત મળશે નહીં અથવા બદલાશે નહીં.</p>
                <p>૨. આ ગુરુકુળ ગ્રુપ ટ્યુશન દ્વારા જારી કરાયેલ સત્તાવાર ડિજિટલ રેકોર્ડ છે.</p>
                <p>૩. શૈક્ષણિક ચકાસણી અને ફી ક્લિયરન્સ માટે આ પહોંચ સાચવી રાખવી.</p>
              </>
            ) : (
              <>
                <p>Terms: 1. Fees once paid are non-refundable &amp; non-transferable.</p>
                <p>2. This is an official digital record issued by Gurukul Group Tuition.</p>
                <p>3. Please preserve this receipt for academic verification and fee clearance.</p>
              </>
            )}
          </div>

          {/* Footer note & Authorized Signature */}
          <div className="mt-5 print:mt-8 border-t pt-3 print:pt-6 flex items-end justify-between text-left">
            <div>
              <p className="text-[11px] print:text-sm font-bold text-foreground">
                {isGu ? "ગુરુકુળ ગ્રુપ ટ્યુશન પસંદ કરવા બદલ આભાર." : "Thank you for choosing Gurukul Group Tuition."}
              </p>
              <p className="text-[10px] print:text-xs text-muted-foreground">
                {isGu ? "ગુણવત્તાયુક્ત શિક્ષણ અને ઉત્કૃષ્ટ પરિણામ માટે કટિબદ્ધ." : "Committed to quality education & academic excellence."}
              </p>
              <p className="text-[9px] print:text-[11px] text-muted-foreground">
                {isGu ? "સત્તાવાર ઇલેક્ટ્રોનિક ફી પહોંચ" : "Official electronic payment receipt"}
              </p>
            </div>
            <div className="text-center flex flex-col items-center">
              <img
                src="/SIGNATURE.png"
                alt="Authorized Signature"
                className="h-9 print:h-12 w-auto object-contain -mb-1 print:-mb-1.5"
              />
              <div className="w-28 print:w-44 border-b-2 border-foreground/60 mb-1" />
              <p className="text-xs print:text-sm font-black text-foreground uppercase tracking-wide">
                SUNIL PATEL {isGu && <span className="font-bold text-[11px]">(સુનિલ પટેલ)</span>}
              </p>
              <p className="text-[10px] print:text-xs font-semibold text-muted-foreground">
                {isGu ? "અધિકૃત સહી" : "Authorized Signature"}
              </p>
              <p className="text-[9px] print:text-xs text-muted-foreground">
                {settings.name || "Gurukul Group Tuition"}
              </p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2 print:hidden">
          <Button
            variant="secondary"
            className="h-12 flex-col gap-0.5 px-1 text-xs font-bold"
            onClick={onDownload}
          >
            <Download className="size-4" /> {isGu ? "પીડીએફ" : "Download PDF"}
          </Button>
          <Button
            variant="secondary"
            className="h-12 flex-col gap-0.5 px-1 text-xs font-bold"
            onClick={onShare}
          >
            <Share2 className="size-4" /> {isGu ? "શેર" : "Share"}
          </Button>
          <Button
            variant="secondary"
            className="h-12 flex-col gap-0.5 px-1 text-xs font-bold"
            onClick={onPrint}
          >
            <Printer className="size-4" /> {isGu ? "પ્રિન્ટ" : "Print"}
          </Button>
          <Button
            className="h-12 flex-col gap-0.5 bg-success px-1 text-xs font-bold text-primary-foreground hover:bg-success/90"
            onClick={onWhatsApp}
          >
            <MessageCircle className="size-4" /> {isGu ? "વોટ્સએપ" : "WhatsApp"}
          </Button>
        </div>

        {justGenerated && (
          <Button
            variant="outline"
            className="h-11 w-full rounded-xl font-bold print:hidden"
            onClick={onGenerateAnother}
          >
            <PlusCircle className="size-4 mr-1.5" /> {isGu ? "બીજી પહોંચ બનાવો" : "Generate Another Receipt"}
          </Button>
        )}
      </div>
    </div>
  );
}