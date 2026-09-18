import QRCode from 'qrcode';

export interface QrOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generates an SVG string representation of a QR code
 */
export async function generateQrCodeSvg(text: string, options: QrOptions = {}): Promise<string> {
  const { size = 200, margin = 2, color } = options;
  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      width: size,
      margin,
      color: {
        dark: color?.dark || '#0f172a', // Slate 900
        light: color?.light || '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return svg;
  } catch (err) {
    console.error('QR Code SVG generation error:', err);
    return getFallbackQrSvg(text, size);
  }
}

/**
 * Generates a PNG DataURL representation of a QR code
 */
export async function generateQrCodeDataUrl(text: string, options: QrOptions = {}): Promise<string> {
  const { size = 200, margin = 2, color } = options;
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: size,
      margin,
      color: {
        dark: color?.dark || '#0f172a',
        light: color?.light || '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('QR Code DataURL generation error:', err);
    return '';
  }
}

/**
 * Synchronous SVG placeholder fallback
 */
export function getFallbackQrSvg(text: string, size = 200): string {
  const safeText = text.replace(/"/g, '&quot;').slice(0, 32);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none">
    <rect width="${size}" height="${size}" fill="#f8fafc" rx="8" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="20" y="20" width="40" height="40" fill="#0f172a" rx="4"/>
    <rect x="28" y="28" width="24" height="24" fill="#ffffff" rx="2"/>
    <rect x="34" y="34" width="12" height="12" fill="#0f172a"/>
    <rect x="${size - 60}" y="20" width="40" height="40" fill="#0f172a" rx="4"/>
    <rect x="${size - 52}" y="28" width="24" height="24" fill="#ffffff" rx="2"/>
    <rect x="${size - 46}" y="34" width="12" height="12" fill="#0f172a"/>
    <rect x="20" y="${size - 60}" width="40" height="40" fill="#0f172a" rx="4"/>
    <rect x="28" y="${size - 52}" width="24" height="24" fill="#ffffff" rx="2"/>
    <rect x="34" y="${size - 46}" width="12" height="12" fill="#0f172a"/>
    <text x="${size / 2}" y="${size / 2 + 5}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">QR: ${safeText}</text>
  </svg>`;
}
