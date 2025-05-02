import * as SecureStore from 'expo-secure-store';

// Interface for the item
interface FileItem {
  id: string;
  name: string;
  type: string; 
}

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

const removeItem = async (item: FileItem) => {
  try {
    // Get userID and authToken from SecureStore
    const userID = await SecureStore.getItemAsync('userID');
    const authToken = await SecureStore.getItemAsync('authToken');

    if (!userID || !authToken) {
      throw new Error('User ID or Auth Token is missing.');
    }

    
    // Prepare the request data
    const requestData = {
      userID,
      authToken,
      dirID: item.id,
    };

    console.log("This is the item id " + item.id )

    const isFolder = item.type === 'folder';
    const endpoint = isFolder ? '/removeDir' : '/removeFile';

    // Make the fetch request
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('Item removed successfully:', result);
      return result;
    } else {
      console.error('Error removing item:', result.error);
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Failed to remove item:', error);
  }
};

export default removeItem;
