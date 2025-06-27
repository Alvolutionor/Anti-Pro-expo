// App.js
import React, { useEffect, useState, useRef } from "react";
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
import { useSelector, TypedUseSelectorHook } from "react-redux";
import { RootState } from "../store/store";
import { Platform } from "react-native";
import { scheduleTaskNotification as utilScheduleTaskNotification } from '../utils/notifications';
import { getTags } from '../utils/api';
import {TaskModal} from './AddTaskModal';

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
  const goals = useSelector((state: RootState) => state.goal.goals);
  const [selectedGoalId, setSelectedGoalId] = useState<number | undefined>(
    undefined
  );
  // 替换原有下拉状态
  const [openDropdown, setOpenDropdown] = useState<null | string>(null);

  // Scheduled 相关选项
  const SCHEDULED_OPTIONS = [
    { label: "Periodic", value: "periodic" },
    { label: "Finished By", value: "finishedby" },
    { label: "One-time", value: "onetime" },
  ];

  const [newTaskScheduled, setNewTaskScheduled] = useState("onetime");
  // 统一 scheduledParam 结构为对象
  const [newTaskScheduledParam, setNewTaskScheduledParam] = useState<any>({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
  const [openScheduled, setOpenScheduled] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [tagList, setTagList] = useState<{ id: number; name: string; color?: string }[]>([]);

  const addToScheduleData = (timeBlock: ScheduleTask) => {
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
    scheduleTaskNotification(timeBlock);
  };
  const deleteFromScheduleData = (id: number) => {
    const newData = [...scheduleData].filter((item) => item.id !== id);
    newData.sort(
      (a, b) =>
        convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime)
    );
    setScheduleData(newData);
  };
  const changeScheduleData = (id: number, property: string, value: any) => {
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

  function calculateTimeProgress(currentTime: number, startTime: number, endTime: number) {
    const start = startTime;
    const end = endTime;
    const current = currentTime;
    if (end <= start) return 0;
    if (current <= start) return 0;
    if (current >= end) return 1;
    return (current - start) / (end - start);
  }
  const renderTimeBlock = ({ item }: { item: any }) => {
    return (
      <Pressable
        style={[styles.timeBlock, { backgroundColor: "#DEF3FD" }]}
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
                })} {" "}-{" "}
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
                  alignItems: "center",
                }}
              >
                {/* 显示描述 */}
                <Text style={styles.eventText}>{item.details.description}</Text>
                {/* Move to TODO 按钮，仅在 completed 为 true 或 false 时显示 */}
                {(item.completed === true || item.completed === false) && (
                  <Pressable
                    style={{
                      backgroundColor: "#FFA500",
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                      marginLeft: 10,
                    }}
                    onPress={() => changeScheduleData(item.id, "completed", null)}
                  >
                    <Text style={{ color: "#fff", fontWeight: "bold" }}>Move to TODO</Text>
                  </Pressable>
                )}
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
            width: '100%', // 用 Dimensions.get('window').width 更安全
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        ></View>
      </Pressable>
    );
  };
  const SWIPETHRESHOLD = 0.4 * Dimensions.get("window").width;
  const PERSISTENCE_DURATION = 200;
  const renderSwipeItem = ({ item, index }: { item: ScheduleTask; index: number }) => {
    return (
      <View
        style={{
          alignItems: 'flex-end',
          flexDirection: 'row-reverse',
          height: 78, // 改为数字
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
    setDetails([{ key: "", value: "" }]);
    setSelectedGoalId(undefined);
    setNewTaskScheduled("onetime");
    setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    setOpenScheduled(false);
    setShowDatePicker(false);
  };

  // 拉取 tag 列表
  useEffect(() => {
    getTags().then(res => {
      if (res && res.data) {
        setTagList(res.data);
      }
    }).catch(() => {
      setTagList([]); // 失败兜底
    });
  }, []);

  return (
    <View style={styles.screen}>
      <View>
        <View style={{ flexDirection: "row", width: "100%" }}>
          <Text style={styles.screenTitle}>今日日程</Text>
        </View>
      <TaskModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        newTaskName={newTaskName}
        setNewTaskName={setNewTaskName}
        newTaskEvent={newTaskEvent}
        setNewTaskEvent={setNewTaskEvent}
        newTaskStartTime={newTaskStartTime}
        setNewTaskStartTime={setNewTaskStartTime}
        newTaskEndTime={newTaskEndTime}
        setNewTaskEndTime={setNewTaskEndTime}
        newTaskDescription={newTaskDescription}
        setNewTaskDescription={setNewTaskDescription}
        showEventPicker={showEventPicker}
        setShowEventPicker={setShowEventPicker}
        showStartTimePicker={showStartTimePicker}
        setShowStartTimePicker={setShowStartTimePicker}
        showEndTimePicker={showEndTimePicker}
        setShowEndTimePicker={setShowEndTimePicker}
        showStartDatePicker={showStartDatePicker}
        setShowStartDatePicker={setShowStartDatePicker}
        details={details}
        setDetails={setDetails}
        showMoreFields={showMoreFields}
        setShowMoreFields={setShowMoreFields}
        goals={goals}
        selectedGoalId={selectedGoalId}
        setSelectedGoalId={setSelectedGoalId}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        scheduledOptions={SCHEDULED_OPTIONS}
        newTaskScheduled={newTaskScheduled}
        setNewTaskScheduled={setNewTaskScheduled}
        newTaskScheduledParam={newTaskScheduledParam}
        setNewTaskScheduledParam={setNewTaskScheduledParam}
        openScheduled={openScheduled}
        setOpenScheduled={setOpenScheduled}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        scrollViewRef={scrollViewRef}
        tagList={tagList}
        addToScheduleData={addToScheduleData}
        resetModalFields={resetModalFields}
      />
      </View>
      <Text style={styles.screenTitle}>Tasks TODO</Text>

      <SwipeListView
        data={scheduleData.filter((item: any) => item.completed === null)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(Number(rowData.key), "completed", true);
          });
        }}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(Number(rowData.key), "completed", false);
          });
        }}
      />

      <Text style={styles.screenTitle}>Tasks Completed</Text>

      <SwipeListView
        data={scheduleData.filter((item: any) => item.completed)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => item.id}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(rowData.key, "completed", false);
          });
        }}
      />
      <Text style={styles.screenTitle}>Tasks Not Done</Text>

      <SwipeListView
        data={scheduleData.filter((item: any) => item.completed === false)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(rowData.key, "completed", true);
          });
        }}
      />

      {/* Add Task Floating Button - 优化尺寸 */}
      <TouchableOpacity
        style={styles.fabSmall}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={22} color="#fff" />
        <Text style={styles.fabTextSmall}>Add Task</Text>
      </TouchableOpacity>
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
    width: "100%",
    alignSelf: "stretch",
    textAlign: "left",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    maxHeight: "80%",
    width: "90%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
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
    height: 50,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#333",
  },
  tagPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  detailContainer: {
    width: "100%",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 8,
  },
  detailPickerTouchable: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f8f8f8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    width: "100%",
  },
  detailPickerDropdown: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbb",
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 100,
    position: "absolute",
    left: 0,
    right: 0,
    width: "100%",
  },
  detailPickerOption: {
    paddingVertical: 14, // 统一上下内边距
    paddingHorizontal: 18, // 统一左右内边距
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
  },
  detailValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginLeft: 0,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  deleteDetailButton: {
    marginLeft: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  addDetailButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    backgroundColor: "#eaf2fb",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addDetailButtonText: {
    color: "#007bff",
    fontWeight: "bold",
    fontSize: 15,
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
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 10,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 22,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 100,
  },
  fabSmall: {
    position: "absolute",
    right: 20,
    bottom: 28,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    zIndex: 100,
  },
  fabText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  fabTextSmall: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 7,
    letterSpacing: 0.5,
  },
});

// 顶部添加类型定义
interface ScheduleTask {
  id: number;
  goal: number;
  name: string;
  startTime: string;
  endTime: string;
  tag: string;
  details: Record<string, any>;
  goalId: number;
  completed: boolean | null;
  scheduled: string;
  scheduledParam: any;
}

// 占位：任务提醒/推送函数，防止未定义报错
const scheduleTaskNotification = (task: any) => {
  // 调用 util/notifications.ts 中的实现
  utilScheduleTaskNotification({
    name: task.name,
    startTime: task.startTime,
  });
};

const availableAttributes = ["desc", "loc", "prio", "stat"];
