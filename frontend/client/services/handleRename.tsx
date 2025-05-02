import * as SecureStore from 'expo-secure-store';
import { renameFile } from './database';


// Interface for the item
interface FileItem {
  id: string;
  name: string;
  type: string; 
}

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

const renameItem = async (item: FileItem, newName: string) => {
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
      newName
    };

    // Make the fetch request
    const response = await fetch(`${apiUrl}/renameItem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();

    if (response.ok) {
        console.log('Item removed successfully:', result);
        await renameFile(item.id, userID, newName)
        return result;
    } else {
      console.error('Error removing item:', result.error);
      throw new Error(result.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Failed to remove item:', error);
  }
};

export default renameItem