export const rpName = process.env.NEXT_PUBLIC_RP_NAME || 'GeoMark'
export const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost'
export const origin = process.env.ORIGIN || 'http://localhost:3000'

// Simple helper to convert public key to string and back for database storage
// Note: In production you'd use a more robust way to store binary data if needed
// but since the user asked for Text we will use base64
export function bufferToBase64(buffer: Uint8Array): string {
    return Buffer.from(buffer).toString('base64');
}

export function base64ToBuffer(base64: string): Uint8Array {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}
