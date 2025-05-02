import React, {useState} from 'react';
import { View, Text, StyleSheet, Pressable , TextInput} from 'react-native';
import { Modal } from 'react-native';
import removeItem from '@/services/removeItem';
import renameItem from '@/services/handleRename';

interface FileItem {
  id: string;
  name: string;
  type: string;
}

const FileContextMenu =  React.memo(({ item, onClose, onItemRemoved }: { item: FileItem, onClose: () => void , onItemRemoved: () => void;}) => {
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [newName, setNewName] = useState(item.name);
  // Remove logic, for now, just log it
  const handleRemove = async () => {
    console.log("Removing item: " + item.name);
    try {
      await removeItem(item); // Calling the remove function
      onClose(); // Close the context menu after removal
      onItemRemoved();
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const handleRename = async () => {
    try {
      console.log("Renaming file to", newName);
      // TODO: Call your rename service here
      await renameItem(item, newName); // Call your rename function
      setRenameModalVisible(false);
      onClose();
      onItemRemoved()
    } catch (error) {
      console.error('handleRename error:', error);
    }
  };

 
  return (
    <>
    {!renameModalVisible ? (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.fileName}>{item.name}</Text>
              <Pressable style={styles.renameButton} onPress={() => setRenameModalVisible(true)}>
                <Text style={styles.removeText}>Rename</Text>
              </Pressable>
              <Pressable style={styles.removeButton} onPress={handleRemove}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : (
        <Modal visible={true} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.renameContainer}>
              <Text style={styles.renameLabel}>Enter new name:</Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <Pressable style={styles.renameConfirm} onPress={handleRename}>
                  <Text style={styles.renameText}>Confirm</Text>
                </Pressable>
                <Pressable
                  style={styles.renameCancel}
                  onPress={() => setRenameModalVisible(false)}
                >
                  <Text style={styles.renameText}>Back</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: 200,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  fileName: {
    fontSize: 16,
    marginBottom: 10,
  },
  removeButton: {
    padding: 10,
    backgroundColor: '#FF6347',
    borderRadius: 5,
    marginBottom: 10,
  },
  removeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    backgroundColor: '#007BFF',
    borderRadius: 5,
  },
  closeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  renameContainer: {
    width: 250,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  renameButton: {
    padding: 10,
    backgroundColor: '#4CAF50', // green
    borderRadius: 5,
    marginBottom: 10,
  },
  renameLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    width: '100%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 5,
  },
  renameConfirm: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  renameCancel: {
    backgroundColor: '#FF6347',
    padding: 10,
    borderRadius: 5,
  },
  renameText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default FileContextMenu;
