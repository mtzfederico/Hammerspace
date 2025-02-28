import React, { useState, useEffect } from "react";
import { Button, StyleSheet, View, Image, Text, useColorScheme } from "react-native";
import Dialog from "react-native-dialog";
import sendFolder from "./sendFolder";



const CreateFolder =  ({ isVisible, setIsVisible }) => {

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
    console.log('Input Value:', inputValue);
    setIsVisible(false); // Close the dialog
    sendFolder(inputValue)
    console.log("folder created")
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
    color: 'black',
    width: 0,
    height: 0,   
    position: 'absolute',
    borderColor: 'red', 
    
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
})

