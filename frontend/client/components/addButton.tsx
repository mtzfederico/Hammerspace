
import {Image, StyleSheet, Text, TouchableOpacity, View, Animated , useColorScheme} from 'react-native';
import React, { useState} from 'react';
import { reload } from 'expo-router/build/global-state/routing';

import { pickDocument } from './sendFile';
import CreateFolder  from './addFolder';









const AddButton = () => {

    const [visible, setVisible] = useState(false); 
    const [isTextVisible, setIsTextVisible] = useState(false);
  
    const toggleTextVisibility = () => {
      setIsTextVisible(!isTextVisible);
    };
    const TextPosition= 120
    const iconPopIn1 = 180
    const iconPopIn2 = 250
    const restState= 100


  const [icon_1] = useState(new Animated.Value(restState));
  const [icon_2] = useState(new Animated.Value(restState));
  const [icon_3] = useState(new Animated.Value(restState));

  const [pop, setPop] = useState(false);

  const popIn = () => {
    setPop(true);
    Animated.timing(icon_1, {
      toValue: iconPopIn1,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_2, {
      toValue: iconPopIn2,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_3, {
      toValue: 130,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }

  const popOut = () => {
    setPop(false);
    Animated.timing(icon_1, {
      toValue: restState,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_2, {
      toValue: restState,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_3, {
      toValue: restState,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }

  const handleDocumentPick = async () => {
    await pickDocument();
  };

  const handleFolderCreation = () => {
    setVisible(!visible)
    console.log("Vising is bere " + visible)
    
  };

    
  const colorScheme = useColorScheme();

  const isDarkMode = colorScheme === 'dark';

  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
    
  return (
    <View style={{
        flex: 1,

      }}>
    <Animated.View style={[styles.cont, { bottom: icon_1}]}>
        <TouchableOpacity style={styles.touchable} onPress={handleDocumentPick}>
        <Image
        source={require('../assets/images/file.webp')}
        style={styles.icon}
      />
        </TouchableOpacity>
      </Animated.View>
      
      {isTextVisible &&<Text style={[textStyle, {bottom: iconPopIn1+20, right: TextPosition}]}>Create a File </Text>}
      
      

      <Animated.View style={[styles.cont, { bottom: icon_2}]}>
        <TouchableOpacity style={styles.touchable} onPress={handleFolderCreation}>
        <Image
        source={require('../assets/images/folder.webp')}
        style={styles.icon}
      />
        </TouchableOpacity >
       
      </Animated.View>
     { visible && <CreateFolder isVisible={visible} setIsVisible={setVisible}/>}
      {isTextVisible &&<Text style={[textStyle, {bottom: iconPopIn2+20, right: TextPosition}]} >Create a Folder </Text>}


      <TouchableOpacity style={styles.cont} onPress={() => {
          pop === false ? popIn() : popOut();
          toggleTextVisibility()
        }}>
      <Image
        source={require('../assets/images/plus.png')}
        style={styles.image}
      />
    </TouchableOpacity>
    
    </View>

    
  );
};

export default AddButton;

const styles = StyleSheet.create({
  cont: {
    backgroundColor: 'blue',
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
  icon: {
    color: 'white',
    tintColor: 'white',
    height: 40,
    width: 40,
    position: 'absolute'
    
  },

  lightText: {
    color: 'black',
    fontSize: 16,
    position: 'absolute'
  },
  darkText: {
    color: 'white',
    fontSize: 16,
    position: 'absolute'
  },

  touchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'blue',
  }
});