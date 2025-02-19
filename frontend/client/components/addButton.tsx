
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
      toValue: 130,
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
    <TouchableOpacity style={styles.cont} onPress={() => {
          pop === false ? popIn() : popOut();
        }}>
      <Image
        source={require('../assets/images/plus.png')}
        style={styles.image}
      />
    </TouchableOpacity>
    <Animated.View style={[styles.cont, { bottom: icon_1}]}>
        <TouchableOpacity>
        <Image
        source={require('../assets/images/text-152333_640.webp')}
       
      />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default AddButton;

const styles = StyleSheet.create({
  cont: {
    position: 'absolute',
    bottom : 85,
    alignSelf: 'flex-end',
    backgroundColor: 'blue',
    zIndex: 1,
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    right: 15
    

  },
  image: {
    tintColor: 'white',
    height: 45,
    width: 45,
  },
});