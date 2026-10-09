import { useSyncExternalStore } from "react";

export type Language = "en" | "gu";

const LANG_KEY = "ggt_lang";
let currentLang: Language = "en";

if (typeof window !== "undefined") {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "gu") {
      currentLang = saved;
    }
  } catch {
    currentLang = "en";
  }
}

const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language) {
  if (currentLang === lang) return;
  currentLang = lang;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // storage unavailable
    }
  }
  listeners.forEach((fn) => fn());
}

export function useLanguage() {
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentLang,
    () => "en" as Language
  );

  return {
    lang,
    setLang: setLanguage,
    t: (key: string, defaultText?: string) => translate(key, defaultText, lang),
  };
}

// Convert numbers to Gujarati Words (Indian Rupee Currency Format)
export function numberToGujaratiWords(num: number): string {
  if (!num || num <= 0) return "અંકે રૂપિયા શૂન્ય પુરા";

  const ones = [
    "",
    "એક",
    "બે",
    "ત્રણ",
    "ચાર",
    "પાંચ",
    "છ",
    "સાત",
    "આઠ",
    "નવ",
    "દસ",
    "અગિયાર",
    "બાર",
    "તેર",
    "ચૌદ",
    "પંદર",
    "સોળ",
    "સત્તર",
    "અઢાર",
    "ઓગણીસ",
    "વીસ",
    "એકવીસ",
    "બાવીસ",
    "તેવીસ",
    "ચોવીસ",
    "પચીસ",
    "છવીસ",
    "સત્તાવીસ",
    "અઠ્ઠાવીસ",
    "ઓગણત્રીસ",
    "ત્રીસ",
    "એકત્રીસ",
    "બત્રીસ",
    "તેત્રીસ",
    "ચોત્રીસ",
    "પાંત્રીસ",
    "છત્રીસ",
    "સાડત્રીસ",
    "આડત્રીસ",
    "ઓગણચાલીસ",
    "ચાલીસ",
    "એકતાલીસ",
    "બેતાલીસ",
    "તેંતાલીસ",
    "ચુંમાલીસ",
    "પિસ્તાલીસ",
    "છેંતાલીસ",
    "સુડતાલીસ",
    "અડતાલીસ",
    "ઓગણપચાસ",
    "પચાસ",
    "એકાવન",
    "બાવન",
    "ત્રેપન",
    "ચોપન",
    "પંચાવન",
    "છપ્પન",
    "સત્તાવન",
    "અઠ્ઠાવન",
    "ઓગણસાઠ",
    "સાઠ",
    "એકસઠ",
    "બાસઠ",
    "ત્રેસઠ",
    "ચોસઠ",
    "પાંસઠ",
    "છાસઠ",
    "સડસઠ",
    "અડસઠ",
    "અગણોસિત્તેર",
    "સિત્તેર",
    "એકોતેર",
    "બોતેર",
    "તોતેર",
    "ચોતેર",
    "પંચોતેર",
    "છોતેર",
    "સંતોતેર",
    "ઇઠોતેર",
    "ઓગણાએંસી",
    "એંસી",
    "એક્યાસી",
    "બ્યાસી",
    "ત્યાસી",
    "ચોર્યાસી",
    "પંચાસી",
    "છ્યાસી",
    "સત્ત્યાસી",
    "અઠ્યાસી",
    "નેવ્યાસી",
    "નેવું",
    "એકાણું",
    "બાણું",
    "ત્રાણું",
    "ચોરાણું",
    "પંચાણું",
    "છન્નું",
    "સત્તાણું",
    "અઠ્ઠાણું",
    "નવ્વાણું",
  ];

  function convert(n: number): string {
    if (n < 100) return ones[n] || "";
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const rem = n % 100;
      return (
        (h === 1 ? "એકસો" : ones[h] + " સો") + (rem ? " " + convert(rem) : "")
      );
    }
    if (n < 100000) {
      const th = Math.floor(n / 1000);
      const rem = n % 1000;
      return ones[th] + " હજાર" + (rem ? " " + convert(rem) : "");
    }
    if (n < 10000000) {
      const lk = Math.floor(n / 100000);
      const rem = n % 100000;
      return ones[lk] + " લાખ" + (rem ? " " + convert(rem) : "");
    }
    const cr = Math.floor(n / 10000000);
    const rem = n % 10000000;
    return ones[cr] + " કરોડ" + (rem ? " " + convert(rem) : "");
  }

  return "અંકે રૂપિયા " + convert(Math.floor(num)).trim() + " પુરા";
}

