import React, { useState, useEffect} from "react";
import { StyleSheet, View,useColorScheme , StatusBar} from "react-native";
import Dialog from "react-native-dialog";
import sendFolder from "./sendFolder";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
interface CreateFolderProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  addFolder: (name: string, type: string, dirID: string, parentID:string) => void;
  parentID: string; // Callback to pass the new folder to the parent component
}

const CreateFolder =  ({ isVisible, setIsVisible, addFolder, parentID}: CreateFolderProps) => {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [isShared, setIsShared] = useState(false);
 

  const handleInput = (text: string) => {
    setInputValue(text);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setInputValue('');
  };

  const handleSubmission = async () => {
    const input = inputValue.trim();
    if (input === "") {
      alert("Please enter a folder name");
      return;
    }

    setIsVisible(false);

    if (isShared) {
      // Navigate to the shared folder screen
      router.push({
        pathname: "/sharedfolder",
        params: {
          folderName: input,
          parentID: parentID,
        }
      });
      return;
    }

    const type = "folder";
    const dirID = await sendFolder(input, parentID, []);
    if (dirID == null) {
      console.error("Failed to create folder");
      return;
    }

    addFolder(input, type, dirID, parentID);
  };


  
/*

 const handleCreate = () => {
   // The user has pressed the "Delete" button, so here you can do your own logic.
   // ...Your logic
   setIsVisible(false);
 };
 */

const colorScheme = useColorScheme();
const isDarkMode = colorScheme === 'dark';
const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;

return (
    <View style={backgroundStyle} >
      {isVisible ? ( 
        <Dialog.Container visible={isVisible} >
          <Dialog.Title >Create Folder</Dialog.Title>
          <Dialog.Description >
            Please enter the name of the Folder.
          </Dialog.Description>
          <Dialog.Input
            onChangeText={handleInput}
            value={inputValue}
            placeholder="Enter text here"
          />
            <Dialog.Switch
          label="Make this a shared folder"
          value={isShared}
          onValueChange={setIsShared}
        />
          <Dialog.Button label="Cancel" onPress={handleCancel} />
          <Dialog.Button label="Create Folder" onPress={() => handleSubmission()} />
          
        </Dialog.Container>
      ): null }
    </View>
  );
}

export default CreateFolder;

const styles = StyleSheet.create({
  darkBackground: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
    color: 'red',
    width: '100%',
    height: 40,   
    position: 'absolute',
    borderColor: 'red', 
    bottom: 120,
    
  },
  lightBackground: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    color: 'white',
    width: 0,
    height: 0,   
    position: 'absolute',
    borderColor: 'red', 
    bottom: 40
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'red',
    width: '100%',
    bottom: 100,
    top: 100,
    left: 100,
    right:100
  },
  icon: {
    color: 'white',
    tintColor: 'white',
    height: 40,
    width: '100%',
    position: 'absolute'
  },
  flatList: {
    flex: 1, 
    width: '100%',
    color: 'red',
    backgroundColor: 'red',
    position: 'absolute',
    paddingBottom: 200,
    bottom: 200
  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
  },
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 0,
    zIndex:100
  },
})

