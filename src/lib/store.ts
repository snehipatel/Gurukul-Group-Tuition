import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { loadAll, saveParts } from "@/lib/cloud.functions";
import {
  toGujaratiName,
  getStudentDisplayName,
  getLanguage,
  formatGujaratiDate,
} from "@/lib/i18n";

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
  monthlyFee: number;
  totalFee?: number | undefined;
  dueDate?: string | undefined;
  joined: string;
  archived?: boolean | undefined;
};

export type SalaryType = "per_student" | "per_lecture";

export type Faculty = {
  id: string;
  name: string;
  nameGu?: string | undefined;
  subject: string;
  phone: string;
  salaryType?: SalaryType | undefined;
  ratePerStudent?: number | undefined;
  ratePerLecture?: number | undefined;
  salary?: number | undefined;
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

export const formatStudentId = (st: { id: string }) => {
  const digits = st.id.replace(/\D/g, "");
  const num = digits ? String(Number(digits) + 2100).padStart(5, "0") : "02101";
  return `GGT-STU-${num}`;
};

const names: [string, string, string][] = [
  ["Rahul Patel", "રાહુલ પટેલ", "b1"],
  ["Aarav Shah", "આરવ શાહ", "b1"],
  ["Dhruv Patel", "ધ્રુવ પટેલ", "b1"],
  ["Krish Shah", "ક્રિશ શાહ", "b1"],
  ["Yash Mehta", "યશ મહેતા", "b1"],
  ["Priya Desai", "પ્રિયા દેસાઈ", "b2"],
  ["Isha Joshi", "ઈશા જોશી", "b2"],
  ["Meet Trivedi", "મીત ત્રિવેદી", "b2"],
  ["Riya Parmar", "રિયા પરમાર", "b2"],
  ["Om Rathod", "ઓમ રાઠોડ", "b3"],
  ["Diya Chauhan", "દિયા ચૌહાણ", "b3"],
  ["Harsh Vora", "હર્ષ વોરા", "b3"],
];

const seed = (): State => ({
  faculty: [
    { id: "f1", name: "Rakesh Sir", nameGu: "રાકેશ સર", subject: "Mathematics", phone: "9876500001", salaryType: "per_student", ratePerStudent: 1500, salary: 18000, qualification: "M.Sc. Maths, B.Ed", joiningDate: "2024-05-01" },
    { id: "f2", name: "Amit Sir", nameGu: "અમિત સર", subject: "Science", phone: "9876500002", salaryType: "per_lecture", ratePerLecture: 600, salary: 14400, qualification: "M.Sc. Physics", joiningDate: "2024-06-15" },
    { id: "f3", name: "Neha Ma'am", nameGu: "નેહા મેડમ", subject: "English", phone: "9876500003", salaryType: "per_student", ratePerStudent: 1200, salary: 12000, qualification: "M.A. English", joiningDate: "2025-01-10" },
  ],
  batches: [
    { id: "b1", name: "10-A", standard: "10th", time: "4:00 PM", days: "Mon–Sat", subjects: "Maths, Science", classroom: "Room 1", capacity: 25 },
    { id: "b2", name: "10-B", standard: "10th", time: "5:30 PM", days: "Mon–Sat", subjects: "Science, English", classroom: "Room 2", capacity: 25 },
    { id: "b3", name: "9-A", standard: "9th", time: "7:00 PM", days: "Mon–Fri", subjects: "All Subjects", classroom: "Room 1", capacity: 20 },
  ],
  timetable: [],
  students: names.map(([name, nameGu, batchId], i) => ({
    id: "s" + i,
    name,
    nameGu,
    batchId,
    phone: "98250" + String(10000 + i),
    parentPhone: "98980" + String(20000 + i),
    standard: batchId === "b3" ? "9th" : "10th",
    school: "Shree Vidhyalaya",
    monthlyFee: batchId === "b3" ? 2000 : 2500,
    totalFee: batchId === "b3" ? 24000 : 30000,
    dueDate: "2026-10-15",
    joined: "2026-06-01",
  })),
  attendance: [
    // September records for 10-A (students s0, s1, s2, s3, s4)
    { date: "2026-09-02", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
    { date: "2026-09-05", batchId: "b1", present: ["s1", "s2", "s3", "s4"], absent: ["s0"] },
    { date: "2026-09-09", batchId: "b1", present: ["s0", "s1", "s2", "s4"], absent: ["s3"] },
    { date: "2026-09-12", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
    { date: "2026-09-16", batchId: "b1", present: ["s0", "s2", "s3", "s4"], absent: ["s1"] },
    { date: "2026-09-19", batchId: "b1", present: ["s0", "s1", "s3", "s4"], absent: ["s2"] },
    { date: "2026-09-23", batchId: "b1", present: ["s1", "s2", "s3", "s4"], absent: ["s0"] },
    { date: "2026-09-26", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
    // October records for 10-A
    { date: "2026-10-01", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
    { date: "2026-10-03", batchId: "b1", present: ["s1", "s2", "s3", "s4"], absent: ["s0"] },
    { date: "2026-10-05", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
    { date: "2026-10-07", batchId: "b1", present: ["s0", "s2", "s3", "s4"], absent: ["s1"] },
    { date: "2026-10-08", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
    { date: "2026-10-09", batchId: "b1", present: ["s0", "s1", "s2", "s3", "s4"], absent: [] },
  ],
  facultyAttendance: {
    // September records
    "2026-09-02": { f1: "P", f2: "P", f3: "P" },
    "2026-09-05": { f1: "P", f2: "A", f3: "P" },
    "2026-09-08": { f1: "P", f2: "P", f3: "P" },
    "2026-09-11": { f1: "A", f2: "P", f3: "P" },
    "2026-09-14": { f1: "P", f2: "P", f3: "P" },
    "2026-09-17": { f1: "P", f2: "P", f3: "P" },
    "2026-09-20": { f1: "P", f2: "A", f3: "P" },
    "2026-09-23": { f1: "P", f2: "P", f3: "P" },
    "2026-09-26": { f1: "P", f2: "P", f3: "A" },
    // October records
    "2026-10-01": { f1: "P", f2: "P", f3: "P" },
    "2026-10-02": { f1: "P", f2: "P", f3: "P" },
    "2026-10-03": { f1: "P", f2: "A", f3: "P" },
    "2026-10-04": { f1: "P", f2: "P", f3: "P" },
    "2026-10-05": { f1: "P", f2: "P", f3: "P" },
    "2026-10-06": { f1: "P", f2: "P", f3: "P" },
    "2026-10-07": { f1: "A", f2: "P", f3: "P" },
    "2026-10-08": { f1: "P", f2: "P", f3: "P" },
    "2026-10-09": { f1: "P", f2: "P", f3: "P" },
  },
  payments: [
    {
      id: "p1",
      receiptNo: 420,
      receiptNumber: "GGT-2026-00420",
      studentId: "s1",
      amount: 3000,
      method: "Cash",
      date: today(),
      month: thisMonth(),
      purpose: "Monthly Fees",
      remarks: "October monthly fee installment",
      previousPaid: 17000,
      balance: 10000,
      totalFee: 30000,
      studentStandard: "10th",
      batchName: "10-A",
      createdAt: new Date().toISOString(),
    },
    {
      id: "p2",
      receiptNo: 421,
      receiptNumber: "GGT-2026-00421",
      studentId: "s0",
      amount: 5000,
      method: "UPI",
      date: today(),
      month: thisMonth(),
      purpose: "Monthly Fees",
      remarks: "October Monthly Fees",
      previousPaid: 20000,
      balance: 5000,
      totalFee: 30000,
      studentStandard: "10th",
      batchName: "10-A",
      createdAt: new Date().toISOString(),
    },
  ],
  tests: [
    { id: "test1", name: "Maths Unit Test 1", subject: "Mathematics", date: today(), batch: "10-A", outOf: 50 },
    { id: "test2", name: "Science Chapter 4", subject: "Science", date: today(), batch: "10-B", outOf: 40 },
  ],
  marks: [
    { id: "m1", student: "Rahul Patel", test: "Maths Unit Test 1", score: 46, outOf: 50 },
    { id: "m2", student: "Aarav Shah", test: "Maths Unit Test 1", score: 42, outOf: 50 },
  ],
  expenses: [
    { id: "e1", name: "Premises Rent", amount: 25000, date: today(), method: "UPI", note: "October rent" },
    { id: "e2", name: "Study Material Printing", amount: 3200, date: today(), method: "Cash", note: "10th class worksheets" },
  ],
  feePlans: [
    { id: "fp1", name: "10th Standard Full Year", amount: 30000, standard: "10th", dueDate: "2026-10-15", note: "Full academic course" },
    { id: "fp2", name: "9th Standard Full Year", amount: 24000, standard: "9th", dueDate: "2026-10-15", note: "Full academic course" },
  ],
  salaries: [
    { id: "sal1", faculty: "Rakesh Sir", amount: 25000, date: today(), note: "September salary disbursed" },
  ],
  settings: {
    name: "Gurukul Group Tuition",
    address: "Opp. City Center, Ahmedabad, Gujarat - 380015",
    phone: "9876543210",
    waTemplate: "*Gurukul Group Tuition*\nToday's Absentees — {DATE}\nBatch: {BATCH}\n\n{ABSENT_STUDENTS}\n\nTotal absent: {ABSENT_COUNT}",
  },
  nextReceipt: 422,
});

function normalizeState(s: State): State {
  return {
    ...s,
    students: (s.students || []).map((st) => ({
      ...st,
      nameGu: st.nameGu || toGujaratiName(st.name),
    })),
    faculty: (s.faculty || []).map((f) => ({
      ...f,
      nameGu: f.nameGu || toGujaratiName(f.name),
    })),
  };
}

const KEY = "gurukul-v1";
const serverState = normalizeState(seed());
let state: State = serverState;
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? normalizeState({ ...seed(), ...JSON.parse(raw) }) : normalizeState(seed());
  } catch { state = normalizeState(seed()); }
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
  const snapshot = JSON.stringify(state);
  saveQueue = saveQueue.catch(() => undefined).then(async () => {
    await saveParts({ data: { parts: snapshot } });
  }).catch((error: unknown) => {
    toast.error("Could not save online. Please check your connection and try again.");
    throw error;
  });
  return saveQueue;
}

export async function flushCloud() {
  await saveQueue;
}

export async function hydrateFromCloud() {
  const localCopy = typeof window === "undefined" ? null : localStorage.getItem(KEY);
  const remote = await loadAll();
  if (remote.parts) {
    state = normalizeState({ ...seed(), ...(JSON.parse(remote.parts) as Partial<State>) });
  } else if (localCopy) {
    state = normalizeState({ ...seed(), ...(JSON.parse(localCopy) as Partial<State>) });
    cloudReady = true;
    saveLocalCache();
    await saveCloud();
  } else {
    state = normalizeState(seed());
  }
  cloudReady = true;
  saveLocalCache();
  if (!remote.parts) await saveCloud();
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
  return st.totalFee || (st.monthlyFee ? st.monthlyFee * 12 : 30000);
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

// Monthly Attendance & Salary for a Faculty Member (Per-Student OR Per-Lecture Model)
export function facultyMonthlyStats(s: State, facultyId: string, monthStr = thisMonth()) {
  const fac = s.faculty.find((f) => f.id === facultyId);
  const salaryType: SalaryType =
    fac?.salaryType ||
    (fac?.ratePerLecture && !fac?.ratePerStudent ? "per_lecture" : "per_student");

  const activeStudents = s.students.filter((st) => !st.archived).length;
  const ratePerStudent = fac?.ratePerStudent ?? 1500;
  const ratePerLecture = fac?.ratePerLecture ?? 600;

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

  // Potential gross fee if per-student: (active students * rate per student)
  const baseSalary = activeStudents * ratePerStudent;

  // Calculated salary depends strictly on salaryType (EITHER per student OR per lecture, NOT both)
  let calculatedSalary = 0;
  if (salaryType === "per_student") {
    calculatedSalary = total > 0 ? Math.round((present / total) * baseSalary) : baseSalary;
  } else {
    calculatedSalary = present * ratePerLecture;
  }

  return {
    month: monthStr,
    salaryType,
    activeStudents,
    ratePerStudent,
    ratePerLecture,
    baseSalary,
    calculatedSalary,
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
