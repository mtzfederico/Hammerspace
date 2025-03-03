import React, { useState } from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
import { View} from 'react-native';
import {Input, Button} from 'react-native-elements';
import  AddButton  from  '../../components/addButton'
import  Flat  from  '../../components/flatExample'
import DisplayFolders from '@/components/displayFolders';

import { TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native';
import { ScrollView } from 'react-native-reanimated/lib/typescript/Animated';




export default function HomeScreen() {
const [folders, setFolders] = useState([]);

   const addFolder = (name: string) => {
    const newFolder = {
      id: folders.length + 1, // Assign new id to the folder
      name,
    };
    setFolders([...folders, newFolder]);
  };

  return (
    <View style={styles.container}>
      <DisplayFolders folders={folders} /> {/* Display the folder list */}
      <AddButton addFolder={addFolder} /> {/* Pass addFolder function to AddButton */}
    </View>
  );
};
  




const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});
