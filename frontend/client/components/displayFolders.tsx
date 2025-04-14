import { StyleSheet, View, Image, Text, useColorScheme , FlatList, SafeAreaView, TouchableOpacity, Dimensions} from "react-native";
import FolderView from "./FolderView";

const imageHeight = 60
const imageWidth = 60
const defaultFileIcon = require('../assets/images/file.webp');

type FolderFileItem = {
  id: string;
  name: string;
  type: 'Directory' | 'File';
  uri?: string;
};

type DisplayFoldersProps = {
  data: FolderFileItem[];
  onFolderPress: (id: string, name: string) => void;
};

const DisplayFolders = ({ data , onFolderPress}: DisplayFoldersProps) => {
  console.log("display is happening ")
  
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;

  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  // Get the screen width to calculate numColumns dynamically
  const screenWidth = Dimensions.get('window').width;

  // Dynamically calculate number of columns based on screen width
  const numColumns = Math.floor(screenWidth / (imageWidth + 20)); // Add 20 for margin/padding between items

  const renderItem = ({ item }: {item :FolderFileItem}) => {
    if(item.type == 'Directory') {
      return (
        <View style={styles.imageContainer}>
          <TouchableOpacity  onPress={() => {onFolderPress(item.id, item.name)}}>
          <Image source={require('../assets/images/folder.webp')}style={styles.image} />
            <Text style={textStyle}>{item.name}</Text>
          </TouchableOpacity>
        </View>
      );
    
    } else if (item.type === 'File') {
      const fileExtensionsWithImages = ['.jpg', '.png', '.pdf'];
      const hasImage = fileExtensionsWithImages.some(ext => item.name.endsWith(ext));
      return (
        <View style={styles.imageContainer}>
          <Image source={hasImage ? { uri: item.uri } : defaultFileIcon} style={styles.image} />
          <Text style={textStyle}>{item.name}</Text>
        </View>
      );
    }
    return null;
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
        numColumns={numColumns}
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
   
  }, imageContainer : {
    marginHorizontal: 30,
    flex: 1
  }
  
  
});

export default DisplayFolders;
      
      