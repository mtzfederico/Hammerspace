import { StyleSheet, View, Image, Text, useColorScheme , FlatList, SafeAreaView, TouchableOpacity, Dimensions, Pressable} from "react-native";
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
};

type DisplayFoldersProps = {
  data: FileItem[];
  onFolderPress: (id: string, name: string) => void;
  onFilePress: (item: FileItem) => void;
  onItemLongPress: (item: FileItem) => void;
};

const DisplayFolders = ({ data, onFolderPress, onFilePress, onItemLongPress}: DisplayFoldersProps) => {
  console.log("display is happening ")
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =  String(SecureStore.getItem('userID'));
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
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
      const fileExtensionsWithImages = ['.jpg', '.jpeg', '.png', '.pdf'];
      const hasImage = fileExtensionsWithImages.some(ext => item.name.endsWith(ext));
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
    <View style={backgroundStyle}>
      <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        style={styles.list}
        contentContainerStyle={{ gap: 80 }}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyMsg}>You have no files</Text>}
        numColumns={numColumns}
        refreshing={isRefreshing}
        onRefresh={handlePullToRefresh}
      />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  list: {
    width: '100%',
    height: '800%',
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
  },
  emptyMsg: {
    fontSize: 28,
    textAlign: 'center',
    marginTop: 10,
  },
  image: {
    width: imageWidth,
    height: imageHeight,
    resizeMode: 'cover' 
  },
  darkBackground: {
    flex: 1,
    backgroundColor: "black",
    height: '100%',
    width: '100%',
    marginBottom: 10,
  },
  lightBackground: {
    flex: 1,
    backgroundColor: "white",
    height: '100%',
    width: '100%',
    padding:10
  },
  lightText: {
    color: 'black',
    fontSize: 16,
    width: imageWidth
  },
  darkText: {
    color: 'white',
    fontSize: 16,
    width : imageWidth
  },
  imageContainer: {
    marginHorizontal: 30,
    flex: 1
  }
});

export default DisplayFolders;
      
      