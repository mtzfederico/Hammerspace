import React, { useState,useEffect } from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
import { View} from 'react-native';
import initDB, { seeFiles, getFoldersByParentID, getFilesByParentID, insertFolder ,insertFile,  createTables, testDBname, dropDatabase} from '../../../client/services/database'
import  AddButton  from  '../../components/addButton'
import DisplayFolders from '@/components/displayFolders';
import FolderNavigation from '@/components/FolderView';
import { SafeAreaView } from 'react-native';



export default function HomeScreen() {

 
  useEffect(() => {
    // Call createTables to initialize the database on app startup
  //initDB()
 //dropDatabase()
  //createTables()
 // seeFiles()
  
   getFoldersByParentID(currentID, setFolders)
   getFilesByParentID(currentID, setFiles)
 
  }, []); // Empty dependency array ensures it runs only once on startup
  

  const [folders, setFolders] = useState<any>([]);
  const [files, setFiles] = useState<any>([]);
  const [currentID, setCurrentID] = useState('root'); // Start with root as the current directory


  

  const addFolder = (name, type, dirID, parentID) => {
    console.log("in addFOlder " + name + " " + type + " " + dirID + " " + currentID)
    insertFolder(name, dirID, parentID)
    setCurrentID(dirID); // Set the current folder to the new folder's dirID
    
    testDBname()

  };
  
  
  const addFile = (name: string, uri: string, dirID: string, parentID , size:  number) => {
    console.log("in index addFile  name is " + name  + " dirID is  " + dirID + "parentID is" + parentID + " size is " +size)
    insertFile(name, uri, dirID, parentID, size); 
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