// English Number to Words
export function numberToWords(num: number): string {
  if (!num || num <= 0) return "Zero Rupees Only";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(n: number): string {
    if (n < 20) return a[n]!;
    if (n < 100)
      return b[Math.floor(n / 10)]! + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " and " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    );
  }

  return "Rupees " + inWords(Math.floor(num)) + " Only";
}

// Convert date to Gujarati representation
export function formatGujaratiDate(isoDate: string): string {
  if (!isoDate) return "—";
  try {
    const parts = isoDate.split("-");
    if (parts.length !== 3) return isoDate;
    const year = parts[0]!;
    const monthIdx = parseInt(parts[1]!, 10) - 1;
    const day = parts[2]!;

    const gujMonths = [
      "જાન્યુઆરી",
      "ફેબ્રુઆરી",
      "માર્ચ",
      "એપ્રિલ",
      "મે",
      "જૂન",
      "જુલાઈ",
      "ઓગસ્ટ",
      "સપ્ટેમ્બર",
      "ઓક્ટોબર",
      "નવેમ્બર",
      "ડિસેમ્બર",
    ];

    return `${day} ${gujMonths[monthIdx] || ""} ${year}`;
  } catch {
    return isoDate;
  }
}

// Main Translation Dictionary
export const translations: Record<string, { en: string; gu: string }> = {
  // Navigation Tabs
  "nav.home": { en: "Home", gu: "મુખ્ય પૃષ્ઠ" },
  "nav.students": { en: "Students", gu: "વિદ્યાર્થીઓ" },
  "nav.attendance": { en: "Attendance", gu: "હાજરી" },
  "nav.fees": { en: "Fees", gu: "ફી પહોંચ" },
  "nav.more": { en: "More", gu: "વધુ" },

  // App titles
  "app.name": { en: "Gurukul Group Tuition", gu: "ગુરૂકુલ ગ્રુપ ટ્યુશન" },
  "app.tagline": {
    en: "Coaching for 9th, 10th, 11th & 12th",
    gu: "ધોરણ ૯, ૧૦, ૧૧ અને ૧૨ શૈક્ષણિક ટ્યુશન",
  },
  "app.management": { en: "Management", gu: "સંચાલન અને વ્યવસ્થાપન" },

  // Home Screen
  "home.greeting": { en: "Namaste 🙏", gu: "નમસ્તે 🙏" },
  "home.collected_month": {
    en: "Total Collections (This Month)",
    gu: "આ મહિને જમા થયેલ કુલ ફી",
  },
  "home.today": { en: "Today", gu: "આજનું કલેક્શન" },
  "home.pending": { en: "Pending Balance", gu: "કુલ બાકી ફી" },
  "home.students_present": {
    en: "Students Present",
    gu: "હાજર વિદ્યાર્થીઓ",
  },
  "home.faculty_present": { en: "Faculty Present", gu: "હાજર શિક્ષકો" },
  "home.classes_today": { en: "Classes Scheduled", gu: "આજના બેચ / ક્લાસ" },
  "home.fees_pending": { en: "Students with Due Fees", gu: "બાકી ફી વાળા વિદ્યાર્થી" },
  "home.add_student": { en: "Add Student", gu: "વિદ્યાર્થી ઉમેરો" },
  "home.take_attendance": { en: "Attendance", gu: "દૈનિક હાજરી" },
  "home.fee_receipt": { en: "Fee Receipt", gu: "ફી પહોંચ બનાવો" },
  "home.attention": { en: "Needs your attention", gu: "ધ્યાન આપવાની જરૂર છે" },

  // Students Screen
  "students.title": { en: "Students", gu: "વિદ્યાર્થીઓની યાદી" },
  "students.search": {
    en: "Search by name, student ID, or phone...",
    gu: "વિદ્યાર્થીનું નામ, ID અથવા ફોન નંબરથી શોધો...",
  },
  "students.all_batches": { en: "All Batches", gu: "બધી બેચ" },
  "students.showing": { en: "Showing", gu: "દર્શાવેલ" },
  "students.active": { en: "active students", gu: "સક્રિય વિદ્યાર્થીઓ" },
  "students.archived": { en: "archived students", gu: "આર્કાઇવ વિદ્યાર્થીઓ" },
  "students.view_archived": {
    en: "View archived students →",
    gu: "આર્કાઇવ વિદ્યાર્થીઓ જુઓ →",
  },
  "students.view_active": {
    en: "← Show active students",
    gu: "← સક્રિય વિદ્યાર્થીઓ જુઓ",
  },
  "students.paid_till_date": { en: "Paid Till Date", gu: "અત્યાર સુધી ભરેલ" },
  "students.total_fee": { en: "Total Fee", gu: "કુલ ફી" },
  "students.due": { en: "Due", gu: "બાકી" },
  "students.paid_full": { en: "Fully Paid", gu: "સંપૂર્ણ ચૂકતે" },
  "students.att": { en: "Att", gu: "હાજરી" },
  "students.add_new": { en: "Add Student", gu: "નવો વિદ્યાર્થી ઉમેરો" },

  // Student Profile
  "profile.title": { en: "Student Profile", gu: "વિદ્યાર્થી પ્રોફાઇલ" },
  "profile.call_parent": { en: "Call Parent", gu: "વાલીને કોલ કરો" },
  "profile.whatsapp": { en: "WhatsApp", gu: "વ્હોટ્સએપ" },
  "profile.edit": { en: "Edit Profile", gu: "પ્રોફાઇલ સુધારો" },
  "profile.collect_fee": { en: "Collect Fee", gu: "ફી સ્વીકારો" },
  "profile.attendance": { en: "Attendance", gu: "હાજરી" },
  "profile.generate_report": { en: "Generate Report", gu: "રિપોર્ટ કાર્ડ બનાવો" },
  "profile.attendance_rate": { en: "Attendance Rate", gu: "હાજરીની ટકાવારી" },
  "profile.days_present": { en: "Days Present", gu: "હાજર દિવસો" },
  "profile.days_absent": { en: "Days Absent", gu: "ગેરહાજર દિવસો" },
  "profile.total_classes": { en: "Total Sessions", gu: "કુલ ક્લાસ" },
  "profile.fee_status": { en: "Fee Account Summary", gu: "ફી ખાતાનો સારાંશ" },
  "profile.fee_total": { en: "Total Academic Fee", gu: "કુલ વાર્ષિક ફી" },
  "profile.fee_paid": { en: "Total Paid Till Date", gu: "અત્યાર સુધી ભરેલ ફી" },
  "profile.fee_balance": { en: "Remaining Balance", gu: "બાકી રહેતી ફી" },
  "profile.fee_cleared": { en: "Fee Cleared", gu: "ફી ચૂકતે થયેલ છે" },
  "profile.test_marks": { en: "Conducted Tests & Marks", gu: "લેવાયેલ પરીક્ષા અને મેળવેલ ગુણ" },
  "profile.no_tests": {
    en: "No test records found for this student.",
    gu: "આ વિદ્યાર્થી માટે હજુ કોઈ પરીક્ષા નોંધાયેલ નથી.",
  },
  "profile.info": { en: "Student Information", gu: "વિદ્યાર્થીની વિગતો" },
  "profile.phone": { en: "Student Phone", gu: "વિદ્યાર્થી ફોન" },
  "profile.parent_phone": { en: "Parent Phone", gu: "વાલીનો ફોન" },
  "profile.standard": { en: "Standard / Grade", gu: "ધોરણ" },
  "profile.batch": { en: "Batch Assigned", gu: "બેચ" },
  "profile.school": { en: "School / Institute", gu: "શાળા / કોલેજ" },
  "profile.joined": { en: "Admission Date", gu: "પ્રવેશ તારીખ" },
  "profile.receipts": { en: "Fee Receipts History", gu: "ફી પહોંચ હિસ્ટ્રી" },
  "profile.new_receipt": { en: "+ New Receipt", gu: "+ નવી પહોંચ" },

  // Fees & Receipts
  "fees.title": { en: "Fee Receipts", gu: "ફી પહોંચ વ્યવસ્થા" },
  "fees.tab_create": { en: "Create Receipt", gu: "પહોંચ બનાવો" },
  "fees.tab_history": { en: "Receipt History", gu: "પહોંચ હિસ્ટ્રી" },
  "fees.tab_overview": { en: "Collections", gu: "કુલ આવક" },
  "fees.select_student": { en: "Select Student *", gu: "વિદ્યાર્થી પસંદ કરો *" },
  "fees.student_id": { en: "Student ID", gu: "વિદ્યાર્થી ID" },
  "fees.standard": { en: "Standard", gu: "ધોરણ" },
  "fees.batch": { en: "Batch", gu: "બેચ" },
  "fees.payment_info": { en: "Payment Information", gu: "ચુકવણી વિગતો" },
  "fees.receipt_date": { en: "Receipt Date", gu: "પહોંચ તારીખ" },
  "fees.payment_method": { en: "Payment Method", gu: "ચુકવણી પદ્ધતિ" },
  "fees.purpose": { en: "Payment Purpose", gu: "ચુકવણી હેતુ" },
  "fees.cash": { en: "Cash", gu: "રોકડ (Cash)" },
  "fees.upi": { en: "UPI (GPay / PhonePe)", gu: "UPI (Google Pay / PhonePe)" },
  "fees.bank": { en: "Bank Transfer / NEFT", gu: "બેંક ટ્રાન્સફર" },
  "fees.cheque": { en: "Cheque", gu: "ચેક" },
  "fees.fee_summary": { en: "Fee Summary & Ledger", gu: "ફી હિસાબ અને બાકી રકમ" },
  "fees.total_fee": { en: "Total Academic Fee", gu: "કુલ વાર્ષિક ફી" },
  "fees.previously_paid": { en: "Previously Paid Till Date", gu: "અત્યાર સુધી ભરેલ ફી" },
  "fees.current_payment": { en: "Current Payment Received *", gu: "હાલ સ્વીકારેલ રકમ *" },
  "fees.remaining_balance": { en: "Remaining Balance Due", gu: "બાકી રહેતી ફી" },
  "fees.remarks": { en: "Remarks / Notes", gu: "નોંધ / રીમાર્કસ" },
  "fees.generate_button": { en: "🧾 GENERATE RECEIPT", gu: "🧾 ફી પહોંચ બનાવો" },
  "fees.receipt_generated": {
    en: "Receipt Generated Successfully",
    gu: "ફી પહોંચ સફળતાપૂર્વક બની ગઈ!",
  },
  "fees.receipt_title": { en: "Fee Payment Receipt", gu: "ફી ચુકવણી પહોંચ" },
  "fees.official_receipt": {
    en: "OFFICIAL FEE PAYMENT RECEIPT",
    gu: "સત્તાવાર ફી ચુકવણી પહોંચ",
  },
  "fees.receipt_no": { en: "Receipt No", gu: "પહોંચ નં." },
  "fees.date_issue": { en: "Date of Issue", gu: "તારીખ" },
  "fees.amount_received": { en: "AMOUNT RECEIVED", gu: "સ્વીકારેલ રકમ" },
  "fees.amount_in_words": { en: "Amount in Words", gu: "અંકે રૂપિયા" },
  "fees.terms_1": {
    en: "1. Fees once paid are non-refundable & non-transferable.",
    gu: "૧. ભરેલ ફી કોઈપણ સંજોગોમાં પરત મળશે નહીં કે બદલાશે નહીં.",
  },
  "fees.terms_2": {
    en: "2. This is an official digital record issued by Gurukul Group Tuition.",
    gu: "૨. આ ગુરૂકુલ ગ્રુપ ટ્યુશન દ્વારા જારી કરાયેલ સત્તાવાર ડિજિટલ પહોંચ છે.",
  },
  "fees.terms_3": {
    en: "3. Please preserve this receipt for academic verification and fee clearance.",
    gu: "૩. શૈક્ષણિક ચકાસણી માટે આ પહોંચ સાચવી રાખવી જરૂરી છે.",
  },
  "fees.thank_you": {
    en: "Thank you for choosing Gurukul Group Tuition.",
    gu: "ગુરૂકુલ ગ્રુપ ટ્યુશન પર વિશ્વાસ મુકવા બદલ આભાર.",
  },
  "fees.motto": {
    en: "Committed to quality education, academic discipline & student success.",
    gu: "ગુણવત્તાયુક્ત શિક્ષણ અને શ્રેષ્ઠ પરિણામ માટે કટિબદ્ધ.",
  },
  "fees.auth_sign": { en: "Authorized Signature", gu: "અધિકૃત સહી / સંચાલક" },
  "fees.download_pdf": { en: "Download PDF", gu: "PDF ડાઉનલોડ" },
  "fees.share": { en: "Share", gu: "શેર કરો" },
  "fees.print": { en: "Print", gu: "પ્રિન્ટ" },
  "fees.whatsapp": { en: "WhatsApp", gu: "વ્હોટ્સએપ" },
  "fees.generate_another": {
    en: "Generate Another Receipt",
    gu: "બીજી પહોંચ બનાવો",
  },

  // Attendance
  "att.title": { en: "Daily Attendance", gu: "દૈનિક હાજરી" },
  "att.select_batch": { en: "Select Batch", gu: "બેચ પસંદ કરો" },
  "att.date": { en: "Attendance Date", gu: "હાજરી તારીખ" },
  "att.mark_present": { en: "Present", gu: "હાજર" },
  "att.mark_absent": { en: "Absent", gu: "ગેરહાજર" },
  "att.all_present": { en: "Mark All Present", gu: "બધાને હાજર કરો" },
  "att.save_attendance": { en: "Save Attendance", gu: "હાજરી સાચવો" },
  "att.send_wa": { en: "Send Absentees on WhatsApp", gu: "ગેરહાજર મેસેજ મોકલો" },

  // Tests & Marks
  "tests.title": { en: "Conducted Tests & Marks", gu: "પરીક્ષા અને ગુણ પત્રક" },
  "tests.new_test": { en: "+ Add New Test", gu: "+ નવી પરીક્ષા ઉમેરો" },
  "tests.record_marks": { en: "Record Marks", gu: "ગુણ દાખલ કરો" },
  "tests.test_name": { en: "Test Name", gu: "પરીક્ષાનું નામ" },
  "tests.subject": { en: "Subject", gu: "વિષય" },
  "tests.date": { en: "Exam Date", gu: "પરીક્ષા તારીખ" },
  "tests.batch": { en: "Target Batch", gu: "બેચ" },
  "tests.out_of": { en: "Max Marks", gu: "કુલ ગુણ" },
  "tests.score": { en: "Marks Obtained", gu: "મેળવેલ ગુણ" },
  "tests.percentage": { en: "Percentage", gu: "ટકાવારી" },
  "tests.result": { en: "Result Status", gu: "પરિણામ" },

  // Student Report Card
  "report.title": {
    en: "STUDENT PROGRESS REPORT",
    gu: "વિદ્યાર્થી પ્રગતિ અહેવાલ (રિપોર્ટ કાર્ડ)",
  },
  "report.subtitle": {
    en: "Academic Year 2026 – 2027",
    gu: "શૈક્ષણિક વર્ષ ૨૦૨૬ – ૨૦૨૭",
  },
  "report.attendance_summary": {
    en: "1. ATTENDANCE RECORD",
    gu: "૧. હાજરી વિગતો",
  },
  "report.fee_summary": { en: "2. FEE ACCOUNT STATUS", gu: "૨. ફી ખાતાની વિગત" },
  "report.test_summary": {
    en: "3. ACADEMIC TEST PERFORMANCE",
    gu: "૩. પરીક્ષા પરિણામ અને ગુણ પત્રક",
  },
  "report.remarks_title": {
    en: "4. FACULTY REMARKS & ASSESSMENT",
    gu: "૪. શિક્ષકનો અભિપ્રાય / શેરો",
  },
  "report.parent_sign": { en: "Parent's Signature", gu: "વાલીની સહી" },
  "report.teacher_sign": { en: "Class Teacher's Signature", gu: "વર્ગ શિક્ષકની સહી" },
  "report.principal_sign": {
    en: "Director / Principal Signature",
    gu: "સંચાલક / આચાર્યની સહી",
  },
};

