import * as SecureStore from 'expo-secure-store';

interface Folder {
    id: string;
    name: string;
    // Add other relevant folder properties as needed (e.g., createdDate, owner)
}

const getSharedFolders = async (): Promise<Folder[]> => {
    console.log("getSharedFolders called");
    const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

    try {
        const userID = await SecureStore.getItemAsync('userID');
        const authToken = await SecureStore.getItemAsync('authToken');

        if (!userID || !authToken) {
            throw new Error("User not authenticated.");
        }

        const response = await fetch(`${apiUrl}/getSharedFolders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userID: userID,
                authToken: authToken,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch shared folders");
        }

        const data = await response.json();
        if (data.success) {
           
            return data.folders;
        } else {
            throw new Error(data.error || "Failed to fetch shared folders");
        }
    } catch (err: any) {
        console.error("Error in getSharedFolders:", err);
        throw err; // Re-throw the error to be handled by the caller
    }
};

export default getSharedFolders;
