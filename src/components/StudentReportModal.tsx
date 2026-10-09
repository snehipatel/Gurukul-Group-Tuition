import { Printer, Download, MessageCircle, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useStore,
  rupee,
  niceDate,
  formatStudentId,
  studentTotalFee,
  totalPaid,
  pendingFor,
  studentAttendanceStats,
  getStudentTestMarks,
  openWhatsApp,
  type Student,
  type Batch,
  type Settings,
} from "@/lib/store";
import { useLanguage, formatGujaratiDate, getStudentDisplayName } from "@/lib/i18n";

interface Props {
  student: Student;
  batch?: Batch | undefined;
  settings: Settings;
  onClose: () => void;
}

export function StudentReportModal({ student, batch, settings, onClose }: Props) {
  const s = useStore();
  const { lang } = useLanguage();

  const isGu = lang === "gu";
  const displayName = getStudentDisplayName(student, lang);
  const formattedId = formatStudentId(student);
  const totalFeeVal = studentTotalFee(student);
  const paidVal = totalPaid(s, student.id);
  const dueVal = pendingFor(s, student);
  const attStats = studentAttendanceStats(s, student.id);
  const testsList = getStudentTestMarks(s, student);

  const avgScore = testsList.length
    ? Math.round(
        testsList.reduce((acc, t) => acc + t.pct, 0) / testsList.length
      )
    : null;

  function handlePrint() {
    window.print();
  }

  function handleWhatsAppShare() {
    const parentPhone = student.parentPhone || student.phone || "";
    const text = isGu
      ? `*${settings.name}*
📋 *વિદ્યાર્થી પ્રગતિ અહેવાલ (Progress Report)*
વિદ્યાર્થી: ${displayName} (${formattedId})
ધોરણ: ${student.standard || batch?.standard || "10th"} · બેચ: ${batch?.name || "—"}

📊 *હાજરી વિગતો:*
• હાજર દિવસો: ${attStats.present} દિવસ
• ગેરહાજર દિવસો: ${attStats.absent} દિવસ
• હાજરી ટકાવારી: ${attStats.pct ?? 0}%

💰 *ફી હિસાબ:*
• કુલ વાર્ષિક ફી: ${rupee(totalFeeVal)}
• અત્યાર સુધી ભરેલ: ${rupee(paidVal)}
• બાકી રકમ: ${rupee(dueVal)}

📝 *પરીક્ષા પરિણામ:*
${
  testsList.length
    ? testsList
        .map(
          (t) =>
            `• ${t.testName} (${t.subject}): ${t.score}/${t.outOf} (${t.pct}%)`
        )
        .join("\n")
    : "કોઈ પરીક્ષા નોંધાયેલ નથી"
}

સંપર્ક: ${settings.phone || "9876543210"}`
      : `*${settings.name}*
📋 *STUDENT PROGRESS REPORT*
Student: ${displayName} (${formattedId})
Standard: ${student.standard || batch?.standard || "10th"} · Batch: ${batch?.name || "—"}

📊 *Attendance Record:*
• Days Present: ${attStats.present}
• Days Absent: ${attStats.absent}
• Attendance Rate: ${attStats.pct ?? 0}%

💰 *Fee Status:*
• Total Fee: ${rupee(totalFeeVal)}
• Paid Till Date: ${rupee(paidVal)}
• Remaining Balance Due: ${rupee(dueVal)}

📝 *Academic Tests Conducted:*
${
  testsList.length
    ? testsList
        .map(
          (t) =>
            `• ${t.testName} (${t.subject}): ${t.score}/${t.outOf} (${t.pct}%)`
        )
        .join("\n")
    : "No tests recorded yet"
}

Phone: ${settings.phone || "9876543210"}`;

    openWhatsApp(text, parentPhone);
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-3 flex items-center justify-center print:static print:inset-auto print:bg-white print:p-0 print:overflow-visible print:w-full print:max-w-none print:m-0 print:block"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl my-auto space-y-3 print:max-w-none print:w-full print:m-0 print:p-0 print:space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Single-Page Student Report Card */}
        <section className="printable-report-card rounded-3xl border bg-card p-6 shadow-2xl relative overflow-hidden print:rounded-none print:border-2 print:border-indigo-950 print:bg-white print:p-8 print:shadow-none print:w-full print:max-w-none print:min-h-[265mm] print:flex print:flex-col print:justify-between print:break-inside-avoid print:page-break-inside-avoid">
          {/* 1. Header */}
          <div className="flex items-center justify-between border-b pb-4 print:pb-5">
            <div className="flex items-center gap-3.5">
              <img
                src="/favicon.png"
                alt="Gurukul"
                className="size-13 print:size-16 rounded-xl bg-primary/10 object-contain p-1 border"
              />
              <div>
                <span className="text-[10px] print:text-xs font-black tracking-wider uppercase text-amber-600 dark:text-amber-400">
                  {isGu ? "ગુરૂકુલ ગ્રુપ ટ્યુશન" : "GURUKUL GROUP TUITION"}
                </span>
                <h2 className="text-xl print:text-2xl font-black text-foreground leading-tight">
                  {isGu
                    ? "વિદ્યાર્થી પ્રગતિ અહેવાલ (રિપોર્ટ કાર્ડ)"
                    : "STUDENT PROGRESS REPORT & DOSSIER"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {settings.address || "Opp. City Center, Ahmedabad, Gujarat"} ·{" "}
                  {isGu ? "મો." : "Ph:"} {settings.phone || "9876543210"}
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

          {/* 2. Student Bio-data Bar */}
          <div className="mt-4 rounded-xl bg-muted/60 print:bg-slate-100 print:border print:border-slate-300 p-3 text-xs print:text-sm">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                  {isGu ? "વિદ્યાર્થીનું નામ" : "Student Name"}
                </span>
                <b className="text-foreground text-sm print:text-base">
                  {displayName}
                </b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                  {isGu ? "વિદ્યાર્થી ID" : "Student ID"}
                </span>
                <b className="text-primary font-black">{formattedId}</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                  {isGu ? "ધોરણ / બેચ" : "Standard & Batch"}
                </span>
                <b className="text-foreground">
                  {student.standard || batch?.standard || "10th"} ·{" "}
                  {batch?.name || "10-A"}
                </b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                  {isGu ? "શાળા / સંસ્થા" : "School / Institute"}
                </span>
                <b className="text-foreground">{student.school || "—"}</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                  {isGu ? "વાલીનો સંપર્ક" : "Parent Phone"}
                </span>
                <b className="text-foreground">{student.parentPhone || "—"}</b>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px] print:text-xs font-semibold">
                  {isGu ? "શૈક્ષણિક સત્ર" : "Academic Session"}
                </span>
                <b className="text-foreground">2026 – 2027</b>
              </div>
            </div>
          </div>

          {/* 3. Two Columns: Attendance Stats & Fee Status */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* Box A: Attendance Summary */}
            <div className="rounded-xl border p-3.5 space-y-2 bg-card">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary border-b pb-1 block">
                {isGu ? "૧. હાજરી વિગતો (Attendance)" : "1. Attendance Record"}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs print:text-sm pt-1">
                <div className="rounded-lg bg-success/10 p-2 text-center border border-success/20">
                  <span className="text-[10px] print:text-xs font-bold text-success block">
                    {isGu ? "હાજર દિવસો" : "Days Present"}
                  </span>
                  <b className="text-lg print:text-xl font-black text-success">
                    {attStats.present}
                  </b>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2 text-center border border-destructive/20">
                  <span className="text-[10px] print:text-xs font-bold text-destructive block">
                    {isGu ? "ગેરહાજર દિવસો" : "Days Absent"}
                  </span>
                  <b className="text-lg print:text-xl font-black text-destructive">
                    {attStats.absent}
                  </b>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs print:text-sm pt-1">
                <span className="text-muted-foreground">
                  {isGu ? "કુલ લેવાયેલ ક્લાસ:" : "Total Sessions:"}
                </span>
                <b>
                  {attStats.total} {isGu ? "દિવસ" : "Days"}
                </b>
              </div>
              <div className="flex justify-between items-center text-xs print:text-sm">
                <span className="text-muted-foreground">
                  {isGu ? "હાજરી ટકાવારી:" : "Attendance Rate:"}
                </span>
                <b
                  className={
                    attStats.pct !== null && attStats.pct < 75
                      ? "text-destructive font-black"
                      : "text-success font-black"
                  }
                >
                  {attStats.pct !== null ? `${attStats.pct}%` : "—"}
                </b>
              </div>
            </div>

            {/* Box B: Fee Account Summary */}
            <div className="rounded-xl border p-3.5 space-y-2 bg-card">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary border-b pb-1 block">
                {isGu ? "૨. ફી ખાતાની સ્થિતિ (Fee Status)" : "2. Fee Account Status"}
              </span>
              <div className="space-y-1 text-xs print:text-sm pt-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>{isGu ? "કુલ વાર્ષિક ફી:" : "Total Academic Fee:"}</span>
                  <b className="text-foreground">{rupee(totalFeeVal)}</b>
                </div>
                <div className="flex justify-between text-success font-semibold">
                  <span>{isGu ? "અત્યાર સુધી ભરેલ ફી:" : "Paid Till Date:"}</span>
                  <b>{rupee(paidVal)}</b>
                </div>
                <div className="flex justify-between text-destructive font-bold border-t pt-1">
                  <span>{isGu ? "બાકી રહેતી રકમ:" : "Balance Due:"}</span>
                  <span>{rupee(dueVal)}</span>
                </div>
              </div>
              <div className="pt-1">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                    dueVal === 0
                      ? "bg-success/15 text-success"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {dueVal === 0 ? (
                    <>
                      <CheckCircle2 className="size-3" />
                      {isGu ? "સંપૂર્ણ ફી ચૂકતે થયેલ" : "Fee Cleared in Full"}
                    </>
                  ) : (
                    <>
                      <AlertCircle className="size-3" />
                      {isGu ? "હપ્તો બાકી છે" : "Dues Pending"}
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Academic Tests & Marks Ledger */}
          <div className="mt-4 rounded-xl border p-3.5 space-y-2 bg-card">
            <div className="flex justify-between items-center border-b pb-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {isGu
                  ? "૩. લેવાયેલ પરીક્ષાઓ અને ગુણ પત્રક (Test Marks Ledger)"
                  : "3. Academic Test Performance (Conducted Tests)"}
              </span>
              {avgScore !== null && (
                <span className="text-xs font-bold text-foreground">
                  {isGu ? "સરેરાશ પરિણામ:" : "Average Score:"}{" "}
                  <b className="text-primary">{avgScore}%</b>
                </span>
              )}
            </div>

            {testsList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs print:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="py-1.5 px-2 font-bold">
                        {isGu ? "પરીક્ષાનું નામ" : "Test Name"}
                      </th>
                      <th className="py-1.5 px-2 font-bold">
                        {isGu ? "વિષય" : "Subject"}
                      </th>
                      <th className="py-1.5 px-2 font-bold">
                        {isGu ? "તારીખ" : "Date"}
                      </th>
                      <th className="py-1.5 px-2 font-bold text-right">
                        {isGu ? "મેળવેલ / કુલ ગુણ" : "Marks / Out Of"}
                      </th>
                      <th className="py-1.5 px-2 font-bold text-right">
                        {isGu ? "ટકાવારી" : "%"}
                      </th>
                      <th className="py-1.5 px-2 font-bold text-center">
                        {isGu ? "શેરો / પરિણામ" : "Remarks"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testsList.map((t) => (
                      <tr key={t.id} className="border-b last:border-b-0">
                        <td className="py-1.5 px-2 font-bold text-foreground">
                          {t.testName}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">
                          {t.subject}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">
                          {isGu ? formatGujaratiDate(t.date) : niceDate(t.date)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-black text-foreground">
                          {t.score} / {t.outOf}
                        </td>
                        <td className="py-1.5 px-2 text-right font-black text-primary">
                          {t.pct}%
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.pct >= 80
                                ? "bg-success/15 text-success"
                                : t.pct >= 50
                                ? "bg-primary/10 text-primary"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {t.remarks}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground italic">
                {isGu
                  ? "આ વિદ્યાર્થી માટે હજુ સુધી કોઈ પરીક્ષાના ગુણ નોંધાયેલા નથી."
                  : "No test records found for this student till date."}
              </p>
            )}
          </div>

          {/* 5. Faculty Assessment Remarks */}
          <div className="mt-4 rounded-xl border p-3 bg-muted/30 text-xs print:text-sm">
            <span className="font-bold text-foreground block mb-1">
              {isGu
                ? "૪. શિક્ષકનો અભિપ્રાય અને પ્રગતિ નોંધ:"
                : "4. Teacher Remarks & Assessment:"}
            </span>
            <p className="text-muted-foreground italic">
              {avgScore !== null && avgScore >= 80
                ? isGu
                  ? "વિદ્યાર્થી વર્ગખંડમાં નિયમિત અને ધ્યાનપૂર્વક અભ્યાસ કરે છે. કન્સેપ્ટ્સ સમજવાની ક્ષમતા ઉત્કૃષ્ટ છે."
                  : "Student demonstrates exceptional discipline, regularity, and subject comprehension."
                : attStats.pct !== null && attStats.pct >= 85
                ? isGu
                  ? "હાજરી સંતોષકારક છે. નિયમિત પુનરાવર્તનથી પરિણામમાં વધુ સુધારો થઈ શકે છે."
                  : "Regular attendance observed. Consistent revision recommended for higher scores."
                : isGu
                ? "અભ્યાસમાં નિયમિતતા જાળવવી અને ગૃહકાર્ય સમયસર પૂર્ણ કરવું આવશ્યક છે."
                : "Needs improved punctuality and homework completion for better academic standing."}
            </p>
          </div>

          {/* 6. Official Signatures (Full Page Bottom) */}
          <div className="mt-8 pt-4 border-t-2 border-foreground/30 flex items-end justify-between px-6 text-center">
            <div>
              <div className="w-32 mx-auto border-b border-foreground/60 mb-1 h-8" />
              <p className="text-[11px] print:text-xs font-bold text-foreground">
                {isGu ? "વાલીની સહી" : "Parent's Signature"}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {isGu ? "ચકાસણી કરનાર વાલી" : "Parent / Guardian"}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <img
                src="/SIGNATURE.png"
                alt="Authorized Signature"
                className="h-8 print:h-11 w-auto object-contain -mb-1"
              />
              <div className="w-36 mx-auto border-b border-foreground/60 mb-1" />
              <p className="text-[11px] print:text-xs font-black text-foreground">
                SUNIL PATEL
              </p>
              <p className="text-[9px] text-muted-foreground">
                {isGu ? "અધિકૃત સંચાલક / ગુરૂકુલ ગ્રૂપ ટ્યુશન" : "Authorized Director / Gurukul Group Tuition"}
              </p>
            </div>
          </div>
        </section>

        {/* Action Buttons (Hidden when printing) */}
        <div className="grid grid-cols-3 gap-2 print:hidden">
          <Button
            className="h-11 font-bold text-xs gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="size-4" /> {isGu ? "પ્રિન્ટ રિપોર્ટ" : "Print Report"}
          </Button>
          <Button
            variant="secondary"
            className="h-11 font-bold text-xs gap-1.5 bg-success text-primary-foreground hover:bg-success/90"
            onClick={handleWhatsAppShare}
          >
            <MessageCircle className="size-4" />{" "}
            {isGu ? "વાલીને વ્હોટ્સએપ" : "WhatsApp to Parent"}
          </Button>
          <Button
            variant="outline"
            className="h-11 font-bold text-xs"
            onClick={onClose}
          >
            {isGu ? "બંધ કરો" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
