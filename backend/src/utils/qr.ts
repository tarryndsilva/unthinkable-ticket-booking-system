import QRCode from 'qrcode';

/** Generates a QR code (as a base64 data URL) encoding the booking reference. */
export async function generateQrCodeDataUrl(bookingRef: string): Promise<string> {
  return QRCode.toDataURL(bookingRef, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}

/** Generates a QR code as a PNG buffer, suitable for email attachment. */
export async function generateQrCodeBuffer(bookingRef: string): Promise<Buffer> {
  return QRCode.toBuffer(bookingRef, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}
