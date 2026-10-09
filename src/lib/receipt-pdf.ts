import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { LOGO_JPG } from "@/lib/logo-data";
import { SIGNATURE_PNG } from "@/lib/signature-data";
import {
  niceDate,
  formatReceiptNumber,
  formatStudentId,
  type Payment,
  type Student,
  type Batch,
  type Settings,
} from "@/lib/store";
import {
  formatGujaratiDate,
  numberToGujaratiWords,
  getStudentDisplayName,
} from "@/lib/i18n";

export interface MakePdfOptions {
  payment: Payment;
  student?: Student | undefined;
  batch?: Batch | undefined;
  settings: Settings;
  lang?: "en" | "gu" | undefined;
}

// Convert numbers to Indian Rupees words in English
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
    if (n < 100) return b[Math.floor(n / 10)]! + (n % 10 ? " " + a[n % 10] : "");
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

/**
 * Builds standard, clean HTML template styled specifically for A4 format (794px width, 1123px height).
 * Uses strictly standard hex colors to avoid CSS level 4 (oklch) bugs in html2canvas.
 */
export function buildReceiptHtml({
  payment,
  student,
  batch,
  settings,
  lang = "en",
}: MakePdfOptions): string {
  const isGu = lang === "gu";

  const totalFeeVal =
    payment.totalFee ||
    student?.totalFee ||
    (student?.monthlyFee ? student.monthlyFee * 12 : 30000);
  const prevPaidVal = payment.previousPaid ?? 0;
  const currentPayVal = payment.amount;
  const remBalVal =
    payment.balance !== undefined
      ? payment.balance
      : Math.max(0, totalFeeVal - prevPaidVal - currentPayVal);

  const stuName = student
    ? getStudentDisplayName(student, isGu ? "gu" : "en")
    : isGu
    ? "વિદ્યાર્થી"
    : "Student";
  const stuId = student ? formatStudentId(student) : "—";
  const std =
    student?.standard ||
    batch?.standard ||
    payment.studentStandard ||
    (isGu ? "૧૦મું" : "10th");
  const batchName = batch?.name || payment.batchName || "10-A";
  const schoolName = student?.school || "—";
  const studentPhone = student?.parentPhone || student?.phone || "—";

  const receiptCode = formatReceiptNumber(payment);
  const dateFormatted = isGu
    ? formatGujaratiDate(payment.date)
    : niceDate(payment.date);

  const instituteName = isGu
    ? "ગુરૂકુલ ગ્રુપ ટ્યુશન"
    : settings.name || "GURUKUL GROUP TUITION";
  const receiptTitle = isGu
    ? "સત્તાવાર ફી ચુકવણી પહોંચ"
    : "OFFICIAL FEE PAYMENT RECEIPT";
  const addressText =
    settings.address ||
    (isGu
      ? "સામે સિટી સેન્ટર, અમદાવાદ, ગુજરાત - 380015"
      : "Opp. City Center, Ahmedabad, Gujarat - 380015");
  const phoneEmailText = isGu
    ? `ફોન: ${settings.phone || "9876543210"}  ·  ઈમેઈલ: contact@gurukulgroup.in`
    : `Phone: ${settings.phone || "9876543210"}  ·  Email: contact@gurukulgroup.in`;
  const coachingText = isGu
    ? "ધોરણ ૯, ૧૦, ૧૧ અને ૧૨ માટે કોચિંગ અને ટ્યુશન"
    : "Coaching & Tuition for 9th, 10th, 11th & 12th Standards";

  // Translate Payment Method
  let methodLabel = payment.method || "UPI";
  if (isGu) {
    if (payment.method === "Cash") methodLabel = "રોકડ (Cash)";
    else if (payment.method === "UPI") methodLabel = "UPI (ઓનલાઇન)";
    else if (payment.method === "Cheque") methodLabel = "ચેક (Cheque)";
    else if (payment.method === "Bank Transfer") methodLabel = "બેંક ટ્રાન્સફર";
  }

  // Translate Purpose
  let purposeLabel = payment.purpose || (isGu ? "માસિક ફી" : "Monthly Fees");
  if (isGu) {
    if (payment.purpose === "Monthly Fees") purposeLabel = "માસિક ફી (Monthly Fees)";
    else if (payment.purpose === "Admission Fees") purposeLabel = "પ્રવેશ ફી (Admission)";
    else if (payment.purpose === "Exam Fees") purposeLabel = "પરીક્ષા ફી";
    else if (payment.purpose === "Material Fees") purposeLabel = "સાહિત્ય ફી";
  }

  const words = isGu
    ? `અંકે રૂપિયા: ${numberToGujaratiWords(currentPayVal)}`
    : `Amount in Words: ${numberToWords(currentPayVal)}`;

  const remarksText = payment.remarks || payment.note || "";

  return `
    <div style="width: 794px; min-height: 1123px; padding: 28px 34px; background-color: #FAF9F6; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-family: 'Noto Sans Gujarati', 'Shruti', 'Nirmala UI', system-ui, -apple-system, sans-serif; color: #18181B; position: relative;">
      
      <!-- Top Accent Gold Strip -->
      <div style="height: 6px; background-color: #D97706; border-radius: 3px; margin-bottom: 12px; width: 100%;"></div>

      <!-- Main Container -->
      <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">

        <!-- Header Card (Deep Royal Navy) -->
        <div style="background-color: #1E1B4B; border-radius: 12px; padding: 18px 24px; display: flex; align-items: center; gap: 20px;">
          <div style="background-color: #FFFFFF; border: 2px solid #D97706; border-radius: 10px; width: 78px; height: 78px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; padding: 4px; box-sizing: border-box;">
            <img src="${LOGO_JPG}" alt="Gurukul Logo" style="width: 68px; height: 68px; object-fit: contain; display: block;" />
          </div>
          <div style="flex: 1;">
            <div style="color: #FFFFFF; font-size: 23px; font-weight: 800; line-height: 1.2; letter-spacing: 0.3px;">
              ${instituteName}
            </div>
            <div style="color: #FBBF24; font-size: 13px; font-weight: 800; letter-spacing: 0.6px; margin-top: 4px; text-transform: uppercase;">
              ${receiptTitle}
            </div>
            <div style="color: #E2E8F0; font-size: 11px; margin-top: 4px; line-height: 1.35;">
              ${addressText}
            </div>
            <div style="color: #E2E8F0; font-size: 11px; margin-top: 2px;">
              ${phoneEmailText}
            </div>
            <div style="color: #CBD5E1; font-size: 10.5px; margin-top: 2px; font-style: italic;">
              ${coachingText}
            </div>
          </div>
        </div>

        <!-- Receipt Metadata Bar -->
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 18px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="color: #64748B; font-size: 11px; font-weight: 600; display: block;">
              ${isGu ? "પહોંચ નંબર" : "Receipt Number"}
            </span>
            <span style="color: #1E1B4B; font-size: 15px; font-weight: 800;">
              ${receiptCode}
            </span>
          </div>
          <div style="text-align: right;">
            <span style="color: #64748B; font-size: 11px; font-weight: 600; display: block;">
              ${isGu ? "ઇશ્યૂ તારીખ" : "Date of Issue"}
            </span>
            <span style="color: #18181B; font-size: 14px; font-weight: 700;">
              ${dateFormatted}
            </span>
          </div>
        </div>

        <!-- Main Body White Card -->
        <div style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px 22px; display: flex; flex-direction: column; gap: 14px; position: relative;">

          <!-- SECTION 1: STUDENT DETAILS -->
          <div>
            <div style="background-color: #F1F5F9; border-radius: 6px; padding: 6px 14px; color: #1E1B4B; font-weight: 800; font-size: 12px; letter-spacing: 0.3px;">
              ${isGu ? "૧. વિદ્યાર્થીની વિગત" : "1. STUDENT INFORMATION"}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px 24px; padding: 10px 6px 0 6px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "વિદ્યાર્થીનું નામ:" : "Student Name:"}</span>
                <span style="color: #18181B; font-weight: 800;">${stuName}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "વિદ્યાર્થી ID:" : "Student ID:"}</span>
                <span style="color: #1E1B4B; font-weight: 800;">${stuId}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "ધોરણ:" : "Standard / Grade:"}</span>
                <span style="color: #18181B; font-weight: 700;">${std}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "ફાળવેલ બેચ:" : "Batch Assigned:"}</span>
                <span style="color: #18181B; font-weight: 700;">${batchName}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "શાળા / સંસ્થા:" : "School / Institute:"}</span>
                <span style="color: #18181B; font-weight: 700;">${schoolName}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "વાલીનો સંપર્ક:" : "Contact (Parent):"}</span>
                <span style="color: #18181B; font-weight: 700;">${studentPhone}</span>
              </div>
            </div>
          </div>

          <!-- SECTION 2: PAYMENT PARTICULARS -->
          <div>
            <div style="background-color: #F1F5F9; border-radius: 6px; padding: 6px 14px; color: #1E1B4B; font-weight: 800; font-size: 12px; letter-spacing: 0.3px;">
              ${isGu ? "૨. ચુકવણી વિગત" : "2. PAYMENT PARTICULARS"}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px 24px; padding: 10px 6px 0 6px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "ચુકવણી હેતુ:" : "Payment For:"}</span>
                <span style="color: #18181B; font-weight: 700;">${purposeLabel}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "ચુકવણી પદ્ધતિ:" : "Payment Mode:"}</span>
                <span style="color: #18181B; font-weight: 700;">${methodLabel}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "વ્યવહાર તારીખ:" : "Transaction Date:"}</span>
                <span style="color: #18181B; font-weight: 700;">${dateFormatted}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "ચુકવણી સ્થિતિ:" : "Status:"}</span>
                <span style="color: #15803D; font-weight: 800; letter-spacing: 0.3px;">${isGu ? "ચકાસાયેલ અને જમા" : "VERIFIED & CREDITED"}</span>
              </div>
            </div>
          </div>

          <!-- SECTION 3: FEE SUMMARY BREAKDOWN -->
          <div>
            <div style="background-color: #F1F5F9; border-radius: 6px; padding: 6px 14px; color: #1E1B4B; font-weight: 800; font-size: 12px; letter-spacing: 0.3px;">
              ${isGu ? "૩. ફી હિસાબ અને બાકી રકમ (કુલ ફી માંથી)" : "3. FEE SUMMARY & BALANCE BREAKDOWN"}
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px; padding: 8px 6px 0 6px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px dashed #E2E8F0;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "કુલ શૈક્ષણિક ફી:" : "Total Academic Fee Applicable:"}</span>
                <span style="color: #18181B; font-weight: 700;">₹${totalFeeVal.toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 6px; border-bottom: 1px dashed #E2E8F0;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "અગાઉ જમા થયેલ રકમ:" : "Previously Paid (Prior Receipts):"}</span>
                <span style="color: #18181B; font-weight: 700;">₹${prevPaidVal.toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 7px 10px; background-color: #F1F5F9; border-radius: 6px;">
                <span style="color: #1E1B4B; font-weight: 800;">${isGu ? "હાલમાં મળેલ રકમ (આ પહોંચ):" : "Current Payment Received:"}</span>
                <span style="color: #1E1B4B; font-weight: 800; font-size: 13.5px;">₹${currentPayVal.toLocaleString("en-IN")}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 6px;">
                <span style="color: #64748B; font-weight: 600;">${isGu ? "બાકી રહેતી રકમ:" : "Remaining Balance Due:"}</span>
                <span style="color: #18181B; font-weight: 700;">₹${remBalVal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <!-- AMOUNT RECEIVED HIGHLIGHT BOX -->
          <div style="background-color: #FEF3C7; border: 2px solid #D97706; border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
            <div style="flex: 1;">
              <span style="color: #B45309; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
                ${isGu ? "કુલ સ્વીકારેલ રકમ" : "TOTAL AMOUNT RECEIVED"}
              </span>
              <span style="color: #4B5563; font-size: 11.5px; font-style: italic; font-weight: 600; display: block; margin-top: 3px;">
                ${words}
              </span>
            </div>
            <div style="color: #1E1B4B; font-size: 26px; font-weight: 900; letter-spacing: 0.5px; margin-left: 20px;">
              ₹${currentPayVal.toLocaleString("en-IN")}
            </div>
          </div>

          <!-- REMARKS (if present) -->
          ${
            remarksText
              ? `
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 14px; font-size: 11.5px; display: flex; gap: 8px;">
              <span style="color: #64748B; font-weight: 700;">${isGu ? "ખાસ નોંધ:" : "Remarks:"}</span>
              <span style="color: #18181B; font-style: italic;">"${remarksText}"</span>
            </div>
          `
              : ""
          }

          <!-- TERMS & CONDITIONS -->
          <div style="border-top: 1px solid #E2E8F0; padding-top: 8px; font-size: 10px; color: #64748B; line-height: 1.45;">
            ${
              isGu
                ? `
              <div>નિયમો: ૧. ભરેલ ફી કોઈપણ સંજોગોમાં પરત મળશે નહીં અથવા બદલાશે નહીં.</div>
              <div>૨. આ ગુરુકુળ ગ્રુપ ટ્યુશન દ્વારા જારી કરાયેલ સત્તાવાર ડિજિટલ રેકોર્ડ છે.</div>
              <div>૩. શૈક્ષણિક ચકાસણી અને ફી ક્લિયરન્સ માટે આ પહોંચ સાચવી રાખવી.</div>
            `
                : `
              <div>Terms: 1. Fees once paid are non-refundable & non-transferable.</div>
              <div>2. This is an official digital record issued by Gurukul Group Tuition.</div>
              <div>3. Please preserve this receipt for academic verification and fee clearance.</div>
            `
            }
          </div>

        </div>

        <!-- FOOTER & AUTHORIZED SIGNATURE -->
        <div style="border-top: 1px solid #E2E8F0; padding-top: 14px; margin-top: 4px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="color: #1E1B4B; font-size: 12.5px; font-weight: 800;">
              ${isGu ? "ગુરુકુળ ગ્રુપ ટ્યુશન પસંદ કરવા બદલ આભાર." : "Thank you for choosing Gurukul Group Tuition."}
            </div>
            <div style="color: #64748B; font-size: 10.5px; margin-top: 2px;">
              ${isGu ? "ગુણવત્તાયુક્ત શિક્ષણ, શૈક્ષણિક શિસ્ત અને ઉત્કૃષ્ટ પરિણામ માટે કટિબદ્ધ." : "Committed to quality education, academic discipline & student success."}
            </div>
            <div style="color: #94A3B8; font-size: 9.5px; margin-top: 1px;">
              ${isGu ? "સત્તાવાર ઇલેક્ટ્રોનિક ફી પહોંચ" : "Official electronic payment receipt"}
            </div>
          </div>
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
            <img src="${SIGNATURE_PNG}" alt="Authorized Signature" style="width: 125px; height: 56px; object-fit: contain; margin-bottom: -4px; display: block;" />
            <div style="width: 160px; border-bottom: 2px solid #1E1B4B; margin: 0 auto 5px auto;"></div>
            <div style="color: #1E1B4B; font-size: 13px; font-weight: 900; letter-spacing: 0.5px;">
              SUNIL PATEL ${isGu ? "(સુનિલ પટેલ)" : ""}
            </div>
            <div style="color: #475569; font-size: 10.5px; font-weight: 700; margin-top: 1px;">
              ${isGu ? "અધિકૃત સહી (Authorized Signatory)" : "Authorized Signatory"}
            </div>
            <div style="color: #64748B; font-size: 10px; margin-top: 1px;">
              ${isGu ? "ગુરુકુળ ગ્રુપ ટ્યુશન" : settings.name || "Gurukul Group Tuition"}
            </div>
          </div>
        </div>

      </div>

      <!-- Bottom Accent Navy Strip -->
      <div style="height: 6px; background-color: #1E1B4B; border-radius: 3px; margin-top: 12px; width: 100%;"></div>

      <!-- VOID WATERMARK (if payment is voided) -->
      ${
        payment.voided
          ? `
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 10;">
          <div style="transform: rotate(-30deg); border: 8px solid #DC2626; border-radius: 18px; padding: 20px 50px; background-color: rgba(254, 226, 226, 0.7); box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
            <span style="color: #DC2626; font-size: 42px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase;">
              ${isGu ? "રદ કરેલ (VOID)" : "CANCELLED / VOID"}
            </span>
          </div>
        </div>
      `
          : ""
      }

    </div>
  `;
}

