// utils/Decryption.tsx
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import * as age from 'age-encryption';
import * as SecureStore from 'expo-secure-store';
import { FileItem } from '@/components/displayFolders';
import { getFolderKey } from "@/services/database";

const userPrivateKey = String(SecureStore.getItem('privateKey'));
const userID = String(SecureStore.getItem('userID'));
// const authToken = String(SecureStore.getItem('authToken'));

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

export async function decryptFile(encryptedFileUrl: string, file: FileItem): Promise<string> {
  console.log(`[decryptFile] fileID: ${file.id}`)
  try {
    const privateKey = await getPrivateKeyForFile(file);

    // Fetch encrypted file
    const response = await fetch(encryptedFileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch encrypted file');
    }

    const encryptedArrayBuffer = await response.arrayBuffer();
    const encryptedBuffer = new Uint8Array(encryptedArrayBuffer);

    // Initialize Decrypter and add identity
    const decrypter = new age.Decrypter();
    console.log('[Decrypt] Using privateKey:', privateKey);

    decrypter.addIdentity(privateKey);

    // Decrypt the file
    const decryptedData = await decrypter.decrypt(encryptedBuffer, 'uint8array');

    // Save to file
    const base64Data = Buffer.from(decryptedData).toString('base64');
    // we need the extension for certain files like pdf and images to load since the views that open them look at the extension to be able to show them and we can't change that.
    // Since the MIME type can contain dots and '+', we can't just use that as the extension, we need to remove those.
    const fileExt = file.type.split('/')[1].split('.')[0].split('+')[0];
    const outputPath = `${FileSystem.documentDirectory}${file.id}.${fileExt}`;

    await FileSystem.writeAsStringAsync(outputPath, base64Data, {
      encoding: FileSystem.EncodingType.Base64, 
    });

    return outputPath;
  } catch (err) {
    console.error(`[Decryption.tsx] Error decrypting file '${file.id}'. ${err}`);
    // throw new Error('File decryption failed');
    throw err;
  }
};

async function getPrivateKeyForFile(file: FileItem): Promise<string> {
  if (file.userID === userID)  {
    return userPrivateKey;
  }

  const folderKey = await getFolderKey(file.parentDir);
  if (folderKey === null) {
    // check the parentDir's parentDir
  }

  // use recursion to check the parentDir that is being shared and get the folder's private key 
  return "";
}