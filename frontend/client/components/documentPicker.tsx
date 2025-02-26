import * as DocumentPicker from 'expo-document-picker';

// Function to open the document picker and handle the selected file
async function pickDocument() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Allow any file type to be selected
      multiple: false, // Only allow single file selection
    });

    if (result.type === 'cancel') {
      // User cancelled the picker
      return;
    }

    // Handle the selected file
    const { uri, name, size, mimeType } = result.assets[0];
    console.log('Document picked:', { uri, name, size, mimeType });

    // You can now process the file, e.g., upload it, display it, etc.
  } catch (err) {
    console.warn('Error picking document', err);
  }
}

export { pickDocument };