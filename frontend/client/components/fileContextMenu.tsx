import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Modal } from 'react-native';
import removeItem from '@/services/removeItem';

interface FileItem {
  id: string;
  name: string;
  type: string;
}

const FileContextMenu =  ({ item, onClose, onItemRemoved }: { item: FileItem, onClose: () => void , onItemRemoved: () => void;}) => {
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

  return (
    <Modal visible={true} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.fileName}>{item.name}</Text>
          <Pressable style={styles.removeButton} onPress={handleRemove}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
          <Pressable style={styles.closeButton} onPress={() => {onClose()}}>
            <Text style={styles.closeText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

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
});

export default FileContextMenu;
