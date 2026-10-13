import * as XLSX from "xlsx";
import type { State, Student, Payment, RecordItem } from "@/lib/store";
import {
  OFFICIAL_STUDENTS,
  OFFICIAL_PAYMENTS,
  OFFICIAL_EXPENSES,
  OFFICIAL_FIXED_DEPOSITS,
} from "@/lib/initial-data";

export function buildTuitionWorkbook(state: State) {
  const students = state.students?.length ? state.students : OFFICIAL_STUDENTS;
  const payments = state.payments?.length ? state.payments : OFFICIAL_PAYMENTS;
  const expenses = state.expenses?.length ? state.expenses : OFFICIAL_EXPENSES;
  const fds = OFFICIAL_FIXED_DEPOSITS;

  const wb = XLSX.utils.book_new();

  // Helper to format date display
  const formatDate = (d?: string) => {
    if (!d) return "—";
    const parts = d.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  // ==========================================
  // SHEET 1: Master Fee Ledger (Mirror of PDF Page 3 & Page 6)
  // ==========================================
  const masterRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — MASTER FEES LEDGER (2026-27)"],
    ["R.no.", "GR No.", "Student Name", "Std.", "School", "Final Fees", "Paid (જમા)", "બાકી (Due)", "Status", "Inst 1", "Inst 2", "Inst 3", "Inst 4", "Inst 5", "Inst 6"],
  ];

  let totalFinalFees = 0;
  let totalPaidMaster = 0;
  let totalDueMaster = 0;

  students.forEach((st, idx) => {
    const studentPayments = payments.filter((p) => p.studentId === st.id && !p.voided && !p.archived);
    const paid = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const finalFee = st.totalFee || 0;
    const due = Math.max(0, finalFee - paid);

    totalFinalFees += finalFee;
    totalPaidMaster += paid;
    totalDueMaster += due;

    const insts = studentPayments.map((p) => -p.amount);

    masterRows.push([
      idx + 1,
      st.grNo || idx + 1,
      st.name,
      st.standard || "—",
      st.school || "—",
      finalFee,
      paid,
      due === 0 ? "OK" : due,
      due === 0 ? "PAID" : "DUE",
      insts[0] ?? "",
      insts[1] ?? "",
      insts[2] ?? "",
      insts[3] ?? "",
      insts[4] ?? "",
      insts[5] ?? "",
    ]);
  });

  // Summary Row
  masterRows.push([]);
  masterRows.push([
    "TOTAL",
    "",
    "Total Across All Students",
    `${students.length} Students`,
    "",
    totalFinalFees,
    totalPaidMaster,
    totalDueMaster,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
  wsMaster["!cols"] = [
    { wch: 8 },  // R.no.
    { wch: 8 },  // GR No.
    { wch: 32 }, // Student Name
    { wch: 8 },  // Std.
    { wch: 14 }, // School
    { wch: 12 }, // Final Fees
    { wch: 12 }, // Paid
    { wch: 12 }, // Due
    { wch: 10 }, // Status
    { wch: 10 }, // Inst 1
    { wch: 10 }, // Inst 2
    { wch: 10 }, // Inst 3
    { wch: 10 }, // Inst 4
    { wch: 10 }, // Inst 5
    { wch: 10 }, // Inst 6
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, "Master Fee Ledger");

  // ==========================================
  // SHEET 2: Standard-Wise Breakdown (Mirror of PDF Page 4)
  // ==========================================
  const stdRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — STANDARD-WISE FEES BREAKDOWN (2026-27)"],
    [],
  ];

  const standards = ["10th", "11th", "12th", "9th"];
  const stdLabels: Record<string, string> = {
    "10th": "Std. :- 10th",
    "11th": "Std. :- 11th",
    "12th": "Std. :- 12th",
    "9th": "Std. :- 9th",
  };

  standards.forEach((std) => {
    stdRows.push([stdLabels[std] || `Std. :- ${std}`]);
    stdRows.push(["GR No.", "Student Name", "School", "Final Fees", "Paid Fees", "Remaining Fees", "Status"]);

    const stdStudents = students.filter((s) => (s.standard || "").includes(std));
    let subFee = 0;
    let subPaid = 0;
    let subRem = 0;

    stdStudents.forEach((st) => {
      const pList = payments.filter((p) => p.studentId === st.id && !p.voided && !p.archived);
      const paid = pList.reduce((acc, p) => acc + (p.amount || 0), 0);
      const fee = st.totalFee || 0;
      const rem = Math.max(0, fee - paid);

      subFee += fee;
      subPaid += paid;
      subRem += rem;

      stdRows.push([
        st.grNo || "—",
        st.name,
        st.school || "—",
        fee,
        paid,
        rem === 0 ? "OK" : rem,
        rem === 0 ? "PAID" : "DUE",
      ]);
    });

    stdRows.push(["Total", `${stdStudents.length} Students`, "", subFee, subPaid, subRem, ""]);
    stdRows.push([]);
  });

  // Grand Summary
  stdRows.push(["GRAND TOTAL SUMMARY (ALL STANDARDS)"]);
  stdRows.push(["Standard", "Students", "Total Fees (₹)", "Collected Fees (₹)", "Remaining Fees (₹)", "Collection %"]);
  standards.forEach((std) => {
    const stdStudents = students.filter((s) => (s.standard || "").includes(std));
    const subFee = stdStudents.reduce((acc, s) => acc + (s.totalFee || 0), 0);
    const subPaid = stdStudents.reduce((acc, s) => {
      const pList = payments.filter((p) => p.studentId === s.id && !p.voided && !p.archived);
      return acc + pList.reduce((sum, p) => sum + (p.amount || 0), 0);
    }, 0);
    const subRem = Math.max(0, subFee - subPaid);
    const pct = subFee > 0 ? `${Math.round((subPaid / subFee) * 100)}%` : "0%";
    stdRows.push([std, stdStudents.length, subFee, subPaid, subRem, pct]);
  });
  stdRows.push([
    "Total",
    students.length,
    totalFinalFees,
    totalPaidMaster,
    totalDueMaster,
    totalFinalFees > 0 ? `${Math.round((totalPaidMaster / totalFinalFees) * 100)}%` : "0%",
  ]);

  const wsStd = XLSX.utils.aoa_to_sheet(stdRows);
  wsStd["!cols"] = [
    { wch: 12 },
    { wch: 30 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStd, "Standard-Wise Summary");

  // ==========================================
  // SHEET 3: All Fee Receipts (Mirror of PDF Page 1 Left Column)
  // ==========================================
  const allReceiptRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — ALL FEE RECEIPTS (2026-27)"],
    ["Re.no.", "GR.", "Name", "Std.", "Cash/Online", "Date", "Rs."],
  ];

  let totalAllReceipts = 0;
  // Sort by receiptNo ascending
  const sortedPayments = [...payments]
    .filter((p) => !p.voided && !p.archived)
    .sort((a, b) => (a.receiptNo || 0) - (b.receiptNo || 0));

  sortedPayments.forEach((p) => {
    const st = students.find((s) => s.id === p.studentId);
    const gr = st?.grNo || p.studentId.replace(/\D/g, "") || "—";
    const name = st?.name || "—";
    const std = st?.standard || p.studentStandard || "—";
    const amount = p.amount || 0;
    totalAllReceipts += amount;

    allReceiptRows.push([
      p.receiptNo,
      gr,
      name,
      std,
      p.method || "Cash",
      formatDate(p.date),
      amount,
    ]);
  });

  allReceiptRows.push([]);
  allReceiptRows.push(["TOTAL", "", `Total Receipts: ${sortedPayments.length}`, "", "", "", totalAllReceipts]);

  const wsAllReceipts = XLSX.utils.aoa_to_sheet(allReceiptRows);
  wsAllReceipts["!cols"] = [
    { wch: 8 },
    { wch: 8 },
    { wch: 32 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsAllReceipts, "All Receipts");

  // ==========================================
  // SHEET 4: Cash Collections (Mirror of PDF Page 1 Middle-Right Column)
  // ==========================================
  const cashReceiptRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — CASH COLLECTIONS (2026-27)"],
    ["Re.no.", "GR.", "Name", "Std.", "Cash", "Date", "Rs."],
  ];

  let totalCash = 0;
  const cashPayments = sortedPayments.filter(
    (p) => (p.method || "").toLowerCase().trim() === "cash"
  );

  cashPayments.forEach((p) => {
    const st = students.find((s) => s.id === p.studentId);
    const gr = st?.grNo || "—";
    const name = st?.name || "—";
    const std = st?.standard || p.studentStandard || "—";
    const amount = p.amount || 0;
    totalCash += amount;

    cashReceiptRows.push([
      p.receiptNo,
      gr,
      name,
      std,
      "Cash",
      formatDate(p.date),
      amount,
    ]);
  });

  cashReceiptRows.push([]);
  cashReceiptRows.push(["TOTAL", "", `Cash Transactions: ${cashPayments.length}`, "", "Cash Total", "", totalCash]);

  const wsCash = XLSX.utils.aoa_to_sheet(cashReceiptRows);
  wsCash["!cols"] = [
    { wch: 8 },
    { wch: 8 },
    { wch: 32 },
    { wch: 8 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsCash, "Cash Collections");

  // ==========================================
  // SHEET 5: Online Collections (Mirror of PDF Page 1 Far-Right Column)
  // ==========================================
  const onlineReceiptRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — ONLINE & CHEQUE COLLECTIONS (2026-27)"],
    ["Re.no.", "GR.", "Name", "Std.", "Online / Mode", "Date", "Rs."],
  ];

  let totalOnline = 0;
  const onlinePayments = sortedPayments.filter(
    (p) => (p.method || "").toLowerCase().trim() !== "cash"
  );

  onlinePayments.forEach((p) => {
    const st = students.find((s) => s.id === p.studentId);
    const gr = st?.grNo || "—";
    const name = st?.name || "—";
    const std = st?.standard || p.studentStandard || "—";
    const amount = p.amount || 0;
    totalOnline += amount;

    onlineReceiptRows.push([
      p.receiptNo,
      gr,
      name,
      std,
      p.method || "Online",
      formatDate(p.date),
      amount,
    ]);
  });

  onlineReceiptRows.push([]);
  onlineReceiptRows.push(["TOTAL", "", `Online Transactions: ${onlinePayments.length}`, "", "Online Total", "", totalOnline]);

  const wsOnline = XLSX.utils.aoa_to_sheet(onlineReceiptRows);
  wsOnline["!cols"] = [
    { wch: 8 },
    { wch: 8 },
    { wch: 32 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOnline, "Online Collections");

  // ==========================================
  // SHEET 6: Expenses (Mirror of PDF Page 1 Center Column)
  // ==========================================
  const expenseRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — EXPENSES REGISTER (ખર્ચ 2026-27)"],
    ["Sr.No.", "Rs. (રૂ.)", "Detail (વિગત)", "Date", "Category"],
  ];

  let totalExpenses = 0;
  expenses.forEach((e, idx) => {
    const amount = Number(e.amount || 0);
    totalExpenses += amount;
    expenseRows.push([
      idx + 1,
      amount,
      String(e.title || e.detail || e.notes || "—"),
      formatDate(String(e.date || "")),
      String(e.category || "General"),
    ]);
  });

  expenseRows.push([]);
  expenseRows.push(["TOTAL", totalExpenses, `Total Entries: ${expenses.length}`, "", ""]);

  const wsExpense = XLSX.utils.aoa_to_sheet(expenseRows);
  wsExpense["!cols"] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 45 },
    { wch: 12 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpense, "Expenses (ખર્ચ)");

  // ==========================================
  // SHEET 7: Faculty Workload & Salaries (Mirror of PDF Page 5 & Page 7)
  // ==========================================
  const facultyRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — FACULTY WORKLOAD & PAYMENTS (2026-27)"],
    ["Month", "Panchal", "Vikas", "Hiral", "Umang", "Jani-11", "Jani-12", "KP", "Sunil (9/10)", "Sunil (11/12)", "Snehi", "Krish", "Total Hours/Amt"],
    ["April", "-", "-", "-", 10000, "-", 5000, "-", 7.5, 4.5, 3, "-", "36.5 hrs"],
    ["May", 3172, "-", 1950, "-", "-", "-", 3750, 11, 15.5, 7.5, "-", "68 hrs"],
    ["June", 2585, "-", 1820, "-", "-", "-", 3000, 28.5, 23, 6, 3, "108 hrs"],
    ["July", 2820, 3100, 3380, "-", "-", 5000, 3750, 36, 35, 14, 8, "168.5 hrs"],
    ["August", 2937, "-", 3120, "-", 3400, 5000, 4000, 39, 33, 16.5, 10, "168.65 hrs"],
    ["September", 2820, 5700, 3120, "-", 3400, 5000, 3375, 31.5, 38, 9.5, 9, "155 hrs"],
    ["October", "-", "-", "-", "-", "-", 5000, "-", "-", "-", "-", "-", "-"],
    [],
    ["Faculty Rates", "235/lec", "250/lec", "260/lec", "325/lec", "340/lec", "3800/mo", "250/lec", "—", "—", "225/lec", "50/hr", "—"],
  ];

  const wsFaculty = XLSX.utils.aoa_to_sheet(facultyRows);
  wsFaculty["!cols"] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFaculty, "Faculty Workload");

  // ==========================================
  // SHEET 8: Fixed Deposits (Mirror of PDF Page 8)
  // ==========================================
  const fdRows: (string | number)[][] = [
    ["GURUKUL GROUP TUITION — FIXED DEPOSITS REGISTER (2026-27)"],
    ["Sr No.", "Holder", "Bank", "Start Date", "Maturity Date", "Period / Days", "Rate (%)", "Principal (₹)", "Maturity (₹)", "Interest (₹)", "Account No.", "Year", "Status"],
  ];

  let totalPrincipal = 0;
  let totalMaturity = 0;
  let totalInterest = 0;

  fds.forEach((fd, idx) => {
    const p = Number(fd.principal || 0);
    const m = Number(fd.maturityAmount || 0);
    const intr = Number(fd.interest || 0);
    totalPrincipal += p;
    totalMaturity += m;
    totalInterest += intr;

    fdRows.push([
      idx + 1,
      String(fd.holder || "—"),
      String(fd.bank || "—"),
      formatDate(String(fd.startDate || "")),
      formatDate(String(fd.maturityDate || "")),
      String(fd.days ? `${fd.days} days` : "—"),
      Number(fd.rate || 0),
      p,
      m,
      intr,
      String(fd.accountNo || "—"),
      String(fd.year || "—"),
      String(fd.status || "Active"),
    ]);
  });

  fdRows.push([]);
  fdRows.push([
    "TOTAL",
    "",
    `Total FDs: ${fds.length}`,
    "",
    "",
    "",
    "",
    totalPrincipal,
    totalMaturity,
    totalInterest,
    "",
    "",
    "",
  ]);

  const wsFd = XLSX.utils.aoa_to_sheet(fdRows);
  wsFd["!cols"] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFd, "Fixed Deposits");

  // Write and trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Gurukul_Group_Tuition_Accounts_${dateStr}.xlsx`;
  return { wb, fileName };
}

export function exportTuitionExcel(state: State) {
  const { wb, fileName } = buildTuitionWorkbook(state);
  XLSX.writeFile(wb, fileName);
  return fileName;
}
