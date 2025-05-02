import * as SecureStore from 'expo-secure-store';
import * as age from 'age-encryption';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';
import { blobToBase64 } from '../components/FolderNavigation';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

export async function getFolderKey(folderID: string): Promise<string> {
	const authToken = await SecureStore.getItemAsync("authToken");
	const userID = await SecureStore.getItemAsync("userID");

	const jsonData = {
		"userID": userID,
		"authToken": authToken,
		"folderID": folderID,
	};

	const res = await fetch(`${apiUrl}/getEncryptedFolderKey`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(jsonData),
	});

	if (!res.ok) {
		const jsonResponse = await res.json();
		throw new Error("Failed to get encrypted folder key. ", jsonResponse.error);
	}

	const tmpPath = `${FileSystem.cacheDirectory}${folderID}_encrypted_fk`;
	  
	// Save the FK to local storage temporarily to decrypt it
	const blob = await res.blob()
	const base64Data = await blobToBase64(blob);
	await FileSystem.writeAsStringAsync(tmpPath, base64Data, {
		encoding: FileSystem.EncodingType.Base64,
	});

	console.log('[getOrFetchFileUri] File saved locally at:', tmpPath);
	// decrypt the file
	const decryptedPath = await decryptFolderKey(tmpPath, folderID);

	const privateKey = FileSystem.readAsStringAsync(decryptedPath);

	// delete the unencrypted file
	await FileSystem.deleteAsync(tmpPath);
	// delete the key file
	await FileSystem.deleteAsync(decryptedPath);

	return privateKey;
}


// decrypts the folder key with the user's private key. Returns the path to the decrypted file.
// Used in getFolderKey
async function decryptFolderKey(encryptedFileUrl: string, folderID: string): Promise<string> {
	try {
	  // Fetch encrypted file
	  const response = await fetch(encryptedFileUrl);
	  if (!response.ok) {
		throw new Error('Failed to fetch encrypted file');
	  }

	  const userPrivateKey = String(SecureStore.getItem('privateKey'));
	  const encryptedArrayBuffer = await response.arrayBuffer();
	  const encryptedBuffer = new Uint8Array(encryptedArrayBuffer);
  
	  // Initialize Decrypter and add identity
	  const decrypter = new age.Decrypter();
	  console.log('[decryptFolderKey] Using privateKey:', userPrivateKey);
  
	  decrypter.addIdentity(userPrivateKey);
  
	  // Decrypt the file
	  const decryptedData = await decrypter.decrypt(encryptedBuffer, 'uint8array');
  
	  // Save to file
	  const base64Data = Buffer.from(decryptedData).toString('base64');
	  const outputPath = `${FileSystem.cacheDirectory}${folderID}_fk}`;
  
	  await FileSystem.writeAsStringAsync(outputPath, base64Data, {
		encoding: FileSystem.EncodingType.Base64, 
	  });
  
	  return outputPath;
	} catch (err) {
	  console.error(`[decryptFolderKey] Error fk for '${folderID}'. ${err}`);
	  // throw new Error('File decryption failed');
	  throw err;
	}
  };