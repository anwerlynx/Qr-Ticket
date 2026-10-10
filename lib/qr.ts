import QRCode from "qrcode";
import crypto from "crypto";

/**
 * Generate a cryptographically random secure token for ticket validation.
 * Attendee private info is NEVER stored in this token.
 */
export function generateSecureCredential(): string {
  return "ngsec_" + crypto.randomBytes(16).toString("hex");
}

/**
 * Generate a unique human-readable ticket number (e.g., NG-7K4P9X2M)
 * Uses secure cryptographic randomness on the server.
 */
export function generateHumanReadableTicketNumber(): string {
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Unambiguous chars (no 0, 1, I, O)
  const bytes = crypto.randomBytes(8);
  let result = "NG-";
  for (let i = 0; i < 8; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

/**
 * Format the check-in payload for the QR code.
 * Encodes the credential in a standard URL so any phone camera or gate scanner can read it.
 */
export function formatQRPayload(secureCredential: string, hostUrl?: string): string {
  let base = hostUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!base && process.env.VERCEL_URL) {
    base = `https://${process.env.VERCEL_URL}`;
  } else if (!base && process.env.NEXT_PUBLIC_VERCEL_URL) {
    base = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  if (base) {
    const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${cleanBase}/check-in?token=${encodeURIComponent(secureCredential)}`;
  }
  return `NEXTGEN:SEC:${secureCredential}`;
}

/**
 * Generate a high-contrast QR code as a PNG Data URL
 */
export async function generateQRCodeDataUrl(
  payload: string,
  options?: {
    width?: number;
    colorDark?: string;
    colorLight?: string;
  }
): Promise<string> {
  const {
    width = 360,
    colorDark = "#000000",
    colorLight = "#ffffff",
  } = options || {};

  return QRCode.toDataURL(payload, {
    width,
    margin: 2, // Clean quiet-zone border for camera detection
    color: {
      dark: colorDark,
      light: colorLight,
    },
    errorCorrectionLevel: "M", // "M" produces bigger, crisp dots that cameras focus on instantly
  });
}

/**
 * Generate QR code as an SVG string (ideal for sharp vector rendering and print/PDF)
 */
export async function generateQRCodeSVG(
  payload: string,
  options?: {
    width?: number;
    colorDark?: string;
    colorLight?: string;
  }
): Promise<string> {
  const {
    width = 240,
    colorDark = "#000000",
    colorLight = "#ffffff",
  } = options || {};

  return QRCode.toString(payload, {
    type: "svg",
    width,
    margin: 1,
    color: {
      dark: colorDark,
      light: colorLight,
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Generate QR code as a PNG Buffer (used for inline CID attachments in emails, ensuring 100% display in Gmail/Outlook)
 */
export async function generateQRCodeBuffer(
  payload: string,
  options?: {
    width?: number;
    colorDark?: string;
    colorLight?: string;
  }
): Promise<Buffer> {
  const {
    width = 360,
    colorDark = "#000000",
    colorLight = "#ffffff",
  } = options || {};

  return QRCode.toBuffer(payload, {
    width,
    margin: 2,
    color: {
      dark: colorDark,
      light: colorLight,
    },
    errorCorrectionLevel: "M",
  });
}

