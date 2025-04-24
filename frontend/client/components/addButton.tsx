import {Image, StyleSheet, Text, Pressable, View, useColorScheme, Alert, Dimensions, Modal} from 'react-native';
import React, { useState} from 'react';
import { pickDocument } from './pickDocument';
import CreateFolder  from './CreateFolder';
import { LinearGradient } from 'expo-linear-gradient';

type addFolderType = ( 
  fileName: string,
  type: string,
  dirID: string,
  parentID: string,
 ) => void

export type AddFileType = (
  name: string,
  uri: string,
  dirID: string,
  type: string,
  parentID: string,
  size: number
) => void;

type AddButtonProps = {
  addFolder: addFolderType;
  addFile: AddFileType;
  parentID: string;
};

// Button at the buttom right of the Screen
// Add Folder functions that were defined in homescreen.tsx get passed to this component
// and then passed to the addFolder function in addFolder.tsx
// The addFile function and the parentID is passed to the sendFile.tsx component
const AddButton = ({addFolder, addFile, parentID}: AddButtonProps  ) => {
  console.log("Addbutton parentID " + parentID)

  const [modalVisible, setModalVisible] = useState(false);
  const [isAddFolderViewVisible, setIsAddFolderViewVisible] = useState(false); 

  const handleDocumentPick = async () => {
    setModalVisible(false);
    try {
      await pickDocument(parentID, addFile);
    } catch(err) {
      Alert.alert('Failed to upload file', `${err || 'Unknown error'}`);
    }
  };
    
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const titleTextStyle = isDarkMode ? styles.modalTitleDark : styles.modalTitleLight;
  const closeBtnTextStyle = isDarkMode ? styles.closeBtnTextDark : styles.closeBtnTextLight;
  const actionBtnTextStyle = isDarkMode ? styles.actionBtnDark : styles.actionBtnLight;
    
  // TODO: make the outside of the model tappable so that it can be tapped outside to close it
  return (
    <View style={{ flex: 1 }} importantForAccessibility='no-hide-descendants'>
      { isAddFolderViewVisible && <CreateFolder isVisible={isAddFolderViewVisible} setIsVisible={setIsAddFolderViewVisible} addFolder={addFolder} parentID={parentID} />}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => {
          Alert.alert('Modal has been closed.');
          setModalVisible(!modalVisible);
        }}
      >
        {/* The second Pressable is supposed to be used to ignore the taps inside the actual content view */}
        <Pressable style={styles.centeredView} onPress={() => setModalVisible(false)}>
          <Pressable onPress={() => {}} style={{ flex: 1, justifyContent: 'flex-end' }}>
            <LinearGradient colors={isDarkMode ? ['#030303', '#767676'] : ['#678ab5', '#b1b6c4']} style={styles.modalContainer}>
              <Pressable style={[styles.button, styles.closeBtn]} onPress={() => setModalVisible(!modalVisible)}>
                <Text style={closeBtnTextStyle}>X</Text>
              </Pressable>
              <Text style={titleTextStyle}>Select an option</Text>

              <Pressable style={[styles.button, actionBtnTextStyle]} onPress={handleDocumentPick}>
                <Text style={styles.textStyle}>Add File</Text>
              </Pressable>

              <Pressable style={[styles.button, actionBtnTextStyle]} onPress={() =>{
                // show view to take a picture
                setModalVisible(false)
              }}>
                <Text style={styles.textStyle}>Take a Picture</Text>
              </Pressable>
              <Pressable style={[styles.button, actionBtnTextStyle]} onPress={() => {
                setIsAddFolderViewVisible(true);
                setModalVisible(false);
              }}>
                <Text style={styles.textStyle}>Create Folder</Text>
              </Pressable>
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>

      <Pressable style={[styles.addItemsBtn, {backgroundColor: isDarkMode ? '#c0c1c4' : '#626f94'}]} onPress={() => {setModalVisible(!modalVisible)}}>
      <Image source={require('../assets/images/plus.png')} style={styles.image}/>
    </Pressable>
    </View>
  );
};

export default AddButton;

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 15,
    zIndex: 1,
  },
  closeBtnTextLight: {
    color: 'black',
  },
  closeBtnTextDark: {
    color: 'white',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  actionBtnLight: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 12,
  },
  actionBtnDark: {
    // backgroundColor: '#2196F3',
    // backgroundColor: '#7ea3d0',
    backgroundColor: '#678ab5',
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 12,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: Dimensions.get('window').height / 2.5,
    backgroundColor: 'white',
    borderRadius: 20,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    padding: 35,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addItemsBtn: {
     width: 60,
     height: 60,
     position: 'absolute',
     bottom: 100,
     right: 40,
     borderRadius: 50,
     justifyContent: 'center',
     alignItems: 'center',
    overflow: 'hidden'
  },
  image: {
    tintColor: 'white',
    height: 45,
    width: 45,
  },
  modalTitleLight: {
    color: 'black',
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalTitleDark: {
    color: 'white',
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  }
});