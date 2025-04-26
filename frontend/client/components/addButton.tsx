import {Image, StyleSheet, Text, Pressable, View, useColorScheme, Alert, Modal, Dimensions} from 'react-native';
import React, { useState} from 'react';
import { pickDocument } from './pickDocument';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import CreateFolder  from './CreateFolder';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView,Platform,TouchableWithoutFeedback,Keyboard,} from 'react-native';

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
  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =  String(SecureStore.getItem('userID'));
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

  const handleDocumentPick = async () => {
    try {
      await pickDocument(parentID, addFile);
    } catch(err) {
      Alert.alert('Failed to upload file', `${err || 'Unknown error'}`);
    }
    setModalVisible(false);
  };

  const handlePickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (result.canceled || result.assets.length === 0) {
      console.log("[handlePickImage] cancelled");
      return;
    }

    if (parentID === "") {
      throw Error("parentID is empty");
    }

    const imageUri = result.assets[0].uri;
    const mimeType = result.assets[0].mimeType || 'image/jpeg';
    const fileSize = result.assets[0].fileSize || -1;
    const fileName = result.assets[0].fileName || "unamed image";

    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      name: fileName,
      type: mimeType,
      size: fileSize,
    } as any);
    formData.append("userID", storedUserID);
    formData.append("authToken", storedToken);
    formData.append("parentDir", parentID);

    console.log("[handlePickImage] Sending uploadFile request")
    const response = await fetch(`${apiUrl}/uploadFile`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();
    if (data.success) {
      console.log('[handlePickImage] File uploaded successfully:', data);
      console.log("parentDIR " + parentID);
        var dirID= String(data.fileID);
        const size = JSON.parse(data.bytesUploaded);
        // addFile adds it to the local DB. The actual code called is in homescreen
        addFile(fileName, imageUri, dirID, mimeType, parentID, size);
    } else {
      console.error('[handlePickImage] File upload failed. Status: ' + response.status + '. Error msg: ' + data.error);
      throw Error(data.error)
    }

    setModalVisible(false);
  };
    
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const titleTextStyle = isDarkMode ? styles.modalTitleDark : styles.modalTitleLight;
  const closeBtnTextStyle = isDarkMode ? styles.closeBtnTextDark : styles.closeBtnTextLight;
  const actionBtnTextStyle = isDarkMode ? styles.actionBtnDark : styles.actionBtnLight;
    
  
  return (
    <View style={{ flex: 1 }} importantForAccessibility='no-hide-descendants'>
      { isAddFolderViewVisible && <CreateFolder isVisible={isAddFolderViewVisible} setIsVisible={setIsAddFolderViewVisible} addFolder={addFolder} parentID={parentID} />}
      <Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
    <View style={styles.centeredView}>
      <TouchableWithoutFeedback onPress={() => {}}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={isDarkMode ? ['#030303', '#767676'] : ['#678ab5', '#b1b6c4']}
            style={styles.modalContainer}
          >
            <Pressable style={[styles.button, styles.closeBtn]} onPress={() => setModalVisible(false)}>
              <Text style={closeBtnTextStyle}>X</Text>
            </Pressable>
            <Text style={titleTextStyle}>Select an option</Text>

            <Pressable style={[styles.button, actionBtnTextStyle]} onPress={handleDocumentPick}>
              <Text style={styles.textStyle}>Add File</Text>
            </Pressable>
            <Pressable style={[styles.button, actionBtnTextStyle]} onPress={() =>{handlePickImage()}}>
              <Text style={styles.textStyle}>Add from Photos App</Text>
            </Pressable>
            <Pressable style={[styles.button, actionBtnTextStyle]} onPress={() => {
                setIsAddFolderViewVisible(true);
                setModalVisible(false);
              }}
            >
              <Text style={styles.textStyle}>Create Folder</Text>
            </Pressable>
            <Pressable style={[styles.button, actionBtnTextStyle]} onPress={() => {
              // open camera
              setModalVisible(false);
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  </TouchableWithoutFeedback>
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
    fontSize: 18,
    color: 'black',
  },
  closeBtnTextDark: {
    fontSize: 18,
    color: 'white',
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2,
  },
  actionBtnLight: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginVertical: 15,
  },
  actionBtnDark: {
    // backgroundColor: '#2196F3',
    // backgroundColor: '#7ea3d0',
    backgroundColor: '#678ab5',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginVertical: 15,
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
    height: Dimensions.get('window').height / 2.3,
    backgroundColor: 'white',
    borderRadius: 20,
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    padding: 40,
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
    color: 'white',
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  modalTitleDark: {
    color: 'white',
    fontSize: 20,
    marginBottom: 15,
    textAlign: 'center',  
  },
  modalTouchableArea: {
    justifyContent: 'flex-end',
    flex: 1,
  }
});