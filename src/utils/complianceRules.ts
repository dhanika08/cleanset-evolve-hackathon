/**
 * Pure trade finance compliance calculation and validation functions
 * strictly adhering to ICC UCP 600 and ISBP 821.
 */

export interface DateCheckParams {
  latestShipmentDate: string; // YYYY-MM-DD
  blOnBoardDate: string;      // YYYY-MM-DD
  lcExpiryDate: string;       // YYYY-MM-DD
  presentationDate: string;   // YYYY-MM-DD
  presentationPeriodDays?: number; // default 21 days per UCP 600 Art 14(c)
}

export interface DateCheckResult {
  isShippedOnTime: boolean;
  isPresentedWithinPeriod: boolean;
  isPresentedBeforeExpiry: boolean;
  daysToShipmentDeadline: number;
  daysFromShipmentToPresentation: number;
  errors: string[];
}

export function checkShipmentAndPresentationDates(params: DateCheckParams): DateCheckResult {
  const latestShip = new Date(params.latestShipmentDate).getTime();
  const onBoard = new Date(params.blOnBoardDate).getTime();
  const expiry = new Date(params.lcExpiryDate).getTime();
  const present = new Date(params.presentationDate).getTime();
  const periodDays = params.presentationPeriodDays ?? 21;

  const msInDay = 1000 * 60 * 60 * 24;
  const isShippedOnTime = onBoard <= latestShip;
  const daysFromShipment = Math.round((present - onBoard) / msInDay);
  const isPresentedWithinPeriod = daysFromShipment <= periodDays;
  const isPresentedBeforeExpiry = present <= expiry;

  const errors: string[] = [];

  if (!isShippedOnTime) {
    const lateDays = Math.round((onBoard - latestShip) / msInDay);
    errors.push(
      `Late shipment: B/L on-board date (${params.blOnBoardDate}) is ${lateDays} day(s) after latest shipment date (${params.latestShipmentDate}) stipulated in LC Field 44C (UCP 600 Art 20(a)(ii)).`
    );
  }

  if (!isPresentedWithinPeriod) {
    errors.push(
      `Stale presentation: Documents presented ${daysFromShipment} days after shipment date, exceeding allowable presentation period of ${periodDays} days (UCP 600 Art 14(c)).`
    );
  }

  if (!isPresentedBeforeExpiry) {
    errors.push(
      `Expired LC: Presentation date (${params.presentationDate}) is after LC expiry date (${params.lcExpiryDate}) stipulated in Field 31D (UCP 600 Art 6(d)(i)).`
    );
  }

  return {
    isShippedOnTime,
    isPresentedWithinPeriod,
    isPresentedBeforeExpiry,
    daysToShipmentDeadline: Math.round((latestShip - onBoard) / msInDay),
    daysFromShipmentToPresentation: daysFromShipment,
    errors,
  };
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceCalculationResult {
  isAccurate: boolean;
  calculatedTotal: number;
  claimedTotal: number;
  discrepancies: string[];
}

export function verifyInvoiceCalculations(
  items: LineItem[],
  claimedInvoiceTotal: number,
  currency: string = 'USD'
): InvoiceCalculationResult {
  const discrepancies: string[] = [];
  let calculatedSum = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const expectedLineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
    const claimedLineTotal = Number(item.total.toFixed(2));

    if (Math.abs(expectedLineTotal - claimedLineTotal) > 0.01) {
      discrepancies.push(
        `Line ${i + 1} ("${item.description}") arithmetic error: ${item.quantity} × ${item.unitPrice} = ${currency} ${expectedLineTotal}, but stated as ${currency} ${claimedLineTotal} (ISBP 821).`
      );
    }
    calculatedSum += expectedLineTotal;
  }

  calculatedSum = Number(calculatedSum.toFixed(2));
  const claimedTotal = Number(claimedInvoiceTotal.toFixed(2));

  if (Math.abs(calculatedSum - claimedTotal) > 0.01) {
    discrepancies.push(
      `Invoice grand total mismatch: Sum of item lines is ${currency} ${calculatedSum.toLocaleString()}, but invoice states total as ${currency} ${claimedTotal.toLocaleString()} (ISBP 821).`
    );
  }

  return {
    isAccurate: discrepancies.length === 0,
    calculatedTotal: calculatedSum,
    claimedTotal,
    discrepancies,
  };
}

export interface CrossDocumentWeightCheck {
  packingListGrossWeight: number; // in kg
  blGrossWeight: number;           // in kg
  toleranceKg?: number;
}

export function verifyCrossDocumentWeights(params: CrossDocumentWeightCheck): {
  isMatching: boolean;
  differenceKg: number;
  message?: string;
} {
  const diff = Math.abs(params.packingListGrossWeight - params.blGrossWeight);
  const tolerance = params.toleranceKg ?? 0;
  const isMatching = diff <= tolerance;

  if (!isMatching) {
    return {
      isMatching: false,
      differenceKg: diff,
      message: `Weight discrepancy: Packing List states gross weight as ${params.packingListGrossWeight.toLocaleString()} kg, whereas Bill of Lading indicates ${params.blGrossWeight.toLocaleString()} kg (Difference of ${diff.toLocaleString()} kg). Data across documents must not conflict (UCP 600 Art 14(d)).`,
    };
  }

  return {
    isMatching: true,
    differenceKg: 0,
  };
}

export function verifyContainerNumbers(
  packingListContainers: string[],
  blContainers: string[]
): {
  isMatching: boolean;
  missingInBL: string[];
  missingInPL: string[];
  message?: string;
} {
  const normPL = packingListContainers.map((c) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
  const normBL = blContainers.map((c) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));

  const missingInBL = normPL.filter((c) => !normBL.includes(c));
  const missingInPL = normBL.filter((c) => !normPL.includes(c));

  const isMatching = missingInBL.length === 0 && missingInPL.length === 0;

  let message: string | undefined;
  if (!isMatching) {
    message = `Container number mismatch: Packing List containers [${packingListContainers.join(', ')}] do not match Bill of Lading containers [${blContainers.join(', ')}] (ISBP 821).`;
  }

  return {
    isMatching,
    missingInBL,
    missingInPL,
    message,
  };
}

export function verifyInvoiceGoodsDescriptionMatch(
  lcDescription: string,
  invoiceDescription: string
): {
  isMatch: boolean;
  message?: string;
} {
  const cleanLC = lcDescription.toLowerCase().replace(/[\r\n\t]+/g, ' ').trim();
  const cleanInv = invoiceDescription.toLowerCase().replace(/[\r\n\t]+/g, ' ').trim();

  // UCP 600 Art 18(c): The description of goods in commercial invoice must correspond with that in the credit
  // Allow slight whitespace differences but must contain core requirements
  const wordsInLC = cleanLC.split(/\s+/).filter((w) => w.length > 2);
  const wordsInInv = cleanInv.split(/\s+/).filter((w) => w.length > 2);

  const missingKeyWords = wordsInLC.filter((w) => !cleanInv.includes(w));

  // If more than 15% of significant keywords are missing from invoice
  if (missingKeyWords.length > Math.max(1, Math.floor(wordsInLC.length * 0.15))) {
    return {
      isMatch: false,
      message: `Goods description in Commercial Invoice fails to strictly correspond with LC Field 45A. Missing key terms: "${missingKeyWords.slice(0, 5).join(' ')}" (UCP 600 Article 18(c)).`,
    };
  }

  return {
    isMatch: true,
  };
}
