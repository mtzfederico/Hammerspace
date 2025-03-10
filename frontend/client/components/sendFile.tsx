import { insertFile } from '@/services/database';
import * as DocumentPicker from 'expo-document-picker';

var user = "testUser"
    var token = "K1xS9ehuxeC5tw=="

const ip = process.env.IP_ADDRESS
// Function to open the document picker and handle the selected file
async function pickDocument(parentDir ,addFile) {

  
  console.log("first thing is parentDIR " + parentDir)
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Allow any file type to be selected
      multiple: false, // Only allow single file selection
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      // User cancelled the picker
      console.log("pickDOcument cancelled")
      return;
    }

    var fileName = String(`${result.assets[0].name}`)
    var fileURI = String(`${result.assets[0].uri}`)
    console.log(fileURI)
  
    const formData = new FormData();
    formData.append('file', {
      uri: result.assets[0].uri,
      name: fileName,
      type: result.assets[0].mimeType,
      size: result.assets[0].size,
      parentDir: parentDir,
    });
    formData.append("userID", user);
    formData.append("authToken", token);
    

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
   
    console.log("before fetch")
    const response = await fetch('http://192.168.107.78:9090/uploadFile', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('File uploaded successfully:', data);
      console.log("parentDIR " + parentDir)
       var dirID= String(data.fileID)
       const size = JSON.parse(data.bytesUploaded)
       addFile(fileName, fileURI, dirID, parentDir, size)
    } else {
      console.error('File upload failed:', response.statusText);
    }
      
  } catch (err) {
    console.warn('Error picking document', err);
  }
}


export { pickDocument };