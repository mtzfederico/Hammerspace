import { StyleSheet, View, Image, Text, useColorScheme , FlatList, TouchableOpacity, Dimensions, Pressable} from "react-native";
import {SafeAreaView, SafeAreaProvider} from 'react-native-safe-area-context';
import React, { useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { syncWithBackend } from "@/services/database";

const imageHeight = 60
const imageWidth = 60
const defaultFileIcon = require('../assets/images/file.webp');
const defaultFolderIcon = require('../assets/images/folder.webp');

export type FileItem = {
  id: string;
  name: string;
  type: string;
  uri?: string;
  parentDir: string;
  fileSize: number;
  userID: string;
};

type DisplayFoldersProps = {
  data: FileItem[];
  onFolderPress: (id: string, name: string) => void;
  onFilePress: (item: FileItem) => void;
  onItemLongPress: (item: FileItem) => void;
};

const DisplayFolders = ({ data, onFolderPress, onFilePress, onItemLongPress}: DisplayFoldersProps) => {
  console.log("display is happening " + JSON.stringify(data))
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =  String(SecureStore.getItem('userID'));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const textStyle = isDarkMode ? styles.darkText : styles.lightText;

  // correct style based on dark mode
  const emptyMsgStyle = isDarkMode ? styles.darkEmptyMsg : styles.lightEmptyMsg;

  // Get the screen width to calculate numColumns dynamically
  const screenWidth = Dimensions.get('window').width;

  // Dynamically calculate number of columns based on screen width
  const numColumns = Math.floor(screenWidth / (imageWidth + 20)); // Add 20 for margin/padding between items

  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    console.log("Pull to refresh")
    syncWithBackend(storedUserID, storedToken);
    setIsRefreshing(false);
  };

  const renderItem = ({ item }: {item: FileItem}) => {
    if(item.type == 'folder') {
      return (
        <View style={styles.imageContainer}>
          <Pressable onPress={() => {onFolderPress(item.id, item.name)}} onLongPress={() => {onItemLongPress(item)}}>
            <Image source={defaultFolderIcon}style={styles.image} />
            <Text style={textStyle}>{item.name}</Text>
          </Pressable>
        </View>
      );
    } else {
      // heic are images from the iphone
      const fileExtensionsWithImages = ['.jpg', '.jpeg', '.png', '.heic', '.gif', '.pdf'];
      const hasImage = fileExtensionsWithImages.some(ext => item.name.endsWith(ext)) && !(item.uri || item.uri === null || item.uri === "");
      return (
        <View style={styles.imageContainer}>
          <Pressable onPress={() => {onFilePress(item)}} onLongPress={() => {onItemLongPress(item)}}>
            <Image source={hasImage ? { uri: item.uri } : defaultFileIcon} style={styles.image} />
            <Text style={textStyle}>{item.name}</Text>
          </Pressable>
        </View>
      );
    }
  };
  
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.listBackground} edges={['top', 'bottom']}>
        <FlatList
          style={styles.list}
          contentContainerStyle={{ gap: 10, paddingTop: 4, paddingBottom: 100, flexGrow: 1 }}
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          // ListEmptyComponent={<Text style={styles.emptyMsg}>You have no files</Text>}
          ListEmptyComponent={<Text style={emptyMsgStyle}>You have no files</Text>} //updated for dark mode
          numColumns={numColumns}
          refreshing={isRefreshing}
          onRefresh={handlePullToRefresh}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  list: {
    marginTop: 30,
    // width: '100%',
    width: (Dimensions.get('window').width),
    // height: '100%',
  },/*
  container: {
    flex: 1,
    padding: 10,
  },
  itemContainer: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  itemText: {
    fontSize: 18,
    color: '#333',
  },*/
////////////////////
  lightEmptyMsg: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 100,
    color: '#646b7d',
  },
  darkEmptyMsg: {
    fontSize: 24,
    textAlign: 'center',
    marginTop: 100,
    color: 'white',
  },
 ///////////////////
  image: {
    width: imageWidth,
    height: imageHeight,
    resizeMode: 'cover' 
  },
  listBackground: {
    flex: 1,
    height: '100%',
    width: '100%',
    marginBottom: 10,
    alignItems: 'center',
  },
  lightText: {
    color: 'black',
    paddingLeft: 4,
    fontSize: 14,
    width: imageWidth
  },
  darkText: {
    color: 'white',
    paddingLeft: 4,
    fontSize: 14,
    width : imageWidth
  },
  imageContainer: {
    // paddingLeft: 14,
    marginHorizontal: 16,
    flex: 1
  }
});

export default DisplayFolders;
