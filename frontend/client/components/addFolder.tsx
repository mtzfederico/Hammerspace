import React, { useState} from "react";
import { StyleSheet, View,useColorScheme , StatusBar} from "react-native";
import Dialog from "react-native-dialog";
import sendFolder from "./sendFolder";



interface CreateFolderProps {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  onFolderCreated: (newFolder: string) => void; // Callback to pass the new folder to the parent component
}


const CreateFolder =  ({ isVisible, setIsVisible, addFolder}) => {

const [inputValue, setInputValue] = useState('');


const handleInput = (text) => {
    setInputValue(text);
};

 const handleCancel = () => {
    console.log('cancel')
   setIsVisible(false);
   setInputValue('');
 };
 
 
 const handleSubmission = () => {
    // Process the input value here (e.g., save it, display it, etc.)
    const input = inputValue.trim()
    const type = "Directory"
    if(input == "") {
      alert("please enter Folder name")

    }
    console.log('Input Value:', input);
    setIsVisible(false)
    ; // Close the dialog

    // Create Folder in Backend
    sendFolder(input) 

    // dipslay Folder on screen
    addFolder(input, type)

    console.log("folder created")


 }
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
        <Dialog.Button label="Cancel" onPress={handleCancel} />
        <Dialog.Button label="Yes"  onPress={handleSubmission}/>
      </Dialog.Container>
      ): null }
    </View>
  );
  
  
}






export  default CreateFolder;


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

