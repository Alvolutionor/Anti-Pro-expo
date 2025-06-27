// App.js
import React, { useEffect, useRef, useState } from "react";
import DeviceInfo from "react-native-device-info";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  Alert,
  Dimensions,
  Animated,
  DimensionValue,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";
import Swiper from "react-native-swiper";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { SwipeListView } from "react-native-swipe-list-view";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
// import { ScrollView } from "react-native-reanimated/lib/typescript/Animated";

const genMockTimeblock = () => {
  return {
    id: 4,
    goal: 1,
    name: "Task5",
    startTime: new Date(2025, 5, 8, 9, 0),
    endTime: new Date(2025, 5, 8, 10, 0),
    event: "上课",
    details: {
      loc: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      desc: "fruit",
    },
    completed: null,
  };
};

const mockEventTags = ["Meeting", "Workout", "Study", "Shopping", "Other"];

const mockTasks = [
  {
    id: 1,
    goal: 1,
    date: "2025-5-9",
    name: "Morning Meeting",
    startTime: new Date(2025, 4, 9, 9, 0), // 确保是 Date 对象
    endTime: new Date(2025, 4, 9, 11, 0), // 确保是 Date 对象
    tag: "Meeting",
    details: {
      loc: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      desc: "Discuss project updates",
    },
    completed: null,
  },
  {
    id: 2,
    goal: 1,
    date: "2025-10-15",
    name: "Team Lunch",
    startTime: new Date(2025, 4, 9, 12, 0),
    endTime: new Date(2025, 4, 9, 13, 0),
    tag: "Shopping", // 从标签中选择
    details: {
      loc: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      desc: "Team bonding lunch",
      subs: [],
    },
    completed: null,
    next: 4,
    dayPoints: 10,
    priority: 1,
    belongTo: 1,
  },
  {
    id: 3,
    goal: 2,
    date: "2025-10-15",
    name: "Study Session",
    startTime: new Date(2025, 4, 9, 14, 0),
    endTime: new Date(2025, 4, 9, 16, 0),
    tag: "Study", // 从标签中选择
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "Prepare for exams",
      subs: [],
    },
    completed: null,
    next: 4,
    dayPoints: 10,
    priority: 1,
    belongTo: 1,
  },
];
const convertTimeToMinutes = (date) => {
  return date.getHours() * 60 + date.getMinutes();
};

const parseTaskDates = (tasks) => {
  return tasks.map((task) => ({
    ...task,
    startTime: new Date(task.startTime), // 确保是 Date 对象
    endTime: new Date(task.endTime), // 确保是 Date 对象
  }));
};

