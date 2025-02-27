import * as DocumentPicker from 'expo-document-picker';


const ip = process.env.IP_ADDRESS
// Function to open the document picker and handle the selected file
async function pickDocument() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Allow any file type to be selected
      multiple: false, // Only allow single file selection
      copyToCacheDirectory: true,
    });

    if (result.type === 'cancel') {
      // User cancelled the picker
      return;
    }

    var fileName = String(`${result.assets[0].name}`)
    var userID = "ggggggggggrrrrrrrrrrrrrr"
    var authToken = "bbbrrr"

    const formData = new FormData();
    formData.append('file', {
      uri: result.assets[0].uri,
      name: fileName,
      type: result.assets[0].mimeType,
      size: result.assets[0].size,
    });
    formData.append("userID", userID);
    formData.append("authToken", authToken);

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
   
    const response = await fetch('http://192.168.107.78:9090/uploadFile', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.ok) {
      console.log('File uploaded successfully!');
    } else {
      console.error('File upload failed:', response.statusText);
    }
      
  } catch (err) {
    console.warn('Error picking document', err);
  }
}


export { pickDocument };