/**
 * Generates an ultra-sharp, high-DPI A4 PDF receipt.
 * In browser environments, uses HTML2Canvas to capture full native Gujarati (and English) script
 * rendering with 100% correct glyphs, conjuncts, matras, and colors.
 */
export async function generateReceiptPdfDoc(
  options: MakePdfOptions
): Promise<jsPDF> {
  const isClient = typeof window !== "undefined" && typeof document !== "undefined";

  if (isClient) {
    const receiptHtml = buildReceiptHtml(options);

    // Create an isolated sandboxed iframe to completely shield html2canvas from Tailwind v4's oklch() styles
    const iframe = document.createElement("iframe");
    iframe.id = "receipt-pdf-render-frame";
    iframe.style.position = "fixed";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.border = "none";
    iframe.style.zIndex = "-9999";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error("Cannot access isolated iframe document");
      }

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;500;600;700;800&display=swap">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body { background-color: #FAF9F6; color: #18181B; font-family: 'Noto Sans Gujarati', 'Shruti', 'Nirmala UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
            </style>
          </head>
          <body>
            ${receiptHtml}
          </body>
        </html>
      `);
      iframeDoc.close();

      // Wait for fonts and layouts to settle
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (iframeDoc.fonts?.ready) {
        try {
          await iframeDoc.fonts.ready;
        } catch {}
      }

      // Ensure embedded images are complete
      const imgs = Array.from(iframeDoc.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          });
        })
      );

      const targetEl = (iframeDoc.body.firstElementChild as HTMLElement) || (iframeDoc.body as HTMLElement);
      const canvas = await html2canvas(targetEl, {
        scale: 2.2, // Crisp 250+ DPI retina print quality
        backgroundColor: "#FAF9F6",
        useCORS: true,
        logging: false,
        windowWidth: 794,
      });

      const doc = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.96);
      doc.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      return doc;
    } finally {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }
  }

  // Fallback to sync jsPDF generator if not in browser
  return generateReceiptPdf(options);
}

/**
 * Downloads the receipt PDF with appropriate localized filename.
 */
export async function downloadReceiptPdf(
  options: MakePdfOptions
): Promise<void> {
  const doc = await generateReceiptPdfDoc(options);
  const receiptCode = formatReceiptNumber(options.payment);
  const filename = `Gurukul-Receipt-${receiptCode}.pdf`;
  doc.save(filename);
}

/**
 * Returns a Blob and filename for Web Share API or attachments.
 */
export async function getReceiptPdfBlob(
  options: MakePdfOptions
): Promise<{ blob: Blob; filename: string }> {
  const doc = await generateReceiptPdfDoc(options);
  const receiptCode = formatReceiptNumber(options.payment);
  const filename = `Gurukul-Receipt-${receiptCode}.pdf`;
  const blob = doc.output("blob");
  return { blob, filename };
}

/**
 * Synchronous direct jsPDF generator (kept for backwards compatibility).
 */
export function generateReceiptPdf({
  payment,
  student,
  batch,
  settings,
  lang = "en",
}: MakePdfOptions): jsPDF {
  // FULL A4 FORMAT: 210 mm x 297 mm
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182 mm

  // Gurukul Educational Brand Colors
  const navy: [number, number, number] = [30, 27, 75]; // #1E1B4B Deep Royal Indigo
  const gold: [number, number, number] = [217, 119, 6]; // #D97706 Warm Amber Gold
  const amberLight: [number, number, number] = [254, 243, 199]; // #FEF3C7 Soft Amber
  const ink: [number, number, number] = [24, 24, 27]; // #18181B Dark Charcoal
  const muted: [number, number, number] = [100, 116, 139]; // #64748B Slate Muted
  const line: [number, number, number] = [226, 232, 240]; // #E2E8F0 Subtle border
  const bgLight: [number, number, number] = [250, 250, 252]; // Paper tint
  const sectionBg: [number, number, number] = [241, 245, 249]; // Slate header

  // 1. Full Page Paper Background
  doc.setFillColor(...bgLight);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // 2. Top Accent Strip (Gold)
  doc.setFillColor(...gold);
  doc.rect(0, 0, pageWidth, 5, "F");

  // 3. Header Card (Spanning full content width)
  const headerY = 10;
  const headerHeight = 52;
  doc.setFillColor(...navy);
  doc.roundedRect(marginX, headerY, contentWidth, headerHeight, 3, 3, "F");

  // Embedded Logo Container
  try {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(marginX + 5, headerY + 6, 40, 40, 2, 2, "F");
    doc.setDrawColor(...gold);
    doc.roundedRect(marginX + 5, headerY + 6, 40, 40, 2, 2, "S");
    doc.addImage(LOGO_JPG, "JPEG", marginX + 7, headerY + 8, 36, 36);
  } catch {
    // fallback if logo fails
  }

  // Header Typography
  const textLeft = marginX + 50;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(settings.name || "GURUKUL GROUP TUITION", textLeft, headerY + 16);

  doc.setTextColor(251, 191, 36); // Bright gold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("OFFICIAL FEE PAYMENT RECEIPT", textLeft, headerY + 23);

  doc.setTextColor(226, 232, 240); // Soft white
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const addressText =
    settings.address || "Opp. City Center, Ahmedabad, Gujarat - 380015";
  doc.text(addressText, textLeft, headerY + 31, { maxWidth: contentWidth - 55 });
  doc.text(
    `Phone: ${settings.phone || "9876543210"}  ·  Email: contact@gurukulgroup.in`,
    textLeft,
    headerY + 38
  );
  doc.text(
    "Coaching & Tuition for 9th, 10th, 11th & 12th Standards",
    textLeft,
    headerY + 44
  );

  // 4. Receipt Metadata Bar
  const metaY = headerY + headerHeight + 5; // 67
  const metaHeight = 16;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, metaY, contentWidth, metaHeight, 2, 2, "F");
  doc.setDrawColor(...line);
  doc.roundedRect(marginX, metaY, contentWidth, metaHeight, 2, 2, "S");

  const receiptCode = formatReceiptNumber(payment);
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Receipt Number: ${receiptCode}`, marginX + 6, metaY + 10.5);

  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(
    `Date of Issue: ${niceDate(payment.date)}`,
    marginX + contentWidth - 6,
    metaY + 10.5,
    { align: "right" }
  );

  // 5. Main Body Container
  const bodyY = metaY + metaHeight + 6; // 89
  const bodyHeight = 188;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX, bodyY, contentWidth, bodyHeight, 3, 3, "F");
  doc.setDrawColor(...line);
  doc.roundedRect(marginX, bodyY, contentWidth, bodyHeight, 3, 3, "S");

  let curY = bodyY + 10;

  // Section Header helper
  const drawSectionHeader = (title: string, yPos: number) => {
    doc.setFillColor(...sectionBg);
    doc.roundedRect(marginX + 6, yPos - 5, contentWidth - 12, 8, 1.5, 1.5, "F");
    doc.setTextColor(...navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(title, marginX + 10, yPos);
  };

  // SECTION A: STUDENT DETAILS
  drawSectionHeader("1. STUDENT INFORMATION", curY);
  curY += 9;

  const stuName = student?.name || "Student";
  const stuId = student ? formatStudentId(student) : "—";
  const std =
    student?.standard || batch?.standard || payment.studentStandard || "10th";
  const batchName = batch?.name || payment.batchName || "10-A";
  const schoolName = student?.school || "—";
  const studentPhone = student?.parentPhone || student?.phone || "—";

  const studentFields: [string, string][] = [
    ["Student Name:", stuName],
    ["Student ID:", stuId],
    ["Standard / Grade:", std],
    ["Batch Assigned:", batchName],
    ["School / Institute:", schoolName],
    ["Contact (Parent):", studentPhone],
  ];

  for (let i = 0; i < studentFields.length; i += 2) {
    const f1 = studentFields[i]!;
    const f2 = studentFields[i + 1]!;

    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(f1[0], marginX + 10, curY);

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(f1[1], marginX + 48, curY);

    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(f2[0], marginX + 102, curY);

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(f2[1], marginX + 138, curY);

    curY += 7;
  }

  curY += 2;

  // SECTION B: PAYMENT PARTICULARS
  drawSectionHeader("2. PAYMENT PARTICULARS", curY);
  curY += 9;

  const paymentFields: [string, string][] = [
    ["Payment For:", payment.purpose || "Monthly Fees"],
    ["Payment Mode:", payment.method || "UPI"],
    ["Transaction Date:", niceDate(payment.date)],
    ["Status:", "VERIFIED & CREDITED"],
  ];

  for (let i = 0; i < paymentFields.length; i += 2) {
    const p1 = paymentFields[i]!;
    const p2 = paymentFields[i + 1]!;

    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(p1[0], marginX + 10, curY);

    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(p1[1], marginX + 48, curY);

    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(p2[0], marginX + 102, curY);

    doc.setTextColor(
      p2[1].includes("VERIFIED") ? 22 : ink[0],
      p2[1].includes("VERIFIED") ? 101 : ink[1],
      p2[1].includes("VERIFIED") ? 52 : ink[2]
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(p2[1], marginX + 138, curY);

    curY += 7;
  }

  curY += 2;

  // SECTION C: FEE SUMMARY BREAKDOWN
  drawSectionHeader("3. FEE SUMMARY & BALANCE BREAKDOWN", curY);
  curY += 9;

  const totalFeeVal =
    payment.totalFee ||
    student?.totalFee ||
    (student?.monthlyFee ? student.monthlyFee * 12 : 30000);
  const prevPaidVal = payment.previousPaid ?? 0;
  const currentPayVal = payment.amount;
  const remBalVal =
    payment.balance !== undefined
      ? payment.balance
      : Math.max(0, totalFeeVal - prevPaidVal - currentPayVal);

  const summaryRows: [string, string, boolean][] = [
    ["Total Academic Fee Applicable:", `INR ${totalFeeVal.toLocaleString("en-IN")}`, false],
    ["Previously Paid (Prior Receipts):", `INR ${prevPaidVal.toLocaleString("en-IN")}`, false],
    ["Current Payment Received:", `INR ${currentPayVal.toLocaleString("en-IN")}`, true],
    ["Remaining Balance Due:", `INR ${remBalVal.toLocaleString("en-IN")}`, false],
  ];

  for (const [lbl, val, isHighlight] of summaryRows) {
    if (isHighlight) {
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(
        marginX + 8,
        curY - 4.5,
        contentWidth - 16,
        6.5,
        1,
        1,
        "F"
      );
    }

    doc.setTextColor(...muted);
    doc.setFont("helvetica", isHighlight ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.text(lbl, marginX + 10, curY);

    doc.setTextColor(
      isHighlight ? navy[0] : ink[0],
      isHighlight ? navy[1] : ink[1],
      isHighlight ? navy[2] : ink[2]
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isHighlight ? 10 : 9.5);
    doc.text(val, marginX + contentWidth - 10, curY, { align: "right" });

    doc.setDrawColor(241, 245, 249);
    doc.line(
      marginX + 10,
      curY + 2.5,
      marginX + contentWidth - 10,
      curY + 2.5
    );
    curY += 7.5;
  }

  curY += 3;

  // SECTION D: AMOUNT RECEIVED HIGHLIGHT BOX
  const amountBoxHeight = 24;
  doc.setFillColor(...amberLight);
  doc.roundedRect(
    marginX + 6,
    curY,
    contentWidth - 12,
    amountBoxHeight,
    2.5,
    2.5,
    "F"
  );
  doc.setDrawColor(...gold);
  doc.roundedRect(
    marginX + 6,
    curY,
    contentWidth - 12,
    amountBoxHeight,
    2.5,
    2.5,
    "S"
  );

  doc.setTextColor(...gold);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("TOTAL AMOUNT RECEIVED", marginX + 12, curY + 8);

  // In Words
  const words = numberToWords(currentPayVal);
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(words, marginX + 12, curY + 16, { maxWidth: 100 });

  // Big Amount on Right
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(
    `INR ${currentPayVal.toLocaleString("en-IN")}`,
    marginX + contentWidth - 12,
    curY + 14,
    { align: "right" }
  );

  curY += amountBoxHeight + 8;

  // Remarks if any
  if (payment.remarks || payment.note) {
    const remarkText = payment.remarks || payment.note || "";
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(marginX + 6, curY, contentWidth - 12, 11, 1.5, 1.5, "F");
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("REMARKS:", marginX + 10, curY + 6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...ink);
    doc.text(remarkText, marginX + 32, curY + 6.5, { maxWidth: contentWidth - 46 });
    curY += 15;
  }

  // Terms & Conditions Notice
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.text(
    "Terms: 1. Fees once paid are non-refundable & non-transferable.  2. This is an official digital record issued by Gurukul Group Tuition.",
    marginX + 10,
    curY
  );
  doc.text(
    "3. Please preserve this receipt for academic verification and fee clearance.",
    marginX + 10,
    curY + 4
  );

  // SECTION E: FOOTER & AUTHORIZED SIGNATURE
  const footerY = bodyY + bodyHeight - 16;

  // Left side: Appreciation
  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Thank you for choosing Gurukul Group Tuition.", marginX + 10, footerY);

  doc.setTextColor(...muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "Committed to quality education, academic discipline & student success.",
    marginX + 10,
    footerY + 4.5
  );

  // Right side: Official Signature Line
  const sigLineX = marginX + contentWidth - 65;
  try {
    doc.addImage(SIGNATURE_PNG, "PNG", sigLineX + 8, footerY - 14, 38, 14);
  } catch {}
  doc.setDrawColor(...navy);
  doc.line(sigLineX, footerY, marginX + contentWidth - 10, footerY);

  doc.setTextColor(...navy);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(
    "SUNIL PATEL",
    sigLineX + 27,
    footerY + 4.5,
    { align: "center" }
  );

  doc.setTextColor(...muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(
    "Authorized Signatory",
    sigLineX + 27,
    footerY + 8.5,
    { align: "center" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    settings.name || "Gurukul Group Tuition",
    sigLineX + 27,
    footerY + 12,
    { align: "center" }
  );

  // Bottom Accent Strip (Navy)
  doc.setFillColor(...navy);
  doc.rect(0, pageHeight - 5, pageWidth, 5, "F");

  // VOID WATERMARK
  if (payment.voided) {
    doc.saveGraphicsState();
    doc.setTextColor(220, 38, 38); // Crimson Red
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.text("CANCELLED / VOID", pageWidth / 2, pageHeight / 2, {
      align: "center",
      angle: 35,
    });
    doc.restoreGraphicsState();

    // Red warning banner
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(marginX + 6, metaY + 1, contentWidth - 12, metaHeight - 2, 1.5, 1.5, "F");
    doc.setTextColor(185, 28, 28);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    doc.text(
      `VOIDED TRANSACTION: ${payment.voidReason || "Cancelled"} (${niceDate(
        payment.voidedAt || payment.date
      )})`,
      pageWidth / 2,
      metaY + 10,
      { align: "center" }
    );
  }

  return doc;
}
