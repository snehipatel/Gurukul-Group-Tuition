import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { loadAll, saveParts } from "@/lib/cloud.functions";
import {
  toGujaratiName,
  getStudentDisplayName,
  getLanguage,
  formatGujaratiDate,
} from "@/lib/i18n";
import { OFFICIAL_STATE } from "@/lib/initial-data";

export type Batch = {
  id: string;
  name: string;
  standard: string;
  facultyId?: string | undefined;
  time: string;
  days: string;
  subjects?: string | undefined;
  classroom?: string | undefined;
  capacity?: number | undefined;
  archived?: boolean | undefined;
};

export type Student = {
  id: string;
  name: string;
  nameGu?: string | undefined;
  phone: string;
  parentPhone: string;
  batchId: string;
  standard?: string | undefined;
  school?: string | undefined;
  address?: string | undefined;
  notes?: string | undefined;
  monthlyFee?: number | undefined;
  totalFee?: number | undefined;
  dueDate?: string | undefined;
  joined: string;
  archived?: boolean | undefined;
  grNo?: number | undefined;
};

export type Faculty = {
  id: string;
  name: string;
  nameGu?: string | undefined;
  subject: string;
  phone: string;
  qualification?: string | undefined;
  joiningDate?: string | undefined;
  notes?: string | undefined;
  archived?: boolean | undefined;
};

export type TimetableEntry = {
  id: string;
  day: string; // e.g. "Monday"
  time: string; // e.g. "04:00 PM"
  batchId: string;
  subject: string;
  facultyId: string;
  classroom?: string;
  archived?: boolean;
};

export type AttendanceRecord = {
  date: string;
  batchId: string;
  absent: string[];
  present: string[];
  updatedAt?: string;
};

export type Payment = {
  id: string;
  receiptNo: number;
  receiptNumber?: string;
  studentId: string;
  amount: number;
  method: string;
  date: string;
  month: string;
  purpose?: string;
  note?: string;
  remarks?: string;
  previousPaid?: number;
  balance?: number;
  totalFee?: number;
  studentStandard?: string;
  batchName?: string;
  createdAt?: string;
  archived?: boolean;
  voided?: boolean;
  voidReason?: string;
  voidedAt?: string;
};

export type Settings = {
  name: string;
  address: string;
  phone: string;
  waTemplate: string;
};

export type RecordItem = {
  id: string;
  [key: string]: string | number | boolean | undefined;
};

export type State = {
  batches: Batch[];
  students: Student[];
  faculty: Faculty[];
  timetable: TimetableEntry[];
  attendance: AttendanceRecord[];
  facultyAttendance: Record<string, Record<string, "P" | "A">>;
  payments: Payment[];
  tests: RecordItem[];
  marks: RecordItem[];
  expenses: RecordItem[];
  feePlans: RecordItem[];
  salaries: RecordItem[];
  settings: Settings;
  nextReceipt: number;
};

export const today = () => new Date().toISOString().slice(0, 10);
export const thisMonth = () => today().slice(0, 7);
export const uid = () => Math.random().toString(36).slice(2, 10);
export const rupee = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const niceDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

export const formatReceiptNumber = (p: { receiptNo: number; date?: string; receiptNumber?: string }) => {
  if (p.receiptNumber) return p.receiptNumber;
  const year = (p.date || today()).slice(0, 4);
  return `GGT-${year}-${String(p.receiptNo).padStart(5, "0")}`;
};

export const formatStudentId = (st: { id: string; grNo?: number }) => {
  if (st.grNo) return `GR-${String(st.grNo).padStart(3, "0")}`;
  const digits = st.id.replace(/\D/g, "");
  const num = digits ? String(Number(digits) + 2100).padStart(5, "0") : "02101";
  return `GGT-STU-${num}`;
};

const seed = (): State => ({
  ...OFFICIAL_STATE,
  settings: {
    ...OFFICIAL_STATE.settings,
    waTemplate: "*Gurukul Group Tuition*\nToday's Absentees — {DATE}\nBatch: {BATCH}\n\n{ABSENT_STUDENTS}\n\nTotal absent: {ABSENT_COUNT}",
  },
});

