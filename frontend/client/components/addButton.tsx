
import {Image, StyleSheet, Text, TouchableOpacity, View, Animated , ImageBackground} from 'react-native';
import React, { useState} from 'react';
import { reload } from 'expo-router/build/global-state/routing';









const AddButton = () => {
    const [icon_1] = useState(new Animated.Value(40));
  const [icon_2] = useState(new Animated.Value(40));
  const [icon_3] = useState(new Animated.Value(40));

  const [pop, setPop] = useState(false);

  const popIn = () => {
    setPop(true);
    Animated.timing(icon_1, {
      toValue: 200,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_2, {
      toValue: 110,
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
      toValue: 40,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_2, {
      toValue: 40,
      duration: 500,
      useNativeDriver: false,
    }).start();
    Animated.timing(icon_3, {
      toValue: 40,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }
    
  return (
    <View style={{
        flex: 1
      }}>
    <Animated.View style={[styles.cont, { bottom: icon_1}]}>
        <TouchableOpacity>
        <Image
        source={require('../assets/images/file.webp')}
        style={styles.icon}
      />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[styles.cont, { bottom: icon_2}]}>
        <TouchableOpacity>
        <Image
        source={require('../assets/images/folder.webp')}
        style={styles.icon}
      />
        </TouchableOpacity>
      </Animated.View>
      <TouchableOpacity style={styles.cont} onPress={() => {
          pop === false ? popIn() : popOut();
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
     bottom: 40,
     right: 40,
     borderRadius: 50,
     justifyContent: 'center',
     alignItems: 'center',
    

  },
  image: {
    tintColor: 'white',
    height: 45,
    width: 45,
  },
  icon: {
    color: '#FFFF',
    tintColor: 'white',
    height: 40,
    width: 40,
  },

});