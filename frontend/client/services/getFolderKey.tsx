import * as SecureStore from 'expo-secure-store';
import { Decrypter } from 'age-encryption';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

export async function getFolderKey(folderID: string) {
	const authToken = await SecureStore.getItemAsync("authToken");
	const userID = await SecureStore.getItemAsync("userID");

	const jsonData = {
		userID,
		authToken,
		folderID,
	};

	const res = await fetch(`${apiUrl}/getEncryptedFolderKey`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(jsonData),
	});

	if (!res.ok) throw new Error("Failed to get encrypted folder key");

	const { encryptedKey } = await res.json();
	if (!encryptedKey) throw new Error("Missing encrypted key in response");

	// Decode base64 string to Uint8Array
	const encryptedKeyBytes = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));

	// Retrieve private key from SecureStore
	const privateKeyStr = await SecureStore.getItemAsync("privateKey");
	if (!privateKeyStr) throw new Error("Missing private key");

	// Decrypt using the age-encryption Decrypter class
	const decrypter = new Decrypter();
    decrypter.addIdentity(privateKeyStr);
	const decryptedKey = await decrypter.decrypt(encryptedKeyBytes);

	return decryptedKey; // This is your folder key (FK)
}
