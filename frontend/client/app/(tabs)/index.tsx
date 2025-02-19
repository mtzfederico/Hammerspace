import React, { useState } from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
import { View} from 'react-native';
import {Input, Button} from 'react-native-elements';
import  AddButton  from  '../../components/addButton'

import { TouchableOpacity, Text } from 'react-native';


export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Other components can be placed here */
      AddButton()
      }
      
    </View>
  );
};
  




const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
