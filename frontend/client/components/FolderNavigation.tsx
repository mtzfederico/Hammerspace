import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, TextInput, Image } from 'react-native';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import DisplayFolders from './displayFolders';
import { getItemsInParentDB, syncWithBackend, getFileUri, updateFileUri, getAllFilesURi, deleteFileLocally } from '../services/database';
import AddButton from './addButton';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { FileItem } from '@/components/displayFolders';
import { decryptFile } from './decryption';

type FolderNavigationProps = {
  initialParentID: string;
  addFolder: (name: string, type: string, dirID: string, parentID: string) => void;
  addFile: (name: string, uri: string, dirID: string, type: string, parentID: string, size: number) => void;
};

// Component that handles the folder navigation and file display
// It uses the DisplayFolders component to show the folders and files
// It also uses the AddButton component to add new folders and files
// It uses the getItemsInParentID function to fetch the folders and files from the database
// It uses the syncWithBackend function to sync the data with the backend
// Is recursively called when a folder is pressed
const FolderNavigation = ({ initialParentID, addFolder, addFile }: FolderNavigationProps) => {
  const router = useRouter();
  // const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [currentParentDirID, setCurrentParentDirID] = useState<any>(initialParentID);
  const [previousID, setPreviousID] = useState(null);
  const [currentDirName, setCurrentDirName] = useState('Home');
  const storedUserID = String(SecureStore.getItem('userID'));
  const storedToken = String(SecureStore.getItem('authToken'));
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);
  const privateKey = String(SecureStore.getItem('privateKey'));
  const [loadingFiles, setLoadingFiles] = useState(true);

  // a list of the image mime subtypes that the app can open.
  // Example: 'image/png' gets split at the '/'. MIME.Type is 'image' and MIME.Subtype is 'png'
  const SupportedImageTypes: string[] = ["jpeg", "png", "heic", "gif", "jp2"];

  useEffect(() => {
    const syncAndRefresh = async () => {
      // try {
      // TODO: handle error here
      setLoadingFiles(true); // Start loading
      await syncWithBackend(storedUserID, storedToken);
      await getAllFilesURi(currentParentDirID, storedUserID, async (files) => {
        for (const file of files) {
          if (!file.uri || file.uri === 'null') {
            // TODO: this needs work
            const encryptedUri = await getOrFetchFileUri(file.id);
            const decryptedPath = `${FileSystem.documentDirectory}${file.id}_decrypted.pdf`;
            await decryptFile(encryptedUri, privateKey, `${file.id}_decrypted.pdf`);
            await updateFileUri(file.id, decryptedPath);
          }
        }
  
        await refreshData(); // Fetch again after all decryption + URI set
        setLoadingFiles(false); // Done loading
        
      });
    };
  
    syncAndRefresh();
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentParentDirID, addFolder, addFile]);

  const refreshData = () => {
    // getFoldersByParentID(currentParentDirID, storedUserID, setFolders);
    getItemsInParentDB(currentParentDirID, storedUserID, setFiles);
  };

  const handleFolderPress = (dirID: string, folderName: string) => {
    setPreviousID(currentParentDirID);
    setCurrentParentDirID(dirID);
    setCurrentDirName(folderName);
  };

  const handleBackPress = () => {
    if (previousID && previousID !== currentParentDirID) {
      setCurrentParentDirID(previousID);
      setPreviousID(null);
      setCurrentDirName('Home');
    } else {
      setCurrentParentDirID('root');
      setCurrentDirName('Home');
    }
  };

  useEffect(() => {
    const checkProfileImage = async () => {
      const userID = await SecureStore.getItemAsync('userID');
      if (!userID) return;
  
      const imagePath = `${FileSystem.documentDirectory}${userID}_profile.jpg`;
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      if (fileInfo.exists) {
        setProfileImageUri(imagePath);
      }
    };
  
    checkProfileImage();
  }, []);

  // returns the path to the decrypted fileID
  const getOrFetchFileUri = async (id: string) => {
    try {
      // Step 1: Get URI from local DB
      const localResult = await getFileUri(id);
  
      if (localResult && localResult.uri && localResult.uri !== "null") {
        console.log("[getOrFetchFileUri] Found local URI:", localResult.uri);
        return localResult.uri; // Return local URI immediately
      }

      console.log(`[getOrFetchFileUri] userID: ${storedUserID} authToken: ${storedToken} fileID: ${id}`);
      console.log(`[getOrFetchFileUri] No local URI found. Fetching from server...`);
  
      // Step 2: Fetch from backend
      const fileResponse = await fetch(`${apiUrl}/getFile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID: storedUserID,
          authToken: storedToken,
          fileID: id,
        }),
      });
  
      if (!fileResponse.ok) {
        const data = await fileResponse.json();
        console.error(`[getOrFetchFileUri] Failed to fetch file from backend. status: ${fileResponse.status}. '${data.error}'` || `${fileResponse.statusText}`);
        if (data.error === "File not found") {
          console.log("[getOrFetchFileUri] Deleting file locally")
          await deleteFileLocally(id);
          return null;
        }

        if (data.error === "File is being processed, try again later") {
          console.log("File is still being processed");
          return null;
        }
        throw Error(data.error || `${fileResponse.status} ${fileResponse.statusText}`);
      }
  
      const blob = await fileResponse.blob();
      const localPath = `${FileSystem.documentDirectory}${id}`;
  
      // Step 3: Save the file to local storage
      const base64Data = await blobToBase64(blob);
      await FileSystem.writeAsStringAsync(localPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      console.log('[getOrFetchFileUri] File saved locally at:', localPath);

      // TODO: Ideally decrypt the file here, delete the unencrypted file, and save the encrpted file's uri to the db
  
      // Step 4: Update DB with new URI
      await updateFileUri(id, localPath);  // Wait for the database update to complete
      console.log('[getOrFetchFileUri] Database updated with new URI:', localPath);
      return localPath;  // Return the new local URI
    } catch (error) {
      console.error('[getOrFetchFileUri] Error:', error);
      throw error;
    }
  };
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve(base64data);
      };
      reader.readAsDataURL(blob);
    });
  };
  
  const handleFilePress = async (item: FileItem) => {
      console.log("** file pressed. fileID:", item.id, "fileName:", item.name, "type:", item.type);

      // if the file is a pdf, open it on the web view
      if (item.type === "application/pdf") {
        const encryptedUri = await getOrFetchFileUri(item.id);
        if (!encryptedUri) {
          console.error("[handleFilePress] Failed to get encrypted URI");
          return;
        }
    
        const decryptedPath = `${FileSystem.documentDirectory}${item.id}_decrypted.pdf`;
        console.log("privateKey: " + privateKey)
        try {
          await decryptFile(encryptedUri, privateKey, `${item.id}_decrypted.pdf`);
          console.log("[handleFilePress] Decryption successful, decryptedPath:", decryptedPath);
    
          const encodedURI = encodeURI(decryptedPath);
          router.push({
            pathname: "/PDFView/[URI]",
            params: { URI: encodedURI },
          });
        } catch (err) {
          console.error("[handleFilePress] Decryption failed:", err);
        }
    
        return;
      }

      // 'image/png' gets split at the '/'. MIME.Type is 'image' and MIME.Subtype is 'png'
      const mimeParts = item.type.split('/');
      if (mimeParts.length != 2) {
        console.error(`[handleFilePress: image] MIME type doesn't have two parts: '${item.type}'`);
        return
      }
      
      // Check if the file is a text format and open it in the TextView
      if ((mimeParts[0] === "text" && ["plain", "csv", "css", "javascript", "html", "markdown"].includes(mimeParts[1])) || (mimeParts[0] === "application" && ["json", "xml"].includes(mimeParts[1]))) {
        // https://www.iana.org/assignments/media-types/media-types.xhtml#text
        const encryptedUri = await getOrFetchFileUri(item.id);
        if (!encryptedUri) {
          console.error("[handleFilePress: text] Failed to get encrypted URI");
          return;
        }
    
        const decryptedPath = `${FileSystem.documentDirectory}${item.id}_decrypted.text`;
        console.log("privateKey: " + privateKey)
        try {
          await decryptFile(encryptedUri, privateKey, `${item.id}_decrypted.text`);
          console.log("[handleFilePress: text] Decryption successful, decryptedPath:", decryptedPath);
    
          const encodedURI = encodeURI(decryptedPath);
          router.push({
            pathname: "/TextView/[URI]",
            params: { URI: encodedURI },
          });
        } catch (err) {
          console.error("[handleFilePress: text] Decryption failed:", err);
        }
        return;
      }

      // Check if the file is an image and if the format is supported
      if (mimeParts[0] === "image" && SupportedImageTypes.includes(mimeParts[1])) {
        const encryptedUri = await getOrFetchFileUri(item.id);
        if (!encryptedUri) {
          console.error("[handleFilePress: image] Failed to get encrypted URI");
          return;
        }
    
        const decryptedPath = `${FileSystem.documentDirectory}${item.id}_decrypted.image`;
        console.log("privateKey: " + privateKey)
        try {
          await decryptFile(encryptedUri, privateKey, `${item.id}_decrypted.image`);
          console.log("[handleFilePress: image] Decryption successful, decryptedPath:", decryptedPath);
    
          const encodedURI = encodeURI(decryptedPath);
          router.push({
            pathname: "/ImageView/[URI]",
            params: { URI: encodedURI },
          });
        } catch (err) {
          console.error("[handleFilePress: image] Decryption failed:", err);
        }
        return;
      }

      // TODO: show something when the fle type is not supported
      console.warn("[handleFilePress] Unsupported file type:", item.type);
      // await getOrFetchFileUri(item.id);
  };

  const handleItemLongPress = (item: FileItem) => {
    console.log("item long pressed. fileID: " + item.id + " fileName: " + item.name + " type: " + item.type);
  };

  return (
    <View style={[styles.container]}>
      <View style={styles.header}>
        hide the back button on the home directory
        {previousID ? ( 
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={textStyle}>{'< Back'}</Text>
        </TouchableOpacity>
        ): null }
        <Text style={[styles.sectionTitle, textStyle]}>Current Directory: {currentDirName}</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push(`/profile/${storedUserID}` as any)}
        >
          {profileImageUri ? (
            <Image
              source={{ uri: profileImageUri }}
              style={styles.profileImage}
            />
          ) : (
            <SimpleLineIcons name="user" size={24} color={isDarkMode ? 'white' : 'black'} />
          )}
        </TouchableOpacity>
      </View>
      <TextInput style={styles.searchBar} placeholder="Search" placeholderTextColor="#888" />
      <Text style={[styles.sectionTitle, textStyle]}>Recently opened</Text>
      <DisplayFolders data={files} onFolderPress={handleFolderPress} onFilePress={handleFilePress} onItemLongPress={handleItemLongPress} />
      <AddButton addFolder={addFolder} parentID={currentParentDirID} addFile={addFile} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 40,
    marginBottom: 10,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  profileButton: {
    padding: 5,
  },
  searchBar: {
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  lightBackground: {
    backgroundColor: 'white',
    flex: 1,
  },
  darkBackground: {
    backgroundColor: '#333',
    flex: 1,
  },
  darkText: {
    color: 'white',
  },
  lightText: {
    color: 'black',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 15,
  },
});

export default FolderNavigation;
