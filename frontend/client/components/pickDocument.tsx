import { insertFile } from '@/services/database';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { AddFileType } from '@/components/addButton';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

const storedToken = String(SecureStore.getItem('authToken'));
const storedUserID = String(SecureStore.getItem('userID'));

// Function to open the document picker and handle the selected file
// Then send a request to the server to upload the file
async function pickDocument(parentDir: string, addFile: AddFileType) {  
  console.log("storedAuthToken: " + storedToken)
  console.log("Uploading file to parentDIR: '" + parentDir + "'")
  try {
   const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Allow any file type to be selected
      multiple: false, // Only allow single file selection
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      // User cancelled the picker
      console.log("pickDocument cancelled")
      return;
    }

    var fileName = String(`${result.assets[0].name}`)
    var fileURI = String(`${result.assets[0].uri}`)
    var mimeType = result.assets[0].mimeType || "application/octet-stream" // this is the official default mime type for unkown files
    var fileSize = result.assets[0].size || 0
    console.log(`Ùploading file. fileName: ${fileName}, mimeType: ${mimeType}, size: ${fileSize}, fileURI: ${fileURI}`)
  
    const formData = new FormData();
    formData.append('file', {
      uri: fileURI,
      name: fileName,
      type: mimeType,
      size: fileSize,
    } as any);
    formData.append("userID", storedUserID);
    formData.append("authToken", storedToken);
    formData.append("parentDir", parentDir);


   /* console.log("before test")
    const response = await fetch('http://192.168.107.78:9090/testing');
    console.log("after fetch")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data };
*/

    //IP of PC

    // school : 216.37.97.95
    // 172.16.226.28 starbucks
   
    console.log("Sending uploadFile request")
    const response = await fetch(`${apiUrl}/uploadFile`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();
    if (data.success) {
      console.log('File uploaded successfully:', data);
      console.log("parentDIR " + parentDir)
       var dirID= String(data.fileID)
       const size = JSON.parse(data.bytesUploaded)
       // addFile adds it to the local DB. The actual code called is in homescreen
       addFile(fileName, fileURI, dirID, mimeType, parentDir, size)
    } else {
      console.error('File upload failed. Status: ' + response.status + '. Error msg: ' + data.error);
      // setError(err.message || 'Error uploading file. Please try again.');
      throw Error(data.error)
    }
      
  } catch (err) {
    console.warn('Error picking document', err);
    // there is probably a better way of doing this, but idk how this works in js/typescript
    throw err
  }
}

export { pickDocument };