export function translate(
  key: string,
  defaultText?: string,
  lang: Language = currentLang
): string {
  const item = translations[key];
  if (!item) return defaultText || key;
  return item[lang] || defaultText || item.en || key;
}

// Check if text already has Gujarati Unicode characters
export function isGujarati(text: string): boolean {
  return /[\u0A80-\u0AFF]/.test(text);
}

// Comprehensive Dictionary for Student Names, Surnames, and Common Indian First Names
export const NAME_DICTIONARY: Record<string, string> = {
  // All Seed Students (Full Names)
  "rahul patel": "રાહુલ પટેલ",
  "aarav shah": "આરવ શાહ",
  "dhruv patel": "ધ્રુવ પટેલ",
  "krish shah": "ક્રિશ શાહ",
  "yash mehta": "યશ મહેતા",
  "priya desai": "પ્રિયા દેસાઈ",
  "isha joshi": "ઈશા જોશી",
  "meet trivedi": "મીત ત્રિવેદી",
  "riya parmar": "રિયા પરમાર",
  "om rathod": "ઓમ રાઠોડ",
  "diya chauhan": "દિયા ચૌહાણ",
  "harsh vora": "હર્ષ વોરા",

  // Faculty Full Names
  "rakesh sir": "રાકેશ સર",
  "amit sir": "અમિત સર",
  "neha ma'am": "નેહા મેડમ",
  "neha madam": "નેહા મેડમ",

  // First Names
  "rahul": "રાહુલ",
  "aarav": "આરવ",
  "dhruv": "ધ્રુવ",
  "krish": "ક્રિશ",
  "yash": "યશ",
  "priya": "પ્રિયા",
  "isha": "ઈશા",
  "meet": "મીત",
  "riya": "રિયા",
  "om": "ઓમ",
  "diya": "દિયા",
  "harsh": "હર્ષ",
  "kavya": "કાવ્યા",
  "aditya": "આદિત્ય",
  "aryan": "આર્યન",
  "ananya": "અનન્યા",
  "dev": "દેવ",
  "dhyey": "ધ્યેય",
  "het": "હેત",
  "parth": "પાર્થ",
  "manan": "મનન",
  "jeet": "જીત",
  "karan": "કરણ",
  "jay": "જય",
  "rohan": "રોહન",
  "vivek": "વિવેક",
  "chirag": "ચિરાગ",
  "bhavesh": "ભાવેશ",
  "jignesh": "જીગ્નેશ",
  "nilesh": "નિલેશ",
  "hitesh": "હિતેશ",
  "alpesh": "અલ્પેશ",
  "paresh": "પરેશ",
  "mukesh": "મુકેશ",
  "rakesh": "રાકેશ",
  "amit": "અમિત",
  "neha": "નેહા",
  "pooja": "પૂજા",
  "puja": "પૂજા",
  "sneha": "સ્નેહા",
  "divya": "દિવ્યા",
  "mansi": "માનસી",
  "khushi": "ખુશી",
  "dharti": "ધરતી",
  "tanvi": "તન્વી",
  "drashti": "દ્રષ્ટિ",
  "kruti": "કૃતિ",
  "hardik": "હાર્દિક",
  "pratik": "પ્રતીક",
  "deep": "દીપ",
  "dip": "દીપ",
  "mohit": "મોહિત",
  "tirth": "તીર્થ",
  "vansh": "વંશ",
  "shlok": "શ્લોક",
  "rudra": "રુદ્ર",
  "ved": "વેદ",
  "shiv": "શિવ",
  "krishna": "કૃષ્ણા",
  "ram": "રામ",
  "shyam": "શ્યામ",
  "sahil": "સાહિલ",
  "varun": "વરુણ",
  "siddharth": "સિદ્ધાર્થ",
  "aniket": "અનિકેત",
  "akash": "આકાશ",
  "aakash": "આકાશ",
  "ayush": "આયુષ",
  "darshan": "દર્શન",
  "bhavin": "ભાવિન",
  "mehul": "મેહુલ",
  "sachin": "સચિન",
  "vishal": "વિશાલ",
  "sanjay": "સંજય",
  "ajay": "અજય",
  "vijay": "વિજય",
  "raj": "રાજ",
  "rajesh": "રાજેશ",
  "suresh": "સુરેશ",
  "ramesh": "રમેશ",
  "dinesh": "દિનેશ",
  "piyush": "પિયુષ",
  "gaurav": "ગૌરવ",
  "mayur": "મયૂર",
  "keyur": "કેયૂર",
  "ronak": "રોનક",
  "smit": "સ્મિત",
  "nirav": "નીરવ",
  "pranav": "પ્રણવ",
  "fenil": "ફેનિલ",
  "zeel": "ઝીલ",
  "vraj": "વ્રજ",
  "shubh": "શુભ",
  "vedant": "વેદાંત",
  "hetvi": "હેતવી",
  "dhyani": "ધ્યાની",
  "krisha": "ક્રિશા",
  "mahi": "માહી",
  "prachi": "પ્રાચી",
  "foram": "ફોરમ",
  "urvi": "ઉર્વી",
  "vidhi": "વિધિ",
  "nishi": "નિશી",
  "jiya": "જીયા",
  "siya": "સીયા",
  "dhruvi": "ધ્રુવી",
  "twisha": "ત્વિષા",
  "rutu": "ઋતુ",
  "charmi": "ચાર્મી",
  "bansi": "બંસી",
  "veni": "વેણી",
  "nidhi": "નિધિ",
  "riddhi": "રિદ્ધિ",
  "siddhi": "સિદ્ધિ",
  "ritu": "રિતુ",
  "shruti": "શ્રુતિ",
  "shreya": "શ્રેયા",
  "swati": "સ્વાતિ",
  "kinjal": "કિંજલ",
  "heena": "હીના",
  "komal": "કોમલ",
  "payal": "પાયલ",
  "kajal": "કાજલ",
  "sheetal": "શીતલ",
  "aarti": "આરતી",
  "geeta": "ગીતા",
  "seema": "સીમા",
  "rekha": "રેખા",
  "meena": "મીના",
  "bhavna": "ભાવના",
  "hansa": "હંસા",
  "kokila": "કોકિલા",
  "varsha": "વર્ષા",
  "meera": "મીરા",
  "radha": "રાધા",
  "sita": "સીતા",
  "sharda": "શારદા",
  "laxmi": "લક્ષ્મી",
  "parvati": "પાર્વતી",
  "tanmay": "તન્મય",
  "abhishek": "અભિષેક",
  "anand": "આનંદ",
  "sonal": "સોનલ",
  "manish": "મનીષ",
  "nirali": "નિરાલી",
  "chetan": "ચેતન",
  "ketan": "કેતન",
  "kalpesh": "કલ્પેશ",
  "prince": "પ્રિન્સ",
  "rushabh": "ઋષભ",
  "dwij": "દ્વિજ",
  "dhairya": "ધૈર્ય",

  // Surnames
  "patel": "પટેલ",
  "shah": "શાહ",
  "mehta": "મહેતા",
  "desai": "દેસાઈ",
  "joshi": "જોશી",
  "trivedi": "ત્રિવેદી",
  "parmar": "પરમાર",
  "rathod": "રાઠોડ",
  "chauhan": "ચૌહાણ",
  "vora": "વોરા",
  "sharma": "શર્મા",
  "pandya": "પંડ્યા",
  "bhatt": "ભટ્ટ",
  "dave": "દવે",
  "shukla": "શુક્લા",
  "vyas": "વ્યાસ",
  "upadhyay": "ઉપાધ્યાય",
  "jani": "જાની",
  "raval": "રાવલ",
  "pathak": "પાઠક",
  "purohit": "પુરોહિત",
  "gandhi": "ગાંધી",
  "modi": "મોદી",
  "soni": "સોની",
  "parikh": "પરીખ",
  "sheth": "શેઠ",
  "kothari": "કોઠારી",
  "dalal": "દલાલ",
  "kapadia": "કાપડિયા",
  "shroff": "શ્રોફ",
  "doshi": "દોશી",
  "choksi": "ચોકસી",
  "zaveri": "ઝવેરી",
  "chokshi": "ચોકસી",
  "banker": "બેંકર",
  "sanghavi": "સંઘવી",
  "prajapati": "પ્રજાપતિ",
  "solanki": "સોલંકી",
  "makwana": "મકવાણા",
  "vaghela": "વાઘેલા",
  "chavda": "ચાવડા",
  "gohil": "ગોહિલ",
  "jadeja": "જાડેજા",
  "zala": "ઝાલા",
  "dodiya": "ડોડીયા",
  "kher": "ખેર",
  "yadav": "યાદવ",
  "thakor": "ઠાકોર",
  "rajput": "રાજપૂત",
  "darji": "દરજી",
  "suthar": "સુથાર",
  "luhar": "લુહાર",
  "mistry": "મિસ્ત્રી",
  "panchal": "પંચાલ",
  "kumbhar": "કુંભાર",
  "barot": "બારોટ",
  "gadhvi": "ગઢવી",
  "bharwad": "ભરવાડ",
  "rabari": "રબારી",
  "ahir": "આહિર",
  "chaudhary": "ચૌધરી",
  "verma": "વર્મા",
  "gupta": "ગુપ્તા",
  "singh": "સિંહ",
  "mishra": "મિશ્રા",
  "tiwari": "તિવારી",
  "kumar": "કુમાર",
  "prasad": "પ્રસાદ",
  "roy": "રોય",
  "nair": "નાયર",
  "reddy": "રેડ્ડી",
  "rao": "રાવ",
  "iyer": "અય્યર",
  "bhai": "ભાઈ",
  "ben": "બેન",
  "sir": "સર",
  "ma'am": "મેડમ",
  "madam": "મેડમ",
};

