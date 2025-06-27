import React, { useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AntDesign from '@expo/vector-icons/AntDesign';

const availableAttributes = ['desc', 'loc', 'prio', 'stat'];

export const TaskModal = ({
  visible,
  onClose,
  scrollViewRef,
  showStartTimePicker,
  setShowStartTimePicker,
  showEndTimePicker,
  setShowEndTimePicker,
  newTaskName,
  setNewTaskName,
  newTaskStartTime,
  setNewTaskStartTime,
  newTaskEndTime,
  setNewTaskEndTime,
  showMoreFields,
  setShowMoreFields,
  openDropdown,
  setOpenDropdown,
  SCHEDULED_OPTIONS,
  newTaskScheduled,
  setNewTaskScheduled,
  newTaskScheduledParam,
  setNewTaskScheduledParam,
  showDatePicker,
  setShowDatePicker,
  selectedGoalId,
  setSelectedGoalId,
  goals,
  tagList,
  newTaskEvent,
  setNewTaskEvent,
  details,
  setDetails,
  onAddTask,
  resetModalFields,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (Keyboard.isVisible()) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}
      >
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback onPress={() => setOpenDropdown(null)}>
            <View style={styles.modalView}>
              <ScrollView
                ref={scrollViewRef}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <Text style={styles.modalTitle}>Add New Task</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Task Name (e.g. Read a book)"
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  maxLength={40}
                />

                <View style={styles.dateTimeContainer}>
                  <Text style={styles.label}>Start Time</Text>
                  <TouchableOpacity
                    style={styles.dateTimePicker}
                    onPress={() => {
                      setShowStartTimePicker(!showStartTimePicker);
                      setShowEndTimePicker(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.dateTimeText}>
                      {newTaskStartTime
                        ? new Date(newTaskStartTime).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        : 'Select Start Time'}
                    </Text>
                  </TouchableOpacity>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={
                        newTaskStartTime ? new Date(newTaskStartTime) : new Date()
                      }
                      mode="datetime"
                      display="spinner"
                      maximumDate={
                        newTaskEndTime ? new Date(newTaskEndTime) : undefined
                      }
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setNewTaskStartTime(selectedDate.toISOString());
                          if (
                            newTaskEndTime &&
                            new Date(selectedDate) > new Date(newTaskEndTime)
                          ) {
                            setNewTaskEndTime(selectedDate.toISOString());
                          }
                        }
                      }}
                    />
                  )}
                </View>

                <View style={styles.dateTimeContainer}>
                  <Text style={styles.label}>End Time</Text>
                  <TouchableOpacity
                    style={styles.dateTimePicker}
                    onPress={() => {
                      setShowEndTimePicker(!showEndTimePicker);
                      setShowStartTimePicker(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <Text style={styles.dateTimeText}>
                      {newTaskEndTime
                        ? new Date(newTaskEndTime).toLocaleString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })
                        : 'Select End Time'}
                    </Text>
                  </TouchableOpacity>
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={
                        newTaskEndTime ? new Date(newTaskEndTime) : new Date()
                      }
                      mode="datetime"
                      display="spinner"
                      minimumDate={
                        newTaskStartTime ? new Date(newTaskStartTime) : undefined
                      }
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          setNewTaskEndTime(selectedDate.toISOString());
                        }
                      }}
                    />
                  )}
                </View>

                <View style={styles.detailContainer}>
                  <Text style={styles.label}>Details</Text>
                  {details.map((detail, index) => (
                    <View key={index} style={styles.detailRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <TouchableOpacity
                          style={styles.detailPickerTouchable}
                          onPress={() =>
                            setOpenDropdown(
                              openDropdown === `detail-${index}` ? null : `detail-${index}`
                            )
                          }
                        >
                          <Text style={{ color: detail.key ? '#222' : '#888' }}>
                            {detail.key || 'Select Attribute'}
                          </Text>
                          <AntDesign name="down" size={16} color="#555" />
                        </TouchableOpacity>
                        {openDropdown === `detail-${index}` && (
                          <View style={styles.detailPickerDropdown}>
                            {availableAttributes.map((attr) => (
                              <TouchableOpacity
                                key={attr}
                                style={styles.detailPickerOption}
                                onPress={() => {
                                  const updatedDetails = [...details];
                                  updatedDetails[index].key = attr;
                                  setDetails(updatedDetails);
                                  setOpenDropdown(null);
                                }}
                              >
                                <Text style={{ color: '#222' }}>{attr}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                      <TextInput
                        style={styles.detailValueInput}
                        placeholder="Enter value"
                        value={detail.value}
                        onChangeText={(text) => {
                          const updatedDetails = [...details];
                          updatedDetails[index].value = text;
                          setDetails(updatedDetails);
                        }}
                      />
                      <TouchableOpacity
                        style={styles.deleteDetailButton}
                        onPress={() => {
                          setDetails(details.filter((_, i) => i !== index));
                        }}
                      >
                        <AntDesign name="closecircleo" size={22} color="#bbb" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <Pressable
                    style={styles.addDetailButton}
                    onPress={() => {
                      setDetails([...details, { key: '', value: '' }]);
                    }}
                  >
                    <Text style={styles.addDetailButtonText}>+ Add Detail</Text>
                  </Pressable>
                </View>

                <View style={styles.buttonRow}>
                  <Pressable
                    style={[styles.button, styles.addButton, { flex: 1, marginRight: 8 }]}
                    onPress={onAddTask}
                  >
                    <Text style={styles.buttonText}>Add Task</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.moreButton, { flex: 1 }]}
                    onPress={() => setShowMoreFields(!showMoreFields)}
                  >
                    <Text style={styles.moreButtonText}>
                      {showMoreFields ? 'Hide More' : 'More'}
                    </Text>
                  </Pressable>
                </View>

                <TouchableOpacity
                  style={styles.closeIcon}
                  onPress={() => {
                    resetModalFields();
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 28, color: '#888' }}>×</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        maxHeight: '80%',
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'scroll',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    input: {
        width: '80%',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    dateTimeContainer: {
        width: '100%',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    dateTimePicker: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#f9f9f9',
        height: 50,
    },
    dateTimeText: {
        fontSize: 16,
        color: '#333',
    },
    detailContainer: {
        width: '100%',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#f7f7f7',
        borderRadius: 8,
        padding: 8,
    },
})