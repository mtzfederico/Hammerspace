import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  Modal,
  Button,
  TouchableWithoutFeedback,
  Keyboard,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native'; // Import useNavigation hook

interface User {
  id: number;
  name: string;
}

type Permission = 'view' | 'edit';

interface FolderUser extends User {
  permission: Permission;
}

const ManageFolderScreen: React.FC = () => {
  const colorScheme = useColorScheme(); // Automatically detect light or dark mode
  const [folderUsers, setFolderUsers] = useState<FolderUser[]>([]); // This will hold the folder members
  const [isModalVisible, setModalVisible] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [openDropdownUserId, setOpenDropdownUserId] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]); // All users from your backend

  const navigation = useNavigation(); // Initialize the navigation hook

  // Fetch the actual users from your backend or authentication service
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('https://your-api.com/users'); // Replace with correct API endpoint
        const data = await response.json();
        setAllUsers(data); // Assuming the response contains an array of users
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  const changePermission = (id: number, permission: Permission) => {
    setFolderUsers((prev) =>
      prev.map((user) =>
        user.id === id ? { ...user, permission } : user
      )
    );
    setOpenDropdownUserId(null); // Close dropdown
  };

  const removeUser = (id: number) => {
    setFolderUsers((prev) => prev.filter((user) => user.id !== id));
  };

  const addUser = () => {
    if (newUserName.trim() === '') return;

    const newUser: FolderUser = {
      id: Date.now(), // Generate a temporary ID 
      name: newUserName,
      permission: 'view',
    };
    setFolderUsers([...folderUsers, newUser]);
    setNewUserName('');
    setModalVisible(false);
  };

  const handleOutsideClick = () => {
    setOpenDropdownUserId(null);
    Keyboard.dismiss();
  };

  const renderUserItem = ({ item }: { item: FolderUser }) => (
    <View style={styles.userItem}>
      <Text style={[styles.userName, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>{item.name}</Text>
      <View style={styles.permissionContainer}>
        <Text style={[styles.permissionLabel, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>{item.permission === 'edit' ? 'Edit' : 'View'}</Text>
        <Switch
          value={item.permission === 'edit'}
          onValueChange={(value) => changePermission(item.id, value ? 'edit' : 'view')}
        />
        <TouchableOpacity onPress={() => removeUser(item.id)}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={handleOutsideClick}>
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#030303', '#767676'] : ['#FFFFFF', '#92A0C3']}
        style={styles.gradientBackground}
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colorScheme === 'dark' ? '#444' : '#C1C8D9' }]}
            onPress={() => navigation.goBack()} // Use navigation.goBack() to navigate back
          >
            <Text style={[ { color: colorScheme === 'dark' ? 'white' : 'black' }]}> {'<Back'}</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>User Permissions</Text>

          <FlatList
            data={folderUsers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserItem}
          />

          <TouchableOpacity
            style={[styles.addUserButton, { backgroundColor: colorScheme === 'dark' ? '#444' : '#C1C8D9' }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.addUserText,{ color: colorScheme === 'dark' ? 'white' : 'black' }]}>Add User</Text>
          </TouchableOpacity>

          {/* Modal for adding user */}
          <Modal visible={isModalVisible} animationType="slide">
            <View style={styles.modalContainer}>
              <Text style={[styles.modalTitle, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Add Friend To Folder</Text>
              <TextInput
                placeholder="Enter user name"
                value={newUserName}
                onChangeText={setNewUserName}
                style={styles.input}
              />
              <View style={styles.modalButtonRow}>
                <Button title="Add" onPress={addUser} />
                <Button title="Cancel" onPress={() => setModalVisible(false)} color="gray" />
              </View>
            </View>
          </Modal>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    marginTop: 0,
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 5,
  },
 
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 55,
  },
  userItem: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  userName: {
    fontSize: 16,
    flex: 1,
  },
  addUserButton: {
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  addUserText: {
    fontWeight: 'bold',
  },
  permissionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  permissionLabel: {
    fontSize: 14,
    width: 40,
  },
  removeText: {
    color: 'red',
    marginLeft: 10,
    fontSize: 14,
  },
  modalContainer: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default ManageFolderScreen;