function cleanDummyData(s: Partial<State>): Partial<State> {
  const dummyStudentIds = new Set(["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11"]);
  const dummyFacultyIds = new Set(["f1", "f2", "f3"]);
  const dummyBatchIds = new Set(["b1", "b2", "b3"]);
  const dummyPaymentIds = new Set(["p1", "p2"]);
  const dummyTestIds = new Set(["test1", "test2"]);
  const dummyMarkIds = new Set(["m1", "m2"]);
  const dummyExpenseIds = new Set(["e1", "e2"]);
  const dummyPlanIds = new Set(["fp1", "fp2"]);
  const dummySalaryIds = new Set(["sal1"]);

  return {
    ...s,
    students: (s.students || []).filter((st) => !dummyStudentIds.has(st.id) && st.name !== "Rahul Patel"),
    faculty: (s.faculty || []).filter((f) => !dummyFacultyIds.has(f.id) && f.name !== "Rakesh Sir" && f.name !== "Amit Sir" && f.name !== "Neha Ma'am"),
    batches: (s.batches || []).filter((b) => !dummyBatchIds.has(b.id)),
    payments: (s.payments || []).filter((p) => !dummyPaymentIds.has(p.id)),
    attendance: (s.attendance || []).filter((a) => !dummyBatchIds.has(a.batchId)),
    facultyAttendance: Object.fromEntries(
      Object.entries(s.facultyAttendance || {}).map(([date, rec]) => [
        date,
        Object.fromEntries(Object.entries(rec).filter(([fId]) => !dummyFacultyIds.has(fId))),
      ]).filter(([, rec]) => Object.keys(rec).length > 0)
    ),
    tests: (s.tests || []).filter((t) => !dummyTestIds.has(t.id)),
    marks: (s.marks || []).filter((m) => !dummyMarkIds.has(m.id)),
    expenses: (s.expenses || []).filter((e) => !dummyExpenseIds.has(e.id)),
    feePlans: (s.feePlans || []).filter((fp) => !dummyPlanIds.has(fp.id)),
    salaries: (s.salaries || []).filter((sal) => !dummySalaryIds.has(sal.id)),
  };
}

function normalizeState(s: State): State {
  const cleaned = cleanDummyData(s);
  const baseSeed = seed();
  const studentsToUse = (!cleaned.students || cleaned.students.length === 0)
    ? baseSeed.students
    : cleaned.students;
  const batchesToUse = (!cleaned.batches || cleaned.batches.length === 0)
    ? baseSeed.batches
    : cleaned.batches;
  const facultyToUse = (!cleaned.faculty || cleaned.faculty.length === 0)
    ? baseSeed.faculty
    : cleaned.faculty;
  const paymentsToUse = (!cleaned.payments || cleaned.payments.length === 0)
    ? baseSeed.payments
    : cleaned.payments;
  const expensesToUse = (!cleaned.expenses || cleaned.expenses.length === 0)
    ? baseSeed.expenses
    : cleaned.expenses;
  const nextReceiptToUse = Math.max(
    cleaned.nextReceipt || 139,
    baseSeed.nextReceipt,
    ...paymentsToUse.map((p) => (p.receiptNo || 0) + 1)
  );

  return {
    ...baseSeed,
    ...cleaned,
    batches: batchesToUse,
    students: studentsToUse.map((st) => ({
      ...st,
      nameGu: st.nameGu || toGujaratiName(st.name),
    })),
    faculty: facultyToUse.map((f) => ({
      ...f,
      nameGu: f.nameGu || toGujaratiName(f.name),
    })),
    payments: paymentsToUse,
    expenses: expensesToUse,
    nextReceipt: nextReceiptToUse,
  };
}

const KEY = "gurukul-v2";
const serverState = normalizeState(seed());
let state: State = serverState;
if (typeof window !== "undefined") {
  try {
    localStorage.removeItem("gurukul-v1");
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = normalizeState({ ...seed(), ...parsed });
    } else {
      state = normalizeState(seed());
      saveLocalCache();
    }
  } catch {
    state = normalizeState(seed());
  }
}
const listeners = new Set<() => void>();
let saveQueue: Promise<void> = Promise.resolve();
let cloudReady = false;

function publish() { listeners.forEach((l) => l()); }
function saveLocalCache() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Cloud remains the durable copy. */ }
}

function saveCloud() {
  if (!cloudReady) return Promise.resolve();
  saveLocalCache();
  const snapshot = JSON.stringify(state);
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    try {
      await saveParts({ data: { parts: snapshot } });
    } catch {
      // Local cache already preserved
    }
  });
  return saveQueue;
}

export async function flushCloud() {
  await saveQueue;
}

