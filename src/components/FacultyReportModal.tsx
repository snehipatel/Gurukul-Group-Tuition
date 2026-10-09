import { Printer, MessageCircle, X, CheckCircle2, Award, Calendar, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useStore,
  niceDate,
  today,
  facultyAttendanceStats,
  openWhatsApp,
  type Faculty,
  type Settings,
} from "@/lib/store";
import { useLanguage, formatGujaratiDate, toGujaratiName } from "@/lib/i18n";

interface Props {
  faculty: Faculty;
  settings: Settings;
  onClose: () => void;
}

export function FacultyReportModal({ faculty, settings, onClose }: Props) {
  const s = useStore();
  const { lang } = useLanguage();
  const isGu = lang === "gu";

  const facultyDisplayName = isGu
    ? faculty.nameGu || toGujaratiName(faculty.name)
    : faculty.name;

  const facultyCode = `GGT-FAC-${faculty.id.toUpperCase()}`;
  const attStats = facultyAttendanceStats(s, faculty.id);

  function handlePrint() {
    window.print();
  }

  function handleWhatsAppShare() {
    const text = isGu
      ? `*${settings.name}*
📋 *શિક્ષક કાર્યક્ષમતા અને હાજરી અહેવાલ*
શિક્ષક: ${facultyDisplayName} (${facultyCode})
વિષય: ${faculty.subject} · હોદ્દો: ફેકલ્ટી મેન્ટર

📊 *હાજરી વિગતો:*
• નોંધાયેલ દિવસો: ${attStats.total} દિવસ
• હાજર દિવસો: ${attStats.present} દિવસ
• ગેરહાજર દિવસો: ${attStats.absent} દિવસ
• હાજરી ટકાવારી: ${attStats.pct ?? 0}%

તારીખ: ${formatGujaratiDate(today())}
સંચાલક: સુનિલ પટેલ (ગુરૂકુલ ગ્રૂપ ટ્યુશન)`
      : `*${settings.name}*
📋 *OFFICIAL FACULTY ATTENDANCE & DOSSIER REPORT*
Faculty: ${faculty.name} (${facultyCode})
Subject: ${faculty.subject}

📊 *Attendance Metrics:*
• Total Days Tracked: ${attStats.total}
• Present Days: ${attStats.present}
• Absent Days: ${attStats.absent}
• Attendance Rate: ${attStats.pct ?? 0}%

Date: ${niceDate(today())}
Director: SUNIL PATEL (Gurukul Group Tuition)`;

    if (faculty.phone) {
      openWhatsApp(text, faculty.phone);
    } else {
      openWhatsApp(text);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div className="relative w-full max-w-2xl rounded-3xl bg-card border shadow-2xl p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none text-foreground">
        {/* Close Button (Hidden on Print) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground print:hidden transition"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* Printable Report Section */}
        <section
          id="faculty-report-printable-area"
          className="space-y-5 bg-card print:bg-white print:text-black font-sans leading-normal"
        >
          {/* Header */}
          <div className="border-b-2 border-primary/20 pb-4 text-center relative">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-lg print:border print:border-black">
                ગ
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-primary print:text-black">
                {isGu ? "ગુરુકુળ ગ્રૂપ ટ્યુશન" : "GURUKUL GROUP TUITION"}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground print:text-neutral-700">
              {isGu
                ? "અમદાવાદ, ગુજરાત · ફોન: 9876543210 · ઇમેલ: contact@gurukulgroup.in"
                : "Ahmedabad, Gujarat · Phone: 9876543210 · Email: contact@gurukulgroup.in"}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium print:text-neutral-600 mt-0.5">
              {isGu
                ? "ધોરણ 9, 10, 11 અને 12 માટેનું અગ્રણી કોચિંગ સંસ્થાન"
                : "Coaching & Tuition for 9th, 10th, 11th & 12th Standards"}
            </p>

            <div className="mt-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-black text-primary border border-primary/20 print:border print:border-black print:bg-neutral-100 print:text-black">
              {isGu
                ? "શિક્ષક કાર્યક્ષમતા અને હાજરી અહેવાલ"
                : "OFFICIAL FACULTY ATTENDANCE & DOSSIER REPORT"}
            </div>

            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2 px-1 print:text-neutral-600">
              <span>{isGu ? "અહેવાલ ક્રમાંક: " : "Report ID: "}<b>{facultyCode}</b></span>
              <span>
                {isGu ? "તારીખ: " : "Issue Date: "}
                <b>{isGu ? formatGujaratiDate(today()) : niceDate(today())}</b>
              </span>
            </div>
          </div>

          {/* 1. Faculty Information */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-primary print:text-black mb-2">
              <BookOpen className="size-3.5" />
              <span>{isGu ? "૧. શિક્ષકની વિગત" : "1. Faculty Profile"}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-2xl bg-muted/30 p-3.5 border print:border-neutral-300 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-medium">
                  {isGu ? "શિક્ષકનું નામ" : "Faculty Name"}
                </p>
                <p className="font-extrabold text-foreground print:text-black text-sm">
                  {facultyDisplayName}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-medium">
                  {isGu ? "શિક્ષક આઈડી" : "Faculty ID"}
                </p>
                <p className="font-bold text-foreground print:text-black font-mono">
                  {facultyCode}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-medium">
                  {isGu ? "વિષય / સ્પેશિયલાઇઝેશન" : "Subject / Dept"}
                </p>
                <p className="font-extrabold text-foreground print:text-black">
                  {faculty.subject}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-medium">
                  {isGu ? "શૈક્ષણિક લાયકાત" : "Qualification"}
                </p>
                <p className="font-bold text-foreground print:text-black">
                  {faculty.qualification || (isGu ? "અનુભવી વિષય તજજ્ઞ" : "Subject Specialist")}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-medium">
                  {isGu ? "સંપર્ક નંબર" : "Contact Phone"}
                </p>
                <p className="font-bold text-foreground print:text-black font-mono">
                  {faculty.phone || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-medium">
                  {isGu ? "જોડાવાની તારીખ" : "Joining Date"}
                </p>
                <p className="font-bold text-foreground print:text-black">
                  {faculty.joiningDate
                    ? isGu
                      ? formatGujaratiDate(faculty.joiningDate)
                      : niceDate(faculty.joiningDate)
                    : "01/05/2024"}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Attendance Summary */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-primary print:text-black mb-2">
              <Calendar className="size-3.5" />
              <span>{isGu ? "૨. હાજરી સારાંશ" : "2. Attendance Metrics"}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-2xl border bg-muted/20 p-2.5 print:border-neutral-300">
                <p className="text-[10px] text-muted-foreground print:text-neutral-600 font-bold">
                  {isGu ? "કુલ દિવસો" : "Total Sessions"}
                </p>
                <p className="text-xl font-black text-foreground print:text-black mt-0.5">
                  {attStats.total}
                </p>
              </div>
              <div className="rounded-2xl border border-success/30 bg-success-soft p-2.5 print:border-neutral-300">
                <p className="text-[10px] text-success font-bold print:text-black">
                  {isGu ? "હાજર દિવસો" : "Present"}
                </p>
                <p className="text-xl font-black text-success print:text-black mt-0.5">
                  {attStats.present}
                </p>
              </div>
              <div className="rounded-2xl border border-destructive/30 bg-danger-soft p-2.5 print:border-neutral-300">
                <p className="text-[10px] text-destructive font-bold print:text-black">
                  {isGu ? "ગેરહાજર" : "Absent / Leave"}
                </p>
                <p className="text-xl font-black text-destructive print:text-black mt-0.5">
                  {attStats.absent}
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-2.5 print:border-neutral-300">
                <p className="text-[10px] text-primary font-bold print:text-black">
                  {isGu ? "હાજરી ટકાવારી" : "Attendance %"}
                </p>
                <p className="text-xl font-black text-primary print:text-black mt-0.5">
                  {attStats.pct !== null ? `${attStats.pct}%` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Recent Attendance Log */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-primary print:text-black mb-2">
              <Award className="size-3.5" />
              <span>{isGu ? "૩. તાજેતરની હાજરી નોંધણી" : "3. Recent Attendance Log"}</span>
            </div>
            <div className="rounded-2xl border overflow-hidden print:border-neutral-300">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b print:bg-neutral-100">
                  <tr className="text-left font-bold text-muted-foreground print:text-black">
                    <th className="p-2 pl-3">{isGu ? "તારીખ" : "Date"}</th>
                    <th className="p-2">{isGu ? "વાર" : "Day"}</th>
                    <th className="p-2 text-right pr-3">{isGu ? "હાજરી સ્થિતિ" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {attStats.records.slice(0, 7).map((r, idx) => {
                    const dayName = new Date(r.date + "T00:00:00").toLocaleDateString(
                      isGu ? "gu-IN" : "en-GB",
                      { weekday: "long" }
                    );
                    const isPresent = r.status === "P";
                    return (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="p-2 pl-3 font-semibold text-foreground print:text-black">
                          {isGu ? formatGujaratiDate(r.date) : niceDate(r.date)}
                        </td>
                        <td className="p-2 text-muted-foreground print:text-neutral-700">
                          {dayName}
                        </td>
                        <td className="p-2 text-right pr-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              isPresent
                                ? "bg-success-soft text-success border border-success/30 print:text-black print:border-black"
                                : "bg-danger-soft text-destructive border border-destructive/30 print:text-black print:border-black"
                            }`}
                          >
                            {isPresent
                              ? isGu
                                ? "હાજર (Present)"
                                : "PRESENT"
                              : isGu
                              ? "ગેરહાજર (Absent)"
                              : "ABSENT"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {attStats.records.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-muted-foreground text-xs">
                        {isGu ? "હાજરી નોંધણી ઉપલબ્ધ નથી." : "No attendance logs recorded yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Performance Note */}
          <div className="rounded-2xl border bg-muted/30 p-3 print:border-neutral-300">
            <p className="text-[10px] font-black uppercase text-muted-foreground print:text-neutral-700">
              {isGu ? "૪. સંચાલક અભિપ્રાય અને મૂલ્યાંકન" : "4. Performance Assessment"}
            </p>
            <p className="text-xs text-foreground print:text-black mt-1 leading-relaxed">
              {attStats.pct !== null && attStats.pct >= 90
                ? isGu
                  ? "શિક્ષકશ્રીનું કાર્ય સંસ્થા પ્રત્યે અત્યંત સમર્પિત અને નિયમિત છે. વિદ્યાર્થીઓનું માર્ગદર્શન ઉત્સાહપૂર્વક કરે છે."
                  : "Faculty exhibits commendable dedication, punctuality, and exemplary subject leadership."
                : isGu
                ? "શિક્ષકશ્રીનું કાર્ય સંતોષકારક છે અને અભ્યાસક્રમ સમયસર પૂર્ણ કરવા પ્રયત્નશીલ છે."
                : "Faculty demonstrates regular teaching performance and syllabus progress."}
            </p>
          </div>

          {/* 6. Signatures (2 columns: Faculty Signature & Authorized Director Sunil Patel) */}
          <div className="mt-8 pt-4 border-t-2 border-foreground/30 flex items-end justify-between px-6 text-center">
            <div>
              <div className="w-32 mx-auto border-b border-foreground/60 mb-1 h-8" />
              <p className="text-[11px] print:text-xs font-bold text-foreground">
                {isGu ? "શિક્ષકની સહી" : "Faculty's Signature"}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {facultyDisplayName}
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
        <div className="grid grid-cols-3 gap-2 print:hidden pt-2 border-t">
          <Button
            className="h-11 font-bold text-xs gap-1.5"
            onClick={handlePrint}
          >
            <Printer className="size-4" /> {isGu ? "પ્રિન્ટ રિપોર્ટ" : "Print Dossier"}
          </Button>
          <Button
            variant="secondary"
            className="btn-wa h-11 font-bold text-xs gap-1.5"
            onClick={handleWhatsAppShare}
          >
            <MessageCircle className="size-4" /> {isGu ? "વોટ્સએપ શેર" : "WhatsApp"}
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
