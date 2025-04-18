// utils/Decryption.tsx
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import * as age from 'age-encryption';
import * as SecureStore from 'expo-secure-store';

/**
 * Decrypts an encrypted file from a URL using an AGE private key.
 * @param encryptedFileUrl - The URL of the encrypted `.age` file.
 * @param privateKey - AGE private key string (starts with AGE-SECRET-KEY-...).
 * @param originalFileName - The desired filename (e.g., 'image.png', 'doc.pdf').
 * @returns Local URI path of the decrypted file.
 */

export async function generateKeys() {
  console.log('[Key Generation] Generating keys...');
  try {
    // Generate private key (identity)
    const privateKey = await age.generateIdentity(); // string

    // Convert to public key (recipient)
    const publicKey = await age.identityToRecipient(privateKey); // string

    // Store private key securely
    await SecureStore.setItemAsync('privateKey', privateKey);

    // Return the public key to be sent to the backend
    return publicKey;
  } catch (error) {
    console.error('[Key Generation] Failed to generate or store keys:', error);
    throw new Error('Key generation failed');
  }
}

export async function decryptFile(encryptedFileUrl: string, privateKey: string, originalFileName: string): Promise<string> {
  console.log(`[decryptFile] originalFileName: ${originalFileName}`)
  try {
    // Fetch encrypted file
    const response = await fetch(encryptedFileUrl);
    if (!response.ok) throw new Error('Failed to fetch encrypted file');
    const encryptedArrayBuffer = await response.arrayBuffer();
    const encryptedBuffer = new Uint8Array(encryptedArrayBuffer);

    // Initialize Decrypter and add identity
    const decrypter = new age.Decrypter();
    console.log('[Decrypt] Using privateKey:', privateKey);

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
    // throw new Error('File decryption failed');
    throw err;
  }
}