export async function hydrateFromCloud() {
  const localCopy = typeof window === "undefined" ? null : localStorage.getItem(KEY);
  try {
    const remote = await loadAll();
    if (remote?.parts) {
      state = normalizeState({ ...seed(), ...(JSON.parse(remote.parts) as Partial<State>) });
    } else if (localCopy) {
      state = normalizeState({ ...seed(), ...(JSON.parse(localCopy) as Partial<State>) });
      cloudReady = true;
      saveLocalCache();
      await saveCloud();
    } else {
      state = normalizeState(seed());
    }
  } catch {
    if (localCopy) {
      state = normalizeState({ ...seed(), ...(JSON.parse(localCopy) as Partial<State>) });
    } else {
      state = normalizeState(seed());
    }
  }
  cloudReady = true;
  saveLocalCache();
  try { await saveCloud(); } catch {}
  publish();
}

export function clearLocalCache() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  cloudReady = false;
  state = seed();
  publish();
}

export function update(fn: (s: State) => State) {
  state = fn(state);
  saveLocalCache();
  publish();
  void saveCloud().catch(() => undefined);
}

export function useStore() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => serverState,
  );
}

// Derived helpers
export function studentTotalFee(st?: Student | null): number {
  if (!st) return 30000;
  return st.totalFee || 30000;
}

export function totalPaid(s: State, studentId: string): number {
  return s.payments
    .filter((p) => p.studentId === studentId && !p.archived && !p.voided)
    .reduce((a, p) => a + p.amount, 0);
}

export function paidThisMonth(s: State, studentId: string): number {
  const m = thisMonth();
  return s.payments
    .filter(
      (p) =>
        p.studentId === studentId &&
        p.month === m &&
        !p.archived &&
        !p.voided
    )
    .reduce((a, p) => a + p.amount, 0);
}

// Calculate remaining balance strictly out of ENTIRE academic fee
export function pendingFor(s: State, st: Student): number {
  return Math.max(0, studentTotalFee(st) - totalPaid(s, st.id));
}

// Student Attendance Statistics (Present days, Absent days, Total sessions, Percentage)
export function studentAttendanceStats(s: State, studentId: string) {
  const recs = s.attendance.filter(
    (r) => r.present.includes(studentId) || r.absent.includes(studentId)
  );
  const present = recs.filter((r) => r.present.includes(studentId)).length;
  const absent = recs.filter((r) => r.absent.includes(studentId)).length;
  const total = recs.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;
  return { present, absent, total, pct, records: recs };
}

export function attendancePct(s: State, studentId: string): number | null {
  const stats = studentAttendanceStats(s, studentId);
  return stats.pct;
}

// Faculty Attendance Statistics (Present days, Absent days, Total days, Percentage, Detailed log)
export function facultyAttendanceStats(s: State, facultyId: string) {
  const dates = Object.keys(s.facultyAttendance || {}).sort().reverse();
  const records: { date: string; status: "P" | "A" }[] = [];
  let present = 0;
  let absent = 0;

  for (const d of dates) {
    const dayRec = s.facultyAttendance[d];
    if (dayRec && dayRec[facultyId]) {
      const status = dayRec[facultyId];
      if (status === "P") present++;
      if (status === "A") absent++;
      records.push({ date: d, status });
    }
  }

  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;
  return { present, absent, total, pct, records };
}

export function formatMonthLabel(monthStr: string, isGu: boolean) {
  if (!monthStr || monthStr.length < 7) return monthStr;
  const [year, month] = monthStr.split("-");
  const monthNum = Number(month);
  const guMonths = [
    "જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન",
    "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"
  ];
  const enMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const mName = isGu ? guMonths[monthNum - 1] : enMonths[monthNum - 1];
  return `${mName || month} ${year}`;
}

export function formatDayDate(dateStr: string, isGu: boolean) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return isGu
      ? d.toLocaleDateString("gu-IN", { weekday: "short", day: "2-digit", month: "short" })
      : d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

// Attendance Statistics for a Faculty Member
export function facultyMonthlyStats(s: State, facultyId: string, monthStr = thisMonth()) {
  const datesInMonth = Object.keys(s.facultyAttendance || {})
    .filter((d) => d.startsWith(monthStr))
    .sort();

  const presentDates: string[] = [];
  const absentDates: string[] = [];

  for (const d of datesInMonth) {
    const dayRec = s.facultyAttendance[d];
    if (dayRec && dayRec[facultyId]) {
      if (dayRec[facultyId] === "P") presentDates.push(d);
      if (dayRec[facultyId] === "A") absentDates.push(d);
    }
  }

  const present = presentDates.length;
  const absent = absentDates.length;
  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  return {
    month: monthStr,
    present,
    absent,
    total,
    pct,
    absentDates,
    presentDates,
  };
}

