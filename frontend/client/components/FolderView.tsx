import React, { useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useColorScheme } from 'react-native';
import DisplayFolders from './displayFolders'; // Import DisplayFolders component
import { getFoldersByParentID, getFilesByParentID} from '../../client/services/database';
import AddButton from './addButton';
import CreateFolder from './addFolder';
import sendFolder from './sendFolder';

const FolderNavigation = ({ initialParentID, addFolder, addFile}) => {
  const [folders, setFolders] = useState<any>([]);
  const [files, setFiles] = useState<any>([]);
  const [currentParentDirID, setCurrentParentDirID] = useState(initialParentID);
  const [previousID, setPreviousID] = useState<string | null>(null); // To track the previous directory
  const [currentDirName, setCurrentDirName] = useState('Home');
  const [prevDirName, setPrevDirName] = useState<string>("");

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  
  const refreshData = () => {
    getFoldersByParentID(currentParentDirID, setFolders);
    getFilesByParentID(currentParentDirID, setFiles);
  };

  useEffect(() => {
    // Fetch folders and files for the current directory
    refreshData()
  },[currentParentDirID]); // Re-run the effect when folders or files change

 

  useEffect(() => {
    if (addFolder) {
      refreshData();
    }
  }, [addFolder]);

  useEffect(() => {
    if (addFile) {
      refreshData();
    }
  }, [addFile]);


  const handleFolderPress = async (dirID: string, folderName: string) => {
   
    console.log('Navigating to folder:', dirID, 'Folder Name:', folderName);

    // You can now use folderName here to update the current directory name or perform other actions
    setPreviousID(currentParentDirID); // Save the current directory as the previous one
    setPrevDirName(currentDirName)
    setCurrentParentDirID(dirID); // Move to the selected folder
  
    // Optionally, update the current directory name based on the selected folder
    setCurrentDirName(folderName);
  };

  const handleBackPress = () => {
    console.log('Navigating back from', currentParentDirID);
  console.log('Previous directory ID:', previousID);

  // Only navigate back if previousID is not equal to currentParentDirID
  if (previousID && previousID !== currentParentDirID) {
    setCurrentParentDirID(previousID); // Navigate back to the previous folder
    setPreviousID(null); // Reset previousID after navigating back
    setCurrentDirName(prevDirName);
    setPrevDirName("null")
  } else {
    console.log("Already at the root folder or no previous folder");
    setCurrentParentDirID("root")
    setCurrentDirName("Home");
  }
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Text style={textStyle}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={textStyle}>Current Directory: {currentDirName}</Text>
      </View>

      <DisplayFolders data={[...folders, ...files]} onFolderPress={handleFolderPress} />


    
      <AddButton addFolder={addFolder} parentID={currentParentDirID} addFile={addFile}/>
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
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  backButton: {
    marginRight: 10,
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 5,
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
});

export default FolderNavigation;
