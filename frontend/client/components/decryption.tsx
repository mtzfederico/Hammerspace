// utils/Decryption.tsx
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import * as age from 'age-encryption';

/**
 * Decrypts an encrypted file from a URL using an AGE private key.
 * @param encryptedFileUrl - The URL of the encrypted `.age` file.
 * @param privateKey - AGE private key string (starts with AGE-SECRET-KEY-...).
 * @param originalFileName - The desired filename (e.g., 'image.png', 'doc.pdf').
 * @returns Local URI path of the decrypted file.
 */
export async function decryptFile(encryptedFileUrl: string,privateKey: string ,originalFileName:string): Promise<string> {
  try {
    // Fetch encrypted file
    const response = await fetch(encryptedFileUrl);
    if (!response.ok) throw new Error('Failed to fetch encrypted file');
    const encryptedArrayBuffer = await response.arrayBuffer();
    const encryptedBuffer = new Uint8Array(encryptedArrayBuffer);

    // Initialize Decrypter and add identity
    const decrypter = new age.Decrypter();
    await decrypter.addIdentity(privateKey);

    // Decrypt the file
    const decryptedData = await decrypter.decrypt(encryptedBuffer, 'uint8array');

    // Save to file
    const base64Data = Buffer.from(decryptedData).toString('base64');
    const outputPath = `${FileSystem.documentDirectory}${originalFileName}`;

    await FileSystem.writeAsStringAsync(outputPath, base64Data, {
      encoding: FileSystem.EncodingType.Base64, 
    });

    return outputPath;
  } catch (err) {
    console.error('[Decryption.tsx] Error decrypting file:', err);
    throw new Error('File decryption failed');
  }
}