// Algorithmic phonetic transliteration for names not in dictionary
export function transliteratePhoneticToGujarati(word: string): string {
  const str = word.toLowerCase();
  let i = 0;
  let out = "";
  let lastWasConsonant = false;

  const VOWEL_INITIAL: Record<string, string> = {
    aa: "આ",
    a: "અ",
    ee: "ઈ",
    ii: "ઈ",
    i: "ઇ",
    oo: "ઊ",
    uu: "ઊ",
    u: "ઉ",
    ai: "ઐ",
    au: "ઔ",
    ou: "ઔ",
    e: "એ",
    o: "ઓ",
  };

  const VOWEL_MATRA: Record<string, string> = {
    aa: "ા",
    a: "",
    ee: "ી",
    ii: "ી",
    i: "િ",
    oo: "ૂ",
    uu: "ૂ",
    u: "ુ",
    ai: "ૈ",
    au: "ૌ",
    ou: "ૌ",
    e: "ે",
    o: "ો",
  };

  const CONSONANTS: [string, string][] = [
    ["shh", "ષ"],
    ["chh", "છ"],
    ["ksh", "ક્ષ"],
    ["gya", "જ્ઞ"],
    ["gny", "જ્ઞ"],
    ["dhy", "ધ્ય"],
    ["kh", "ખ"],
    ["gh", "ઘ"],
    ["ch", "ચ"],
    ["jh", "ઝ"],
    ["th", "થ"],
    ["dh", "ધ"],
    ["ph", "ફ"],
    ["bh", "ભ"],
    ["sh", "શ"],
    ["zh", "ઝ"],
    ["tr", "ત્ર"],
    ["shr", "શ્ર"],
    ["k", "ક"],
    ["g", "ગ"],
    ["c", "ક"],
    ["j", "જ"],
    ["z", "ઝ"],
    ["t", "ત"],
    ["d", "દ"],
    ["n", "ન"],
    ["p", "પ"],
    ["f", "ફ"],
    ["b", "બ"],
    ["m", "મ"],
    ["y", "ય"],
    ["r", "ર"],
    ["l", "લ"],
    ["v", "વ"],
    ["w", "વ"],
    ["s", "સ"],
    ["h", "હ"],
    ["x", "ક્ષ"],
  ];

  while (i < str.length) {
    let matchedVowel = false;
    for (const vKey of [
      "aa",
      "ee",
      "ii",
      "oo",
      "uu",
      "ai",
      "au",
      "ou",
      "a",
      "i",
      "u",
      "e",
      "o",
    ]) {
      if (str.startsWith(vKey, i)) {
        matchedVowel = true;
        if (!lastWasConsonant) {
          out += VOWEL_INITIAL[vKey];
        } else {
          if (vKey === "a") {
            if (i + 1 === str.length) {
              out += "ા";
            }
          } else {
            out += VOWEL_MATRA[vKey];
          }
        }
        lastWasConsonant = false;
        i += vKey.length;
        break;
      }
    }
    if (matchedVowel) continue;

    let matchedConsonant = false;
    for (const [cKey, cVal] of CONSONANTS) {
      if (str.startsWith(cKey, i)) {
        if (lastWasConsonant) {
          out += "્";
        }
        out += cVal;
        lastWasConsonant = true;
        matchedConsonant = true;
        i += cKey.length;
        break;
      }
    }
    if (matchedConsonant) continue;

    out += str[i];
    lastWasConsonant = false;
    i++;
  }

  return out;
}

