import * as SecureStore from 'expo-secure-store';

export default async function  sharedFolderUpload() {
    const storedUserID = String(SecureStore.getItem("userID"))/*  */
    const storedToken = String(SecureStore.getItem("authToken"))/*  */
    try {
        const formData = new FormData();
        formData.append('userID', storedUserID);
        formData.append('authToken', storedToken);
    
        const response = await fetch('/api/uploadSharedFolder', {
            method: 'POST',
            body: formData,
        });
    
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    
        const data = await response.json();
        if (data == null) {
            throw new Error('Resonse data is null');
        }
        return data;
        } catch (error) {
        console.error('Error uploading shared folder:', error);
        }
    };
    
 