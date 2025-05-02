import { insertFolder } from '../../client/services/database';
import * as SecureStore from 'expo-secure-store';
// 192.168.107.78
   
const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

console.log((`"${apiUrl}/createFolder"`))



const sendFolder = async (dirName: string, parentID: string, shareWith: string[]) => {
  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =   String(SecureStore.getItem('userID'));

  if (!parentID) {
    console.error('parentID is undefined. Ensure it is correctly passed.');
    return;
  }
  const jsonData = {
    "useriD": storedUserID,
    "authToken": storedToken,
    "dirName": dirName,
    "ParentDir": parentID,
    "shareWith": shareWith
  }
  console.log("Sending folder creation request, ParentDir: " + jsonData.ParentDir);
  console.log("Users shared with: " + jsonData.shareWith)
  
    try {
        console.log('before error hopefully')
      const response = await fetch(`${apiUrl}/createDir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        
        body:JSON.stringify(jsonData), 
      });
      console.log("after error")
  
      const data = await response.json();
      if (data.success) {
        console.log('Folder created successfully:', data);
         var dirID= String(data.dirID)
        //insertFolder(dirName, dirID, parentID)
        return dirID
        
      } else {
        alert("Error creating folder. (" + response.status + ")")
        console.error('Error creating directory:', response.status, data.error);
        console.log(response.json())
      }
    } catch (error) {
      console.error('Network error:', error);
      
    }
  };

  export default sendFolder