// Convert any English Name to Gujarati
export function toGujaratiName(input: string): string {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (isGujarati(trimmed)) return trimmed;

  const lowerFull = trimmed.toLowerCase();
  if (NAME_DICTIONARY[lowerFull]) {
    return NAME_DICTIONARY[lowerFull];
  }

  const tokens = trimmed.split(/([\s\-.]+)/);
  const result = tokens.map((token) => {
    if (!token || /^[\s\-.]+$/.test(token)) return token;
    const lowerToken = token.toLowerCase();
    if (NAME_DICTIONARY[lowerToken]) {
      return NAME_DICTIONARY[lowerToken];
    }
    return transliteratePhoneticToGujarati(token);
  });

  return result.join("");
}

// Unified Helper for Displaying Student Name in Gujarati or English
export function getStudentDisplayName(
  student: { name: string; nameGu?: string } | string | null | undefined,
  lang: Language = getLanguage()
): string {
  if (!student) return "";
  const nameEn = typeof student === "string" ? student : student.name;
  if (!nameEn) return "";

  if (lang !== "gu") {
    return nameEn;
  }

  if (typeof student === "object" && student.nameGu && student.nameGu.trim()) {
    return student.nameGu;
  }

  return toGujaratiName(nameEn);
}

// Unified Helper for Faculty Display Name
export function getFacultyDisplayName(
  faculty: { name: string; nameGu?: string } | string | null | undefined,
  lang: Language = getLanguage()
): string {
  if (!faculty) return "";
  const nameEn = typeof faculty === "string" ? faculty : faculty.name;
  if (!nameEn) return "";

  if (lang !== "gu") {
    return nameEn;
  }

  if (typeof faculty === "object" && faculty.nameGu && faculty.nameGu.trim()) {
    return faculty.nameGu;
  }

  return toGujaratiName(nameEn);
}

