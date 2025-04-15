import React, { useState,useEffect } from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
import { View} from 'react-native';
import initDB, { seeFiles, getFoldersByParentID, getFilesByParentID, insertFolder ,insertFile,  createTables, testDBname, dropDatabase} from '../../services/database'
import  AddButton  from  '../../components/addButton'
import DisplayFolders from '@/components/displayFolders';
import FolderNavigation from '@/components/FolderNavigation';
import { SafeAreaView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from 'expo-router';

export default function HomeScreen() {
  const storedValue =  SecureStore.getItem('authToken');
  const storedUserID =  String(SecureStore.getItem('userID'));

  useEffect(() => {
    const testSecureStorage = async () => {
      try {
        // Set and get a value from secure storage
      //  const storedValue = await SecureStore.getItem('authToken');
      //  const storedUserID = await SecureStore.getItem('userID');
        console.log('Stored Value:', storedValue);
        console.log('Stored Value:', storedUserID);
      } catch (error) {
        console.error('Error using SecureStorage:', error);
      }
    };
  
    testSecureStorage();
  }, []);
  

  useEffect(() => {
    // Call createTables to initialize the database on app startup
    initDB()
    // dropDatabase()
    createTables()
    // seeFiles()
  
   getFoldersByParentID(currentID, storedUserID, setFolders)
   getFilesByParentID(currentID, storedUserID, setFiles)
 
  }, []); // Empty dependency array ensures it runs only once on startup
  
  const [folders, setFolders] = useState<any>([]);
  const [files, setFiles] = useState<any>([]);
  const [currentID, setCurrentID] = useState('root'); // Start with root as the current directory

  const addFolder = (name: string, type: string, dirID: string, parentID: string) => {
    console.log("in addFolder " + name + " " + type + " " + dirID + " " + currentID)
    insertFolder(name, dirID, parentID, storedUserID)
    setCurrentID(dirID); // Set the current folder to the new folder's dirID
    
    testDBname()

  };
  
  const addFile = (name: string, uri: string, dirID: string, parentID: string, size:  number) => {
    console.log("in index addFile  name is " + name  + " dirID is  " + dirID + "parentID is" + parentID + " size is " +size)
    insertFile(name, uri, dirID, parentID, size, storedUserID); 
    setCurrentID(dirID); // Set the current folder to the new folder's dirID
    testDBname()
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FolderNavigation initialParentID={currentID} addFolder={addFolder} addFile={addFile} /> {/* Start from root folder */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
