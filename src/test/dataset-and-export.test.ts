import { describe, expect, it } from "vitest";
import {
  OFFICIAL_STUDENTS,
  OFFICIAL_PAYMENTS,
  OFFICIAL_EXPENSES,
  OFFICIAL_FIXED_DEPOSITS,
  OFFICIAL_BATCHES,
  OFFICIAL_STATE,
} from "@/lib/initial-data";
import { buildTuitionWorkbook } from "@/lib/excel-export";

describe("Gurukul Official Dataset & Excel Export", () => {
  it("contains all 52 students with exact total fees matching Page 3 and Page 4", () => {
    expect(OFFICIAL_STUDENTS.length).toBe(52);
    const totalFees = OFFICIAL_STUDENTS.reduce((sum, s) => sum + (s.totalFee || 0), 0);
    expect(totalFees).toBe(1312500);
  });

  it("contains all 138 payments totaling 761,500", () => {
    expect(OFFICIAL_PAYMENTS.length).toBe(138);
    const totalPaid = OFFICIAL_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPaid).toBe(761500);
  });

  it("produces exact remaining dues of 551,000 matching Page 3", () => {
    const totalFees = OFFICIAL_STUDENTS.reduce((sum, s) => sum + (s.totalFee || 0), 0);
    const totalPaid = OFFICIAL_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
    expect(totalFees - totalPaid).toBe(551000);
  });

  it("matches standard-wise fee totals from Page 4", () => {
    const stdTotals: Record<string, { fee: number; rem: number }> = {};
    for (const std of ["10th", "11th", "12th", "9th"]) {
      const sList = OFFICIAL_STUDENTS.filter((s) => s.standard?.includes(std));
      const fee = sList.reduce((acc, s) => acc + (s.totalFee || 0), 0);
      const paid = sList.reduce((acc, s) => {
        const pList = OFFICIAL_PAYMENTS.filter((p) => p.studentId === s.id);
        return acc + pList.reduce((sum, p) => sum + p.amount, 0);
      }, 0);
      stdTotals[std] = { fee, rem: fee - paid };
    }

    expect(stdTotals["10th"]?.fee).toBe(473500);
    expect(stdTotals["11th"]?.fee).toBe(326000);
    expect(stdTotals["12th"]?.fee).toBe(335000);
    expect(stdTotals["9th"]?.fee).toBe(178000);
  });

  it("contains all 53 expense records from Page 1", () => {
    expect(OFFICIAL_EXPENSES.length).toBe(53);
    const totalExp = OFFICIAL_EXPENSES.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    expect(totalExp).toBe(284630);
  });

  it("contains all 7 fixed deposit records from Page 8", () => {
    expect(OFFICIAL_FIXED_DEPOSITS.length).toBe(7);
  });

  it("exports multi-sheet Excel workbook without error", () => {
    const { wb, fileName } = buildTuitionWorkbook(OFFICIAL_STATE);

    expect(fileName).toMatch(/^Gurukul_Group_Tuition_Accounts_.*\.xlsx$/);
    expect(wb.SheetNames).toContain("Master Fee Ledger");
    expect(wb.SheetNames).toContain("Standard-Wise Summary");
    expect(wb.SheetNames).toContain("All Receipts");
    expect(wb.SheetNames).toContain("Cash Collections");
    expect(wb.SheetNames).toContain("Online Collections");
    expect(wb.SheetNames).toContain("Expenses (ખર્ચ)");
    expect(wb.SheetNames).toContain("Faculty Workload");
    expect(wb.SheetNames).toContain("Fixed Deposits");
  });
});