export function facultyAllMonthsHistory(s: State, facultyId: string) {
  const allMonths = new Set<string>();
  Object.keys(s.facultyAttendance || {}).forEach((d) => {
    if (d.length >= 7) allMonths.add(d.slice(0, 7));
  });
  allMonths.add(thisMonth());
  const sortedMonths = Array.from(allMonths).sort().reverse();
  return sortedMonths.map((m) => facultyMonthlyStats(s, facultyId, m));
}

// Monthly Attendance for a Student with Absent Dates
export function studentMonthlyStats(s: State, studentId: string, monthStr = thisMonth()) {
  const recs = s.attendance.filter(
    (r) =>
      r.date.startsWith(monthStr) &&
      (r.present.includes(studentId) || r.absent.includes(studentId))
  );

  const presentDates = recs.filter((r) => r.present.includes(studentId)).map((r) => r.date).sort();
  const absentDates = recs.filter((r) => r.absent.includes(studentId)).map((r) => r.date).sort();
  const present = presentDates.length;
  const absent = absentDates.length;
  const total = present + absent;
  const pct = total > 0 ? Math.round((present / total) * 100) : null;

  return {
    month: monthStr,
    present,
    absent,
    total,
    pct,
    absentDates,
    presentDates,
  };
}

export function studentAllMonthsHistory(s: State, studentId: string) {
  const allMonths = new Set<string>();
  (s.attendance || []).forEach((r) => {
    if (r.date.length >= 7) allMonths.add(r.date.slice(0, 7));
  });
  allMonths.add(thisMonth());
  const sortedMonths = Array.from(allMonths).sort().reverse();
  return sortedMonths.map((m) => studentMonthlyStats(s, studentId, m));
}

// Student Test Records Helper
export function getStudentTestMarks(s: State, student: Student) {
  const studentMarks = (s.marks || []).filter(
    (m) =>
      m.studentId === student.id ||
      String(m.student || "").toLowerCase() === student.name.toLowerCase() ||
      (student.nameGu &&
        String(m.student || "").toLowerCase() === student.nameGu.toLowerCase())
  );

  return studentMarks.map((m) => {
    const testItem = (s.tests || []).find(
      (t) => t.id === m.testId || String(t.name) === String(m.test)
    );
    const score = Number(m.score || 0);
    const outOf = Number(m.outOf || testItem?.outOf || 50);
    const pct = outOf > 0 ? Math.round((score / outOf) * 100) : 0;
    return {
      id: m.id,
      testId: (m.testId as string) || testItem?.id || "",
      testName: String(m.test || testItem?.name || "Academic Test"),
      subject: String(testItem?.subject || "General"),
      date: String(testItem?.date || today()),
      score,
      outOf,
      pct,
      remarks:
        (m.remarks as string) ||
        (pct >= 85 ? "Excellent" : pct >= 65 ? "Good" : pct >= 40 ? "Pass" : "Needs Improvement"),
    };
  });
}

export function buildWaMessage(s: State, rec: AttendanceRecord, lang?: "en" | "gu") {
  const b = s.batches.find((x) => x.id === rec.batchId);
  const f = s.faculty.find((x) => x.id === b?.facultyId);
  const isGu = (lang || getLanguage()) === "gu";
  const nm = (id: string) => {
    const st = s.students.find((x) => x.id === id);
    return st ? getStudentDisplayName(st, isGu ? "gu" : "en") : "";
  };
  return s.settings.waTemplate
    .replaceAll("{DATE}", isGu ? formatGujaratiDate(rec.date) : niceDate(rec.date))
    .replaceAll("{BATCH}", b?.name ?? "")
    .replaceAll("{STANDARD}", b?.standard ?? "")
    .replaceAll(
      "{FACULTY}",
      f ? (isGu ? (f.nameGu || toGujaratiName(f.name)) : f.name) : ""
    )
    .replaceAll("{PRESENT_COUNT}", String(rec.present.length))
    .replaceAll("{ABSENT_COUNT}", String(rec.absent.length))
    .replaceAll(
      "{ABSENT_STUDENTS}",
      rec.absent.length
        ? rec.absent.map(nm).join("\n")
        : isGu
        ? "આજે કોઈ ગેરહાજર નથી 🎉"
        : "No absentees today 🎉"
    );
}
export const openWhatsApp = (text: string, phone = "") =>
  window.open(`https://wa.me/${phone ? "91" + phone : ""}?text=${encodeURIComponent(text)}`, "_blank");
