import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, TextInput } from 'react-native';
import { Ionicons, SimpleLineIcons } from '@expo/vector-icons';
import DisplayFolders from './displayFolders';
import { getFoldersByParentID, getFilesByParentID, syncWithBackend } from '../../client/services/database';
import AddButton from './addButton';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

type FolderNavigationProps = {
  initialParentID: string;
  addFolder: (name: string, type: string, dirID: string, parentID: string) => void;
  addFile: (name: string, uri: string, dirID: string, parentID: string, size: number) => void;
};
//Component that handles the folder navigation and file display
// It uses the DisplayFolders component to show the folders and files
// It also uses the AddButton component to add new folders and files
// It uses the getFoldersByParentID and getFilesByParentID functions to fetch the folders and files from the database
// It uses the syncWithBackend function to sync the data with the backend
// Is recursively called when a folder is pressed
const FolderNavigation = ({ initialParentID, addFolder, addFile }: FolderNavigationProps) => {
  const router = useRouter();
  const [folders, setFolders] = useState<any[]>([]);
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

  useEffect(() => {
    const syncAndRefresh = async () => {
      await syncWithBackend(storedUserID, storedToken);
      refreshData();
    };
    syncAndRefresh();
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentParentDirID, addFolder, addFile]);

  const refreshData = () => {
    getFoldersByParentID(currentParentDirID, storedUserID, setFolders);
    getFilesByParentID(currentParentDirID, storedUserID, setFiles);
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
        <TouchableOpacity style={styles.profileButton} onPress={() => {router.replace('/profile')}}>
          <SimpleLineIcons name="user" size={24} color={isDarkMode ? 'white' : 'black'} />
        </TouchableOpacity>
      </View>
      <TextInput style={styles.searchBar} placeholder="Search" placeholderTextColor="#888" />
      <Text style={[styles.sectionTitle, textStyle]}>Recently opened</Text>
      <DisplayFolders data={[...folders, ...files]} onFolderPress={handleFolderPress} />
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
});

export default FolderNavigation;
