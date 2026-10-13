import { useState } from "react";
import {
  X,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Pencil,
  Phone,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useStore,
  thisMonth,
  facultyMonthlyStats,
  facultyAllMonthsHistory,
  formatMonthLabel,
  formatDayDate,
  type Faculty,
} from "@/lib/store";
import { useLanguage, toGujaratiName } from "@/lib/i18n";

interface Props {
  faculty: Faculty;
  onClose: () => void;
  onEdit: (faculty: Faculty) => void;
  onGenerateReport: (faculty: Faculty) => void;
}

export function FacultyDetailsModal({
  faculty,
  onClose,
  onEdit,
  onGenerateReport,
}: Props) {
  const s = useStore();
  const { lang } = useLanguage();
  const isGu = lang === "gu";

  const allMonthsHistory = facultyAllMonthsHistory(s, faculty.id);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    allMonthsHistory[0]?.month || thisMonth()
  );

  const stats = facultyMonthlyStats(s, faculty.id, selectedMonth);
  const facName = isGu
    ? faculty.nameGu || toGujaratiName(faculty.name)
    : faculty.name;

  const assignedBatches = s.batches.filter(
    (b) => b.facultyId === faculty.id && !b.archived
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-card border shadow-2xl p-5 sm:p-7 space-y-5 text-foreground max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* 1. Header & Profile */}
        <div className="flex items-center gap-3.5 border-b pb-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-secondary font-black text-2xl text-primary">
            {faculty.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-foreground truncate">
                {facName}
              </h2>
              {faculty.archived && (
                <span className="chip bg-muted text-muted-foreground text-[10px] font-bold">
                  {isGu ? "સંગ્રહિત" : "Archived"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {faculty.subject} · {faculty.qualification || (isGu ? "ફેકલ્ટી મેન્ટર" : "Faculty Mentor")}
            </p>
            {faculty.phone && (
              <a
                href={`tel:${faculty.phone}`}
                className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1"
              >
                <Phone className="size-3" /> {faculty.phone}
              </a>
            )}
          </div>
        </div>

        {/* 2. Faculty Academic Info & Assigned Batches */}
        <div className="rounded-2xl bg-muted/30 p-4 border space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground block font-bold">
                {isGu ? "મુખ્ય વિષય:" : "Primary Subject:"}
              </span>
              <span className="font-extrabold text-foreground text-sm">
                {faculty.subject}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block font-bold">
                {isGu ? "શૈક્ષણિક લાયકાત:" : "Qualification:"}
              </span>
              <span className="font-semibold text-foreground">
                {faculty.qualification || "—"}
              </span>
            </div>
          </div>

          {assignedBatches.length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground block font-bold mb-1 flex items-center gap-1">
                <BookOpen className="size-3.5 text-primary" />
                {isGu ? "સોંપેલ બેચ:" : "Assigned Batches:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {assignedBatches.map((b) => (
                  <span
                    key={b.id}
                    className="chip bg-card border font-bold text-foreground text-[11px]"
                  >
                    {b.name} ({b.standard})
                  </span>
                ))}
              </div>
            </div>
          )}

          {faculty.notes && (
            <div className="pt-2 border-t text-muted-foreground italic">
              "{faculty.notes}"
            </div>
          )}
        </div>

        {/* 3. Month Filter Tabs */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-foreground flex items-center justify-between">
            <span>{isGu ? "મહિનો પસંદ કરો:" : "Select Month:"}</span>
            <span className="text-primary font-bold">
              {formatMonthLabel(selectedMonth, isGu)}
            </span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {allMonthsHistory.map((m) => (
              <button
                key={m.month}
                type="button"
                className={`chip shrink-0 px-3.5 py-1.5 font-bold transition ${
                  selectedMonth === m.month
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setSelectedMonth(m.month)}
              >
                {formatMonthLabel(m.month, isGu)}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Attendance Metrics */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-2xl border bg-muted/20 p-2.5">
            <p className="text-[10px] font-bold text-muted-foreground">
              {isGu ? "કુલ દિવસો" : "Total Days"}
            </p>
            <p className="text-xl font-black text-foreground mt-0.5">
              {stats.total}
            </p>
          </div>
          <div className="rounded-2xl border border-success/30 bg-success-soft p-2.5">
            <p className="text-[10px] font-bold text-success">
              {isGu ? "હાજર દિવસો" : "Present"}
            </p>
            <p className="text-xl font-black text-success mt-0.5">
              {stats.present}
            </p>
          </div>
          <div className="rounded-2xl border border-destructive/30 bg-danger-soft p-2.5">
            <p className="text-[10px] font-bold text-destructive">
              {isGu ? "ગેરહાજર" : "Absent"}
            </p>
            <p className="text-xl font-black text-destructive mt-0.5">
              {stats.absent}
            </p>
          </div>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-2.5">
            <p className="text-[10px] font-bold text-primary">
              {isGu ? "હાજરી દર" : "Rate"}
            </p>
            <p className="text-xl font-black text-primary mt-0.5">
              {stats.pct !== null ? `${stats.pct}%` : "—"}
            </p>
          </div>
        </div>

        {/* 5. Specific Dates of Absence */}
        <div className="rounded-2xl border p-3.5 space-y-2 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-destructive" />
              {isGu
                ? `ગેરહાજર રહેલ તારીખો (${stats.absentDates.length} દિવસ)`
                : `Dates of Absence (${stats.absentDates.length} Days)`}
            </span>
          </div>

          {stats.absentDates.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {stats.absentDates.map((dateStr) => (
                <span
                  key={dateStr}
                  className="chip bg-destructive text-destructive-foreground font-black text-xs px-3 py-1 flex items-center gap-1 shadow-2xs"
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
                ? "🎉 આ મહિનામાં એક પણ દિવસ ગેરહાજર નથી (૧૦૦% સંપૂર્ણ હાજરી)!"
                : "🎉 Perfect attendance this month! Zero absent days recorded."}
            </div>
          )}
        </div>

        {/* 6. Month-by-Month Attendance Breakdown Table */}
        <div className="space-y-2">
          <p className="text-xs font-black uppercase text-foreground">
            {isGu ? "તમામ મહિનાઓનો હાજરી ઇતિહાસ" : "Month-by-Month Attendance History"}
          </p>
          <div className="rounded-2xl border overflow-hidden text-xs">
            <table className="w-full">
              <thead className="bg-muted/50 border-b font-bold text-muted-foreground">
                <tr className="text-left">
                  <th className="p-2.5 pl-3">{isGu ? "મહિનો" : "Month"}</th>
                  <th className="p-2 text-center">{isGu ? "હાજર" : "P"}</th>
                  <th className="p-2 text-center">{isGu ? "ગેરહાજર" : "A"}</th>
                  <th className="p-2">{isGu ? "ગેરહાજર તારીખો" : "Absent Dates"}</th>
                  <th className="p-2.5 pr-3 text-right">{isGu ? "હાજરી ટકાવારી" : "Rate"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {allMonthsHistory.map((m) => (
                  <tr
                    key={m.month}
                    className={`hover:bg-muted/30 cursor-pointer ${
                      selectedMonth === m.month ? "bg-primary/5 font-bold" : ""
                    }`}
                    onClick={() => setSelectedMonth(m.month)}
                  >
                    <td className="p-2.5 pl-3 font-semibold text-foreground">
                      {formatMonthLabel(m.month, isGu)}
                    </td>
                    <td className="p-2 text-center text-success font-black">
                      {m.present}
                    </td>
                    <td className="p-2 text-center text-destructive font-black">
                      {m.absent}
                    </td>
                    <td className="p-2 text-muted-foreground truncate max-w-[150px]">
                      {m.absentDates.length
                        ? m.absentDates.map((d) => formatDayDate(d, isGu)).join(", ")
                        : isGu
                        ? "—"
                        : "None"}
                    </td>
                    <td className="p-2.5 pr-3 text-right font-black text-primary">
                      {m.pct !== null ? `${m.pct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <Button
            variant="default"
            className="h-11 font-bold text-xs gap-1.5"
            onClick={() => onGenerateReport(faculty)}
          >
            <FileText className="size-4" />
            {isGu ? "ફેકલ્ટી રિપોર્ટ" : "Faculty Dossier"}
          </Button>

          <Button
            variant="secondary"
            className="h-11 font-bold text-xs gap-1.5"
            onClick={() => onEdit(faculty)}
          >
            <Pencil className="size-4" />
            {isGu ? "વિગતો સુધારો" : "Edit Profile"}
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