//
const ScheduleScreen = ({}) => {
  const [scheduleData, setScheduleData] = useState(
    parseTaskDates(
      mockTasks.filter((task) => {
        const today = new Date();
        return (
          task.startTime.getDate() === today.getDate() &&
          task.startTime.getMonth() === today.getMonth() &&
          task.startTime.getFullYear() === today.getFullYear()
        );
      })
    ).map((item) => ({
      ...item,
      fold: true,
      editNDelete: false,
    }))
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskEvent, setNewTaskEvent] = useState("");
  const [newTaskStartTime, setNewTaskStartTime] = useState("");
  const [newTaskEndTime, setNewTaskEndTime] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [details, setDetails] = useState([{ key: "desc", value: "" }]); // 新增的状态
  const [showMoreFields, setShowMoreFields] = useState(false); // 控制 More 按钮的显示状态

  const addToScheduleData = (timeBlock) => {
    const newData = [
      ...scheduleData,
      {
        ...timeBlock,
        startTime: new Date(timeBlock.startTime), // 确保是 Date 对象
        endTime: new Date(timeBlock.endTime), // 确保是 Date 对象
        fold: false,
        editNDelete: false,
      },
    ];
    newData.sort(
      (a, b) =>
        a.startTime - b.startTime + 0.0001 * Math.sign(a.endTime - b.endTime)
    );
    setScheduleData(newData);
  };
  const deleteFromScheduleData = (id) => {
    const newData = [...scheduleData].filter((item) => item.id !== id);
    newData.sort(
      (a, b) =>
        convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime)
    );
    setScheduleData(newData);
  };
  const changeScheduleData = (id, property, value) => {
    const newData = [...scheduleData];
    const index = newData.findIndex((item) => item.id === id);
    if (index === -1) {
      return;
    }
    newData[index] = { ...newData[index], [property]: value };
    newData.sort(
      (a, b) =>
        convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime)
    );
    setScheduleData(newData);
  };
  function calculateTimeProgress(currentTime, startTime, endTime) {
    // 转换为时间戳（毫秒）
    const start = startTime.getTime();
    const end = endTime.getTime();
    const current = currentTime.getTime();
    // 处理异常时间范围
    if (start >= end) {
      return current >= start ? 1 : 0; // 无效时间段视为已结束或未开始
    }

    // 边界判断
    if (current <= start) return 0;
    if (current >= end) return 1;

    // 计算比例
    const totalDuration = end - start;
    const elapsedTime = current - start;
    return elapsedTime / totalDuration;
  }
  const renderTimeBlock = ({ item }) => {
    return (
      <Pressable
        style={[styles.timeBlock, { backgroundColor: "#DEF3FD" }]} //
        onPress={() => {
          changeScheduleData(item.id, "fold", !item.fold);
        }}
        onLongPress={() => {
          changeScheduleData(item.id, "editNDelete", !item.editNDelete);
        }}
      >
        <View style={{ borderRadius: 10 }}>
          <View
            style={{
              borderRadius: 10,
              overflow: "hidden",
              marginTop: 20,
              marginLeft: 20,
              marginRight: 20,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {/* 显示时间范围 */}
              <Text style={styles.timeText}>
                {item.startTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}{" "}
                -{" "}
                {item.endTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </Text>

              {/* 显示任务名称 */}
              <Text style={styles.taskNameText}>{item.name}</Text>
            </View>

            {!item.fold && (
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                {/* 显示描述 */}
                <Text style={styles.eventText}>{item.details.description}</Text>
              </View>
            )}
          </View>
        </View>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: Math.min(Math.max((new Date() - item.startTime) / (item.endTime - item.startTime) * 100, 0), 100) + "%",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
        </View>
      </Pressable>
    );
  };
  const SWIPETHRESHOLD = 0.4 * Dimensions.get("window").width;
  const PERSISTENCE_DURATION = 200;
  const renderSwipeItem = ({ item, index }) => {
    return (
      <View
        style={{
          alignItems: "flex-end",
          flexDirection: "row-reverse",
          height: "78",
        }}
      >
        <Pressable
          style={{
            borderRadius: 10,
            backgroundColor: "red",
            marginLeft: 10,
            justifyContent: "center",
            height: "100%", // 容器高度
          }}
        ></Pressable>
        <Pressable
          style={{
            borderRadius: 10,
            backgroundColor: "green",
            marginRight: 10,
            justifyContent: "center",
            height: "100%", // 容器高度
          }}
        ></Pressable>
      </View>
    );
  };

  const resetModalFields = () => {
    setNewTaskName("");
    setNewTaskEvent("");
    setNewTaskStartTime("");
    setNewTaskEndTime("");
    setNewTaskDescription("");
    setDetails([{ key: "desc", value: "" }]);
  };

  return (
    <View style={styles.screen}>
      <View>
        <View style={{ flexDirection: "row", width: "100%" }}>
          <Text style={styles.screenTitle}>今日日程</Text>
          <Pressable
            style={[
              styles.OpenaddTaskButtonModal,
              styles.buttonOpen,
              styles.buttonAlignRight,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.textStyle}>+</Text>
          </Pressable>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            if (Keyboard.isVisible()) {
              Keyboard.dismiss(); // 如果键盘可见，关闭键盘
            } else {
              setModalVisible(false); // 如果键盘不可见，关闭 Modal
            }
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (showStartTimePicker || showEndTimePicker || showEventPicker) {
                setShowStartTimePicker(false); // 关闭 Start Time Picker
                setShowEndTimePicker(false); // 关闭 End Time Picker
                setShowEventPicker(false); // 关闭 Tag Picker
                return 
              }
              else {
                setModalVisible(false); // 关闭 Modal
              }
            }}
          >
            <View style={styles.centeredView}>
              <TouchableWithoutFeedback
                onPress={() => {
                  if (showStartTimePicker || showEndTimePicker || showEventPicker) {
                    Keyboard.dismiss(); // 点击屏幕其他位置关闭键盘
                    setShowStartTimePicker(false); // 关闭 Start Time Picker
                    setShowEndTimePicker(false); // 关闭 End Time Picker
                    setShowEventPicker(false); // 关闭 Tag Picker
                  }

                  // 阻止点击 Modal 内部关闭 Modal
                }}
              >
                <View style={styles.modalView}>
                  <ScrollView
                    removeClippedSubviews={true}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingBottom: 20, // 添加额外的内边距
                    }}
                  >
                    <Text style={styles.modalTitle}>Add New Task</Text>

                    {/* Task Name Input */}
                    <TextInput
                      style={styles.input}
                      placeholder="Task Name (Required)"
                      value={newTaskName}
                      onChangeText={setNewTaskName}
                      onFocus={() => {
                        setShowStartTimePicker(false);
                        setShowEndTimePicker(false);
                        setShowEventPicker(false);
                      }}
                    />

                    {/* Start Time Picker */}
                    <View style={styles.dateTimeContainer}>
                      <Text style={styles.label}>Start Time</Text>
                      <TouchableOpacity
                        style={styles.dateTimePicker}
                        onPress={() => {
                          setShowStartTimePicker(!showStartTimePicker); // 切换 Start Time Picker 的显示状态
                          setShowEndTimePicker(false); // 关闭其他 Picker
                          setShowEventPicker(false); // 关闭其他 Picker
                          Keyboard.dismiss(); // 关闭键盘
                        }}
                      >
                        <Text style={styles.dateTimeText}>
                          {newTaskStartTime
                            ? new Date(newTaskStartTime).toLocaleString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                }
                              )
                            : "Select Start Time"}
                        </Text>
                      </TouchableOpacity>
                      {showStartTimePicker && (
                        <DateTimePicker
                          value={newTaskStartTime ? new Date(newTaskStartTime) : new Date()}
                          mode="datetime"
                          display="spinner"
                          onChange={(event, selectedDate) => {
                            if (selectedDate) {
                              setNewTaskStartTime(selectedDate.toISOString());
                            }
                          }}
                        />
                      )}
                    </View>



                    {/* More Button */}
                    <Pressable
                      style={styles.moreButton}
                      onPress={() => setShowMoreFields(!showMoreFields)} // 切换 More 按钮的显示状态
                    >
                      <Text style={styles.moreButtonText}>
                        {showMoreFields ? "Hide More" : "More"}
                      </Text>
                    </Pressable>

                    {/* Optional Fields */}
                    {showMoreFields && (
                      <>
                        {/* End Time Picker */}
                        <View style={styles.dateTimeContainer}>
                          <Text style={styles.label}>End Time (Optional)</Text>
                          <TouchableOpacity
                            style={[
                              styles.dateTimePicker,
                              !newTaskStartTime && { backgroundColor: "#ddd" }, // 禁用时改变背景色
                            ]}
                            onPress={() => {
                              if (!newTaskStartTime) {
                                Alert.alert("Error", "Please select Start Time first.");
                                return;
                              }
                              setShowEndTimePicker(!showEndTimePicker); // 切换 End Time Picker 的显示状态
                              setShowStartTimePicker(false); // 关闭其他 Picker
                              setShowEventPicker(false); // 关闭其他 Picker
                              Keyboard.dismiss(); // 关闭键盘
                            }}
                            disabled={!newTaskStartTime} // 禁用按钮
                          >
                            <Text style={styles.dateTimeText}>
                              {newTaskEndTime
                                ? new Date(newTaskEndTime).toLocaleString("en-US", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                  })
                                : "Select End Time"}
                            </Text>
                          </TouchableOpacity>
                          {showEndTimePicker && (
                            <DateTimePicker
                              value={newTaskEndTime ? new Date(newTaskEndTime) : new Date()}
                              mode="datetime"
                              display="spinner"
                              minimumDate={newTaskStartTime ? new Date(newTaskStartTime) : undefined} // 设置最小值
                              onChange={(event, selectedDate) => {
                                if (selectedDate) {
                                  setNewTaskEndTime(selectedDate.toISOString());
                                }
                              }}
                            />
                          )}
                        </View>

                        {/* Tag Picker */}
                        <View style={styles.dateTimeContainer}>
                          <Text style={styles.label}>Tag (Optional)</Text>
                          <TouchableOpacity
                            style={[styles.dateTimePicker, styles.tagPicker]}
                            onPress={() => {
                              setShowEventPicker(!showEventPicker); // 切换 Tag Picker 的显示状态
                              setShowStartTimePicker(false); // 关闭其他 Picker
                              setShowEndTimePicker(false); // 关闭其他 Picker
                              Keyboard.dismiss(); // 关闭键盘
                            }}
                          >
                            <Text style={styles.dateTimeText}>
                              {newTaskEvent || "Select a Tag"}
                            </Text>
                            <AntDesign name="down" size={16} color="#555" />
                          </TouchableOpacity>
                          {showEventPicker && (
                            <View style={styles.eventPicker}>
                              {mockEventTags.map((tag, index) => (
                                <TouchableOpacity
                                  key={index}
                                  style={styles.eventTag}
                                  onPress={() => {
                                    setNewTaskEvent(tag);
                                    setShowEventPicker(false); // 关闭 Tag Picker
                                  }}
                                >
                                  <Text style={styles.eventTagText}>{tag}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        </View>

                        {/* Details Section */}
                        <View style={styles.detailContainer}>
                          <Text style={styles.label}>Details</Text>
                          {details.map((detail, index) => (
                            <View key={index} style={styles.detailRow}>
                              <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => {
                                  const updatedDetails = [...details];
                                  updatedDetails[index].showDropdown =
                                    !updatedDetails[index].showDropdown;
                                  setDetails(updatedDetails);
                                }}
                              >
                                <Text style={styles.dropdownText}>
                                  {detail.key || "Select Attribute"}
                                </Text>
                                <AntDesign name="down" size={16} color="#555" />
                              </TouchableOpacity>
                              {detail.showDropdown && (
                                <View style={styles.dropdownMenu}>
                                  {availableAttributes.map((attr, idx) => (
                                    <TouchableOpacity
                                      key={idx}
                                      style={styles.dropdownItem}
                                      onPress={() => {
                                        const updatedDetails = [...details];
                                        updatedDetails[index].key = attr;
                                        updatedDetails[index].showDropdown = false;
                                        setDetails(updatedDetails);
                                      }}
                                    >
                                      <Text style={styles.dropdownItemText}>
                                        {attr}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
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
                            </View>
                          ))}
                          <Pressable
                            style={styles.addDetailButton}
                            onPress={() => {
                              setDetails([
                                ...details,
                                { key: "", value: "", showDropdown: false },
                              ]);
                            }}
                          >
                            <Text style={styles.addDetailButtonText}>
                              + Add Detail
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}

                    {/* Add Task Button */}
                    <Pressable
                      style={[styles.button, styles.addButton]}
                      onPress={() => {
                        if (!newTaskName.trim()) {
                          Alert.alert("Error", "Task name cannot be empty.");
                          return;
                        }

                        if (!newTaskStartTime) {
                          Alert.alert("Error", "Start time must be selected.");
                          return;
                        }

                        const startTime = new Date(newTaskStartTime);
                        const endTime = newTaskEndTime
                          ? new Date(newTaskEndTime)
                          : new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 23, 59); // 默认当天结束

                        const newTask = {
                          id: scheduleData.length + 1,
                          goal: 1,
                          name: newTaskName,
                          startTime: startTime.toISOString(),
                          endTime: endTime.toISOString(),
                          tag: mockEventTags.includes(newTaskEvent)
                            ? newTaskEvent
                            : "Untagged",
                          details: details.reduce((acc, detail) => {
                            acc[detail.key] = detail.value;
                            return acc;
                          }, {}),
                          completed: null,
                        };

                        addToScheduleData(newTask);
                        resetModalFields();
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.buttonText}>Add Task</Text>
                    </Pressable>

                    {/* Close Modal Button */}
                    <Pressable
                      style={[styles.button, styles.closeButton]}
                      onPress={() => {
                        resetModalFields();
                        setModalVisible(false);
                      }}
                    >
                      <Text style={styles.buttonText}>Close</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
      <Text style={styles.screenTitle}>Tasks TODO</Text>

      <SwipeListView
        data={scheduleData.filter((item) => item.completed === null)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        // rightOpenValue={-120}
        keyExtractor={(item) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", true);
          }, PERSISTENCE_DURATION);
        }}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", false);
          }, PERSISTENCE_DURATION);
        }}
      />

      <Text style={styles.screenTitle}>Tasks Completed</Text>

      <SwipeListView
        data={scheduleData.filter((item) => item.completed)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item) => item.id}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", false);
          }, PERSISTENCE_DURATION);
        }}
      />
      <Text style={styles.screenTitle}>Tasks Not Done</Text>

      <SwipeListView
        data={scheduleData.filter((item) => item.completed === false)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", true);
          }, PERSISTENCE_DURATION);
        }}
      />
    </View>
  );
};
// 日历屏幕
export default function App() {
  // const [scheduleData, setScheduleData] = useState(mockTasks);

  const [markedDates, setMarkedDates] = useState({
    "2025-03-20": {
      periods: [{ startingDay: true, endingDay: true, color: "#4a90e2" }],
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScheduleScreen />
      {/* <Swiper loop={false} showsPagination={false}>
        <CalendarScreen markedDates={markedDates} />
        <GoalScreen />
      </Swiper> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  screen: {
    flex: 1,
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // 半透明背景
  },
  modalView: {
    maxHeight: "80%",

    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    // alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: "scroll",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  dateTimeContainer: {
    width: "100%",
    marginBottom: 15,
  },
  dateTimePicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  tagPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventPicker: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    zIndex: 1000,
  },
  eventTag: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  eventTagText: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  button: {
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonAlignRight: {
    marginLeft: "auto",
  },
  addButton: {
    backgroundColor: "#4CAF50",
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  closeButton: {
    backgroundColor: "#FF6347",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  OpenaddTaskButtonModal: {
    backgroundColor: "#4CAF50",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  },
  addTaskButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  timeBlock: {
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timeText: {
    fontSize: 16,
    color: "#666",
  },
  eventText: {
    fontSize: 14,
    color: "#333",
  },
  aiMessage: {
    backgroundColor: "#e3f2fd",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    alignSelf: "flex-start",
    maxWidth: "80%",
  },
  userMessage: {
    backgroundColor: "#4a90e2",
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    alignSelf: "flex-end",
    maxWidth: "80%",
  },
  messageText: {
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#fff",
  },
  voiceButton: {
    backgroundColor: "#4a90e2",
    borderRadius: 30,
    padding: 15,
    marginLeft: 10,
  },
  pickerContainer: {
    width: "100%",
    marginBottom: 15,
  },
  picker: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  dateTimeContainer: {
    width: "100%",
    marginBottom: 15,
  },
  dateTimePicker: {
    height: 50,
    justifyContent: "center",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  dateTimeText: {
    fontSize: 16,
    color: "#333",
  },
  eventPicker: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    zIndex: 1000,
  },
  eventTag: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  eventTagText: {
    fontSize: 16,
    color: "#333",
  },
  detailContainer: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  dropdown: {
    width: "30%",
    height:40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    marginRight: 10,
  },
  dropdownText: {
    fontSize: 14,
    
    color: "#333",
  },
  dropdownMenu: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 10,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },
  detailValueInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 16, // 确保字体大小一致
    height: 80, // 保持固定高度
  },
  addDetailButton: {
    width:"30%", // 与输入框对齐
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
  },
  addDetailButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  moreButton: {
    width: "100%",
    marginTop: 10,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#FFA500", // 使用橙色区分
    alignItems: "center",
  },
  moreButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

const availableAttributes = ["desc", "loc", "prio", "stat"];
