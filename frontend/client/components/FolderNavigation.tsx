import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, TextInput, Image, ActivityIndicator } from 'react-native';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import DisplayFolders from './displayFolders';
import { getItemsInParentDB, syncWithBackend, getFileURIFromDB, updateFileUri, deleteFileLocally } from '../services/database';
import AddButton from './addButton';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { FileItem } from '@/components/displayFolders';
import { decryptFile } from './decryption';
import getSharedFolders from '@/services/getSharedFolders';
import FileContextMenu from './fileContextMenu';

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
   //const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentParentDirID, setCurrentParentDirID] = useState<any>(initialParentID);
  const [previousID, setPreviousID] = useState(null);
  const [currentDirName, setCurrentDirName] = useState('Home');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

   // a list of the image mime subtypes that the app can open.
   // Example: 'image/png' gets split at the '/'. MIME.Type is 'image' and MIME.Subtype is 'png'
  const [searchQuery, setSearchQuery] = useState('');

  const storedUserID = String(SecureStore.getItem('userID'));
  const storedToken = String(SecureStore.getItem('authToken'));
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
//  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
 // const [loadingFiles, setLoadingFiles] = useState(true);
 // const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Add this state
  const [showMenu, setShowMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [refreshingKey, setRefreshingKey] = useState(0);

  // a list of the image mime subtypes that the app can open.
  // Example: 'image/png' gets split at the '/'. MIME.Type is 'image' and MIME.Subtype is 'png'
  const SupportedImageTypes: string[] = ["jpeg", "png", "heic", "gif", "jp2"];

  useEffect(() => {
    const syncAndRefresh = async () => {
      setLoadingFiles(true);
      await syncWithBackend(storedUserID, storedToken);
           // await getAllFilesURi(currentParentDirID, storedUserID, async (files) => {
      //   for (const file of files) {
      //     if (!file.uri || file.uri === 'null') {
      //       const encryptedUri = await getOrFetchFileUri(file.id);
      //       const decryptedPath = `${FileSystem.documentDirectory}${file.id}_decrypted.pdf`;
      //       await decryptFile(encryptedUri, privateKey, `${file.id}_decrypted.pdf`);
      //       await updateFileUri(file.id, decryptedPath);
      //     }
      //   }
      await refreshData(); // Fetch again after all decryption + URI set
      setLoadingFiles(false);  // Done loading
      setInitialLoadComplete(true);
    };

    syncAndRefresh();
  }, []);

  useEffect(() => {

    refreshData();
  }, [currentParentDirID, addFolder, addFile]);
  // reload the data in the list showing the files
  const refreshData = () => {
     // getFoldersByParentID(currentParentDirID, storedUserID, setFolders);
    setSearchQuery('');
    getItemsInParentDB(currentParentDirID, storedUserID, setFiles);
    setRefreshingKey(prev => prev + 1); 
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
      console.log("image file path " + fileInfo.uri)
      if (fileInfo.exists) {
        setProfileImageUri(imagePath);
      }
    };

    checkProfileImage();
  }, []);

   // new attempt at getOrFetchFileUri that also decrypts the file
  const getDecryptedFileURI = async (item: FileItem) => {
    try {
      const localURI = await getFileURIFromDB(item.id);

      if (localURI && localURI !== "null") {
        return localURI;
      }

      const fileResponse = await fetch(`${apiUrl}/getFile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID: storedUserID,
          authToken: storedToken,
          fileID: item.id,
        }),
      });

      if (!fileResponse.ok) {
        const data = await fileResponse.json();
        if (data.error === "File not found") {
          await deleteFileLocally(item.id);
          return null;
        }
        if (data.error === "File is being processed, try again later") return null;
        throw Error(data.error || `${fileResponse.status} ${fileResponse.statusText}`);
      }

      const blob = await fileResponse.blob();
      const tmpPath = `${FileSystem.documentDirectory}${item.id}_encrypted`;
      const base64Data = await blobToBase64(blob);
      await FileSystem.writeAsStringAsync(tmpPath, base64Data, { encoding: FileSystem.EncodingType.Base64 });

      const decryptedPath = await decryptFile(tmpPath, item);
      await FileSystem.deleteAsync(tmpPath);
      await updateFileUri(item.id, decryptedPath);
      return decryptedPath;
    } catch (error) {
      throw error;
    }
  };

  const handleFilePress = async (item: FileItem) => {
    if (loading) return; // Prevent double taps

    setLoading(true);
    try { 
      const mimeParts = item.type.split('/');
      if (mimeParts.length !== 2) return;
    
      const fileURI = await getDecryptedFileURI(item);
      if (!fileURI) return;
    
      const encodedURI = encodeURIComponent(fileURI);
  
      if (item.type === "application/pdf") {
        router.push(`/PDFView/${encodedURI}`);
      } else if (
        (mimeParts[0] === "text" && ["plain", "csv", "css", "javascript", "html", "markdown"].includes(mimeParts[1])) ||
        (mimeParts[0] === "application" && ["json", "xml"].includes(mimeParts[1]))
      ) {
        router.push(`/TextView/${encodedURI}`);
      } else if (mimeParts[0] === "image" && SupportedImageTypes.includes(mimeParts[1])) {
        router.push(`/ImageView/${encodedURI}`);
      } else {
          // TODO: show something when the fle type is not supported
        console.warn("[handleFilePress] Unsupported file type:", item.type);
      }
    } finally {
        setLoading(false);
    }
  };
  
  

  const handleItemLongPress = (item: FileItem) => {
    console.log("item long pressed. fileID: " + item.id + " fileName: " + item.name + " type: " + item.type);
    // File context menu 
    setSelectedItem(item);
    setShowMenu(true);
  };

  const handleCloseContextMenu = () => {
    setShowMenu(false);
  };

  var searchBarStyle = isDarkMode ? styles.searchBarDark : styles.searchBarLight;
  var searchBarPlaceHoldertextColor = isDarkMode ? styles.searchBarDark : styles.searchBarLight;

  return (
    <View style={[styles.container]} pointerEvents={loading ? 'none' : 'auto'}>
      <View style={styles.header}>
        {previousID ? (
          <TouchableOpacity onPress={handleBackPress} style={[styles.backButton, { backgroundColor: isDarkMode ? '#444' : '#C1C8D9' }]}>
            <Text style={[textStyle,{color: isDarkMode ? 'white' : 'black'}]}>{'<Back'}</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={[styles.sectionTitle, textStyle]}>
          {currentDirName === "Home" ? "Hammerspace" : currentDirName}
        </Text>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push(`/profile/${storedUserID}` as any)}
        >
          {profileImageUri ? (
            <Image source={{ uri: profileImageUri}} style={styles.profileImage} />
          ) : (
            <SimpleLineIcons name="user" size={24} color={isDarkMode ? 'white' : 'black'} />
          )}
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center' }}>
        <TextInput
          style={searchBarStyle}
          placeholder="Search"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {currentDirName !== "Home" && (
        <View style={{ alignItems: 'flex-start', marginLeft: 20, marginBottom: 10 }}>
          <TouchableOpacity onPress={() => router.push(`/manageFolder/${currentParentDirID}`)} style={[styles.manageFolderButton, { backgroundColor: isDarkMode ? '#444' : '#C1C8D9' }]}>
            <Text style={[textStyle, { color: isDarkMode ? 'white' : 'black' }]}>Manage Folder</Text>
          </TouchableOpacity> 
        </View>
      )}

      {currentDirName === "Home" && (
        <Text style={[styles.recentlyOpened, textStyle]}>Recently opened</Text>
      )}

      <View style={{ flex: 1 }}>

      {/* Search Bar */}
      <DisplayFolders
      data={files.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )}
    onFolderPress={handleFolderPress}
    onFilePress={handleFilePress}
    onItemLongPress={handleItemLongPress}
    refreshingKey={refreshingKey}
    />

      {/* Conditionally render the FileContextMenu */}
      {showMenu && selectedItem && (
        <FileContextMenu item={selectedItem} onClose={handleCloseContextMenu} onItemRemoved={() => refreshData()} />
      )}
      </View>

      <View style={styles.addButtonContainer}>
        <AddButton addFolder={addFolder} parentID={currentParentDirID} addFile={addFile} />
      </View>
      {loading && (
  <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    }}
    pointerEvents="auto"
  >
    <ActivityIndicator size="large" color="#fff" />
  </View>
      )}
    </View>
  );
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
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

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: 40,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 5,
  },
  profileButton: { padding: 5 },
  searchBarLight: {
    height: 40,
    width: '90%',
    backgroundColor: '#d2d6d6',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  searchBarDark: {
    height: 40,
    width: '90%',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
    marginLeft: 0,
  },
  recentlyOpened: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 22,
    marginTop: 8,
  },
  lightBackground: { backgroundColor: 'white', flex: 1 },
  darkBackground: { backgroundColor: '#333', flex: 1 },
  darkText: { color: 'white' },
  lightText: { color: '#2a2d38' },
  profileImage: { width: 50, height: 50, borderRadius: 15 },
  addButtonContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
  manageFolderButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 5,
    top: 10,
    left: 0,
  },
});

export default FolderNavigation;
