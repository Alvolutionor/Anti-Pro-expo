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
import { RootState } from "../../store/store";
import { Platform } from "react-native";
import { scheduleTaskNotification as utilScheduleTaskNotification } from '../../utils/notifications';
import { getTags, createTask, getTasks, updateTask } from '../../utils/api';
import { useDispatch } from "react-redux";
import { setTasks } from "../../store/taskSlice";
import { LogBox } from 'react-native';

LogBox.ignoreLogs(['useInsertionEffect must not schedule updates']);// some issue with swiper package

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

// 统一解析任务的时间字段，兼容字符串/Date/null
const parseTaskDates = (tasks: any[]) => {
  return tasks.map((task) => {
    // 优先 scheduledParam
    let start = task.scheduledParam?.startTime || task.startTime;
    let end = task.scheduledParam?.endTime || task.endTime;
    // 兼容 undefined/null
    const safeDate = (d: any) => {
      if (!d) return null;
      if (d instanceof Date) return d;
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    };
    return {
      ...task,
      startTime: safeDate(start),
      endTime: safeDate(end),
    };
  });
};

//
const ScheduleScreen = ({}) => {
  const dispatch = useDispatch();
  const tasks = useSelector((state: RootState) => state.task.tasks);
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
  const [newTaskTags, setNewTaskTags] = useState<number[]>([]);
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
        startTime: timeBlock.startTime ? new Date(timeBlock.startTime) : null, // 确保是 Date 对象
        endTime: timeBlock.endTime ? new Date(timeBlock.endTime) : null, // 确保是 Date 对象
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
    // 兼容 startTime/endTime 可能为 null
    const start = item.startTime instanceof Date ? item.startTime : null;
    const end = item.endTime instanceof Date ? item.endTime : null;
    // 判断当前 item 是否属于 notDoneTasks
    const isNotDone = item.completed === false && end && end <= new Date();
    return (
      <Pressable
        style={[styles.timeBlock, { backgroundColor: "#DEF3FD" }]}
        onPress={() => {
          // 点击显示详细信息（展开）
          changeScheduleData(item.id, "fold", !item.fold);
        }}
        onLongPress={() => handleEditTask(item)}
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
                {start
                  ? start.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "--:--"} {" "}-{" "}
                {end
                  ? end.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })
                  : "--:--"}
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
                {/* 仅在 notDoneTasks 区域显示 Move to TODO 按钮 */}
                {isNotDone && (
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
            width:
              start && end && end > start
                ? Math.min(Math.max(((new Date() as any) - start) / (end - start) * Dimensions.get("window").width, 0), Dimensions.get("window").width)
                : 0,
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: 10,
            overflow: "hidden",
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
    setNewTaskTags([]);
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

  // 拉取 tag 列表和今日任务
  useEffect(() => {
    getTags().then(res => {
      if (res && res.data) {
        setTagList(res.data);
      }
    }).catch(() => {
      setTagList([]); // 失败兜底
    });
    // 拉取今天的任务并同步 redux
    // getTasks({ date: todayStr }) 改为 getTasks()，如需后端支持请实现 query
    getTasks().then(res => {
      if (res && res.data) {
        dispatch(setTasks(res.data));
      }
    });
  }, [dispatch]);

  // scheduleData 由 redux tasks 派生
  useEffect(() => {
    if (tasks && Array.isArray(tasks)) {
      // debug: 打印所有任务的 startTime
      console.log('所有tasks:', tasks.map(t => ({id: t.id, startTime: t.scheduledParam?.startTime || t.startTime, raw: t})));
      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();
      const todayTasks = tasks.filter((task: any) => {
        const start = task.scheduledParam?.startTime || task.startTime;
        if (!start) return false;
        const d = new Date(start);
        return (
          d.getFullYear() === todayYear &&
          d.getMonth() === todayMonth &&
          d.getDate() === todayDate
        );
      });
      // debug: 打印筛选后的当天任务
      console.log('筛选后todayTasks:', todayTasks.map(t => ({id: t.id, startTime: t.scheduledParam?.startTime || t.startTime})));
      setScheduleData(
        parseTaskDates(todayTasks).map((item: any) => ({
          ...item,
          fold: true,
          editNDelete: false,
        }))
      );
    }
  }, [tasks]);

  const handleTaskStatusChange = (id: number, completed: boolean | null) => {
    // 只 patch 状态
    updateTask(id, { completed })
      .then(() => getTasks())
      .then(res => {
        if (res && res.data) {
          dispatch(setTasks(res.data));
        }
      });
  };

  const now = new Date();
  // 修正：completed 只用 boolean
  const todoTasks = scheduleData.filter((item: any) => item.completed === false && item.endTime && item.endTime > now);
  const notDoneTasks = scheduleData.filter((item: any) => item.completed === false && item.endTime && item.endTime <= now);
  const completedTasks = scheduleData.filter((item: any) => item.completed === true);

  // 编辑任务时填充表单
  const handleEditTask = (task: ScheduleTask) => {
    setEditingTask(task);
    setNewTaskName(task.name);
    setNewTaskTags(task.tags || []);
    setNewTaskStartTime(task.startTime ? task.startTime.toISOString() : "");
    setNewTaskEndTime(task.endTime ? task.endTime.toISOString() : "");
    setNewTaskDescription(task.details?.desc || task.details?.description || "");
    setDetails(Object.entries(task.details || {}).map(([key, value]) => ({ key, value })));
    setSelectedGoalId(task.goalId);
    setNewTaskScheduled(task.scheduled || "onetime");
    setNewTaskScheduledParam(task.scheduledParam || { type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    setShowMoreFields(true);
    setModalVisible(true);
  };

  // 新增 editingTask 状态
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);

  return (
    <View style={styles.screen}>
      <View>
        <View style={{ flexDirection: "row", width: "100%" }}>
          <Text style={styles.screenTitle}>Agenda</Text>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            if (Keyboard.isVisible()) {
              Keyboard.dismiss();
            } else {
              setModalVisible(false);
              setOpenDropdown(null); // 关闭所有下拉
            }
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (showStartTimePicker || showEndTimePicker || showEventPicker) {
                setShowStartTimePicker(false);
                setShowEndTimePicker(false);
                setShowEventPicker(false);
                return;
              } else {
                setModalVisible(false);
                setOpenDropdown(null); // 关闭所有下拉
              }
            }}
          >
            <View style={styles.centeredView}>
              <TouchableWithoutFeedback
                onPress={() => {
                  setOpenDropdown(null); // 只关闭下拉，不关闭 Modal
                  if (
                    showStartTimePicker ||
                    showEndTimePicker ||
                    showEventPicker
                  ) {
                    Keyboard.dismiss();
                    setShowStartTimePicker(false);
                    setShowEndTimePicker(false);
                    setShowEventPicker(false);
                  }
                }}
              >
                <View style={styles.modalView}>
                  <ScrollView
                    ref={scrollViewRef}
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                    contentContainerStyle={{
                      flexGrow: 1,
                      justifyContent: "center",
                      alignItems: "center",
                      paddingBottom: 20,
                    }}
                  >
                    <Text style={styles.modalTitle} >Add New Task</Text>

                    {/* Task Name Input */}
                    <TextInput
                      style={styles.input}
                      placeholder="Task Name (e.g. Read a book)"
                      value={newTaskName}
                      onChangeText={setNewTaskName}
                      maxLength={40}
                      autoCapitalize="sentences"
                      onFocus={() => {
                        setShowStartTimePicker(false);
                        setShowEndTimePicker(false);
                        setShowEventPicker(false);
                      }}
                    />

                    {/* Start Time - 无论 More 是否展开都显示，且受 scheduled 类型控制 */}
                    {(!showMoreFields) && (
                      <View style={styles.dateTimeContainer} pointerEvents="box-none">
                        <Text style={styles.label} pointerEvents="none">Start Time</Text>
                        <TouchableOpacity
                          style={styles.dateTimePicker}
                          onPress={() => {
                            setShowStartTimePicker(!showStartTimePicker);
                            setShowEndTimePicker(false);
                            setShowEventPicker(false);
                            Keyboard.dismiss();
                          }}
                        >
                          <Text style={styles.dateTimeText}>
                            {newTaskStartTime
                              ? new Date(newTaskStartTime).toLocaleString("en-US", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                })
                              : (newTaskScheduled === "periodic"
                                  ? "Select Start Time (hh:mm)"
                                  : "Select Start Date & Time")}
                          </Text>
                        </TouchableOpacity>
                        {showStartTimePicker && (
                          <DateTimePicker
                            value={
                              newTaskStartTime
                                ? new Date(newTaskStartTime)
                                : new Date()
                            }
                            mode={newTaskScheduled === "periodic" ? "time" : "datetime"}
                            display="spinner"
                            maximumDate={newTaskEndTime && newTaskScheduled !== "periodic" ? new Date(newTaskEndTime) : undefined}
                            onChange={(event, selectedDate) => {
                              if (event.type === "set" && selectedDate) {
                                setNewTaskStartTime(selectedDate.toISOString());
                                if (newTaskEndTime && new Date(selectedDate) > new Date(newTaskEndTime)) {
                                  setNewTaskEndTime(selectedDate.toISOString());
                                }
                                setShowStartTimePicker(false); // 自动关闭并选中
                              } else if (event.type === "dismissed") {
                                setShowStartTimePicker(false); // 关闭但不选中
                              }
                            }}
                          />
                        )}
                      </View>
                    )}

                    {/* More 按钮展开后显示其余表单项 */}
                    {showMoreFields && (
                      <>
                        {/* Scheduled 下拉选择 - 统一下拉菜单风格 */}
                        <View style={{ marginBottom: 12 }}>
                          <Text style={styles.label}>Scheduled</Text>
                          <View>
                            <TouchableOpacity
                              style={styles.detailPickerTouchable}
                              onPress={() =>
                                setOpenDropdown(
                                  openDropdown === "scheduled" ? null : "scheduled"
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: newTaskScheduled ? "#222" : "#888" }}>
                                {SCHEDULED_OPTIONS.find(
                                  (opt) => opt.value === newTaskScheduled
                                )?.label || "(Select type)"}
                              </Text>
                              <AntDesign name="down" size={16} color="#555" />
                            </TouchableOpacity>
                            {openDropdown === "scheduled" && (
                              <View style={styles.detailPickerDropdown}>
                                {SCHEDULED_OPTIONS.map((opt) => (
                                  <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                      styles.detailPickerOption,
                                      newTaskScheduled === opt.value && {
                                        backgroundColor: "#e6f0ff",
                                      },
                                    ]}
                                    onPress={() => {
                                      setNewTaskScheduled(opt.value);
                                      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
                                      setShowDatePicker(false);
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    <Text style={{ color: "#222" }}>{opt.label}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>

                                                {/* Start Time - 默认 one-time 时和 periodic 时都显示（未展开 More 也显示） */}
                        {(!showMoreFields || newTaskScheduled === "onetime" || newTaskScheduled === "periodic") && (
                          <View style={styles.dateTimeContainer} pointerEvents="box-none">
                            <Text style={styles.label} pointerEvents="none">Start Time</Text>
                            <TouchableOpacity
                              style={styles.dateTimePicker}
                              onPress={() => {
                                setShowStartTimePicker(!showStartTimePicker);
                                setShowEndTimePicker(false);
                                setShowEventPicker(false);
                                Keyboard.dismiss();
                              }}
                            >
                              <Text style={styles.dateTimeText}>
                                {newTaskStartTime
                                  ? new Date(newTaskStartTime).toLocaleString("en-US", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    })
                                  : (newTaskScheduled === "periodic"
                                      ? "Select Start Time (hh:mm)"
                                      : "Select Start Date & Time")}
                              </Text>
                            </TouchableOpacity>
                            {showStartTimePicker && (
                              <DateTimePicker
                                value={
                                  newTaskStartTime
                                    ? new Date(newTaskStartTime)
                                    : new Date()
                                }
                                mode={newTaskScheduled === "periodic" ? "time" : "datetime"}
                                display="spinner"
                                maximumDate={newTaskEndTime && newTaskScheduled !== "periodic" ? new Date(newTaskEndTime) : undefined}
                                onChange={(event, selectedDate) => {
                                  if (event.type === "set" && selectedDate) {
                                    setNewTaskStartTime(selectedDate.toISOString());
                                    if (newTaskEndTime && new Date(selectedDate) > new Date(newTaskEndTime)) {
                                      setNewTaskEndTime(selectedDate.toISOString());
                                    }
                                    setShowStartTimePicker(false); // 自动关闭并选中
                                  } else if (event.type === "dismissed") {
                                    setShowStartTimePicker(false); // 关闭但不选中
                                  }
                                }}
                              />
                            )}
                          </View>
                        )}
                        

                        {/* End Time 只在 periodic 时显示，finishedby 为 datetime picker，periodic 为 time picker */}
                        {(newTaskScheduled === "periodic") && (
                          <View style={styles.dateTimeContainer} pointerEvents="box-none">
                            <Text style={styles.label} pointerEvents="none">End Time</Text>
                            <TouchableOpacity
                              style={styles.dateTimePicker}
                              onPress={() => {
                                setShowEndTimePicker(!showEndTimePicker);
                                setShowStartTimePicker(false);
                                setShowEventPicker(false);
                                Keyboard.dismiss();
                              }}
                            >
                              <Text style={styles.dateTimeText}>
                                {newTaskEndTime
                                  ? (newTaskScheduled === "periodic"
                                      ? new Date(newTaskEndTime).toLocaleTimeString(
                                          "en-US",
                                          {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                          }
                                        )
                                      : new Date(newTaskEndTime).toLocaleString(
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
                                    )
                                  : (newTaskScheduled === "periodic"
                                      ? "Select End Time (hh:mm)"
                                      : "Select End Date & Time")}
                              </Text>
                            </TouchableOpacity>
                            {showEndTimePicker && (
                              <DateTimePicker
                                value={
                                  newTaskEndTime
                                    ? new Date(newTaskEndTime)
                                    : new Date()
                                }
                                mode={newTaskScheduled === "periodic" ? "time" : "datetime"}
                                display="spinner"
                                minimumDate={endTimeMinimumDate}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    setNewTaskEndTime(selectedDate.toISOString());
                                  }
                                }}
                              />
                            )}
                          </View>
                        )}
                        {/* End Time - 只在 one-time/finishedby 时显示 */}
                        {showMoreFields && (newTaskScheduled === "onetime" || newTaskScheduled === "finishedby") && (
                          <View style={styles.dateTimeContainer} pointerEvents="box-none">
                            <Text style={styles.label} pointerEvents="none">End Time</Text>
                            <TouchableOpacity
                              style={styles.dateTimePicker}
                              onPress={() => {
                                setShowEndTimePicker(!showEndTimePicker);
                                setShowStartTimePicker(false);
                                setShowEventPicker(false);
                                Keyboard.dismiss();
                              }}
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
                                  : "Select End Date & Time"}
                              </Text>
                            </TouchableOpacity>
                            {showEndTimePicker && (
                              <DateTimePicker
                                value={
                                  newTaskEndTime
                                    ? new Date(newTaskEndTime)
                                    : (newTaskStartTime ? new Date(newTaskStartTime) : new Date())
                                }
                                mode="datetime"
                                display="spinner"
                                minimumDate={newTaskStartTime ? new Date(newTaskStartTime) : undefined}
                                maximumDate={(() => {
                                  if (newTaskScheduled === "onetime" && newTaskStartTime) {
                                    // 限制只能选同一天
                                    const start = new Date(newTaskStartTime);
                                    const max = new Date(start);
                                    max.setHours(23, 59, 59, 999);
                                    return max;
                                  }
                                  return undefined;
                                })()}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    // onetime 模式下，强制 endTime 日期与 startTime 相同
                                    if (newTaskScheduled === "onetime" && newTaskStartTime) {
                                      const start = new Date(newTaskStartTime);
                                      const end = new Date(selectedDate);
                                      end.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
                                      setNewTaskEndTime(end.toISOString());
                                    } else {
                                      setNewTaskEndTime(selectedDate.toISOString());
                                    }
                                  }
                                }}
                              />
                            )}
                          </View>
                        )}
                        {/* Frequency 只在 periodic 下，并且在 Start Time 之后 */}
                        {showMoreFields && newTaskScheduled === "periodic" && (
                          <View style={{ marginBottom: 12 }}>
                            <Text style={styles.label}>Frequency</Text>
                            <View>
                              <TouchableOpacity
                                style={styles.detailPickerTouchable}
                                onPress={() => {
                                  setOpenDropdown(openDropdown === "freq" ? null : "freq");
                                  setTimeout(() => {
                                    scrollViewRef.current?.scrollToEnd({ animated: true });
                                  }, 200);
                                }}
                                activeOpacity={0.8}
                              >
                                <Text style={{ color: newTaskScheduledParam.type ? "#222" : "#888" }}>
                                  {["daily", "weekly", "monthly", "yearly"].find(
                                    (opt) => opt === newTaskScheduledParam.type
                                  )
                                    ?.replace(/^./, (c) => c.toUpperCase()) ||
                                    "Select frequency"}
                                </Text>
                                <AntDesign name="down" size={16} color="#555" />
                              </TouchableOpacity>
                              {openDropdown === "freq" && (
                                <View style={styles.detailPickerDropdown}>
                                  {["daily", "weekly", "monthly", "yearly"].map(
                                    (opt) => (
                                      <TouchableOpacity
                                        key={opt}
                                        style={[
                                          styles.detailPickerOption,
                                          newTaskScheduledParam.type === opt && {
                                            backgroundColor: "#e6f0ff",
                                          },
                                        ]}
                                        onPress={() => {
                                          setNewTaskScheduledParam({ type: opt, daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        <Text style={{ color: "#222" }}>
                                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </Text>
                                      </TouchableOpacity>
                                    )
                                  )}
                                </View>
                              )}
                            </View>
                            {/* 动态渲染 frequency 相关参数 */}
                            {newTaskScheduledParam.type === "weekly" && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>Repeat on</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                  {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, idx) => (
                                    <TouchableOpacity
                                      key={day}
                                      style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 14,
                                        borderRadius: 8,
                                        margin: 4,
                                        backgroundColor: Array.isArray(newTaskScheduledParam.daysOfWeek) && newTaskScheduledParam.daysOfWeek.includes(idx) ? '#4a90e2' : '#f0f0f0',
                                      }}
                                      onPress={() => {
                                        let arr = Array.isArray(newTaskScheduledParam.daysOfWeek) ? [...newTaskScheduledParam.daysOfWeek] : [];
                                        if (arr.includes(idx)) {
                                          arr = arr.filter(i => i !== idx);
                                        } else {
                                          arr.push(idx);
                                        }
                                        setNewTaskScheduledParam({ ...newTaskScheduledParam, daysOfWeek: arr });
                                      }}
                                    >
                                      <Text style={{ color: Array.isArray(newTaskScheduledParam.daysOfWeek) && newTaskScheduledParam.daysOfWeek.includes(idx) ? '#fff' : '#333' }}>{day}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            )}
                            {newTaskScheduledParam.type === "monthly" && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>Repeat on Day(s)</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', maxHeight: 120 }}>
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                                    <TouchableOpacity
                                      key={d}
                                      style={{
                                        paddingVertical: 6,
                                        paddingHorizontal: 10,
                                        borderRadius: 8,
                                        margin: 2,
                                        backgroundColor: Array.isArray(newTaskScheduledParam.daysOfMonth) && newTaskScheduledParam.daysOfMonth.includes(d) ? '#4a90e2' : '#f0f0f0',
                                      }}
                                      onPress={() => {
                                        let arr = Array.isArray(newTaskScheduledParam.daysOfMonth) ? [...newTaskScheduledParam.daysOfMonth] : [];
                                        if (arr.includes(d)) {
                                          arr = arr.filter(i => i !== d);
                                        } else {
                                          arr.push(d);
                                        }
                                        setNewTaskScheduledParam({ ...newTaskScheduledParam, daysOfMonth: arr });
                                      }}
                                    >
                                      <Text style={{ color: Array.isArray(newTaskScheduledParam.daysOfMonth) && newTaskScheduledParam.daysOfMonth.includes(d) ? '#fff' : '#333' }}>{d}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </View>
                            )}
                            {newTaskScheduledParam.type === "yearly" && (
                              <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>Repeat on Date</Text>
                                <TouchableOpacity
                                  style={styles.dateTimePicker}
                                  onPress={() => setShowDatePicker(!showDatePicker)}
                                >
                                  <Text style={styles.dateTimeText}>
                                    {newTaskScheduledParam.dateOfYear
                                      ? new Date(newTaskScheduledParam.dateOfYear).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
                                      : 'Select Date'}
                                  </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                  <DateTimePicker
                                    value={newTaskScheduledParam.dateOfYear ? new Date(newTaskScheduledParam.dateOfYear) : new Date()}
                                    mode="date"
                                    display="spinner"
                                    onChange={(event, selectedDate) => {
                                      if (selectedDate) {
                                        setNewTaskScheduledParam({ ...newTaskScheduledParam, dateOfYear: selectedDate.toISOString() });
                                        setShowDatePicker(false);
                                      }
                                    }}
                                  />
                                )}
                              </View>
                            )}
                          </View>
                        )}
                        {/* Belong to Goal Picker - 统一下拉菜单风格 */}
                        <View style={{ marginBottom: 12, position: "relative" }}>
                          <Text style={styles.label}>Belong to Goal</Text>
                          <View>
                            <TouchableOpacity
                              style={styles.detailPickerTouchable}
                              onPress={() =>
                                setOpenDropdown(
                                  openDropdown === "belong" ? null : "belong"
                                )
                              }
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: selectedGoalId ? "#222" : "#888" }}>
                                {goals.find((g) => g.id === selectedGoalId)
                                  ?.name || "None"}
                              </Text>
                              <AntDesign name="down" size={16} color="#555" />
                            </TouchableOpacity>
                            {openDropdown === "belong" && (
                              <View style={styles.detailPickerDropdown}>
                                <TouchableOpacity
                                  style={styles.detailPickerOption}
                                  onPress={() => {
                                    setSelectedGoalId(undefined);
                                    setOpenDropdown(null);
                                  }}
                                >
                                  <Text style={{ color: "#222" }}>None</Text>
                                </TouchableOpacity>
                                {goals.map((goal) => (
                                  <TouchableOpacity
                                    key={goal.id}
                                    style={[
                                      styles.detailPickerOption,
                                      selectedGoalId === goal.id && {
                                        backgroundColor: "#e6f0ff",
                                      },
                                    ]}
                                    onPress={() => {
                                      setSelectedGoalId(goal.id);
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    <Text style={{ color: "#222" }}>
                                      {goal.name}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            )}
                          </View>
                        </View>
                        {/* Tag Picker - 支持多选（用 id 存储） */}
                        <View style={styles.dateTimeContainer}>
                          <Text style={styles.label}>Tags (Optional)</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            {tagList.map((tag) => (
                              <TouchableOpacity
                                key={tag.id}
                                style={[
                                  styles.detailPickerOption,
                                  newTaskTags.includes(tag.id) && { backgroundColor: "#e6f0ff" },
                                  { marginRight: 8, marginBottom: 8 },
                                ]}
                                onPress={() => {
                                  if (newTaskTags.includes(tag.id)) {
                                    setNewTaskTags(newTaskTags.filter((t) => t !== tag.id));
                                  } else {
                                    setNewTaskTags([...newTaskTags, tag.id]);
                                  }
                                }}
                              >
                                <Text style={{ color: newTaskTags.includes(tag.id) ? "#222" : "#888" }}>{tag.name}</Text>
                              </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                              style={[
                                styles.detailPickerOption,
                                newTaskTags.length === 0 && { backgroundColor: "#e6f0ff" },
                                { marginRight: 8, marginBottom: 8 },
                              ]}
                              onPress={() => setNewTaskTags([])}
                            >
                              <Text style={{ color: newTaskTags.length === 0 ? "#222" : "#888" }}>None</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        {/* Details Section */}
                        <View style={[styles.detailContainer, { marginBottom: 12 }]}> 
                          <Text style={styles.label}>Details</Text>
                          {details.map((detail, index) => (
                            <View key={index} style={styles.detailRow}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <TouchableOpacity
                                  style={styles.detailPickerTouchable}
                                  onPress={() =>
                                    setOpenDropdown(
                                      openDropdown === `detail-${index}`
                                        ? null
                                        : `detail-${index}`
                                    )
                                  }
                                  activeOpacity={0.8}
                                >
                                  <Text
                                    style={{
                                      color: detail.key ? "#222" : "#888",
                                    }}
                                  >
                                    {detail.key || "Select Attribute"}
                                  </Text>
                                  <AntDesign
                                    name="down"
                                    size={16}
                                    color="#555"
                                    style={{ marginLeft: 6 }}
                                  />
                                </TouchableOpacity>
                                {openDropdown === `detail-${index}` && (
                                  <View style={styles.detailPickerDropdown}>
                                    {availableAttributes.map((attr) => (
                                      <TouchableOpacity
                                        key={attr}
                                        style={[
                                          styles.detailPickerOption,
                                          detail.key === attr && {
                                            backgroundColor: "#e6f0ff",
                                          },
                                          !details.some(
                                            (d, i) =>
                                              d.key === attr && i !== index
                                          )
                                            ? null
                                            : { opacity: 0.5 },
                                        ]}
                                        disabled={details.some(
                                          (d, i) =>
                                            d.key === attr && i !== index
                                        )}
                                        onPress={() => {
                                          const updatedDetails = [...details];
                                          updatedDetails[index].key = attr;
                                          setDetails(updatedDetails);
                                          setOpenDropdown(null);
                                        }}
                                      >
                                        <Text style={{ color: "#222" }}>
                                          {attr}
                                        </Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                )}
                              </View>
                              <TextInput
                                style={styles.detailValueInput}
                                placeholder="Enter value (e.g. https://..., 10, description)"
                                value={detail.value}
                                onChangeText={(text) => {
                                  const updatedDetails = [...details];
                                  updatedDetails[index].value = text;
                                  setDetails(updatedDetails);
                                }}
                                maxLength={100}
                              />
                              <TouchableOpacity
                                style={styles.deleteDetailButton}
                                onPress={() => {
                                  setDetails(
                                    details.filter((_, i) => i !== index)
                                  );
                                }}
                              >
                                <AntDesign
                                  name="closecircleo"
                                  size={22}
                                  color="#bbb"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                          <Pressable
                            style={styles.addDetailButton}
                            onPress={() => {
                              setDetails([...details, { key: "", value: "" }]);
                            }}
                          >
                            <Text style={[styles.addDetailButtonText]}>
                              + Add Detail
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    )}

                    {/* Add Task Button */}
                    <View style={styles.buttonRow}>
                      {editingTask ? (
                        <Pressable
                          style={[styles.button, styles.addButton, { flex: 1, marginRight: 8 }]}
                          onPress={() => {
                            if (!newTaskName.trim()) {
                              Alert.alert("Error", "Task name cannot be empty.");
                              return;
                            }
                            const startTime = newTaskStartTime ? new Date(newTaskStartTime) : new Date();
                            const endTime = newTaskEndTime ? new Date(newTaskEndTime) : new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 23, 59);
                            const detailsObj = details.reduce((acc: Record<string, any>, detail) => {
                              if (detail.key) acc[detail.key] = detail.value;
                              return acc;
                            }, {});
                            // 编辑：调用 updateTask
                            updateTask(editingTask.id, {
                              name: newTaskName,
                              tags: newTaskTags,
                              goalId: selectedGoalId ?? undefined,
                              details: detailsObj,
                              scheduled: newTaskScheduled,
                              scheduledParam: {
                                ...newTaskScheduledParam,
                                startTime: startTime.toISOString(),
                                endTime: endTime.toISOString(),
                              },
                            })
                              .then(() => getTasks())
                              .then(res => {
                                if (res && res.data) {
                                  dispatch(setTasks(res.data));
                                }
                              })
                              .catch(e => Alert.alert("Edit Task Failed", String(e)))
                              .finally(() => {
                                resetModalFields();
                                setEditingTask(null);
                                setModalVisible(false);
                              });
                          }}
                        >
                          <Text style={styles.buttonText}>Save</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[styles.button, styles.addButton, { flex: 1, marginRight: 8 }]}
                          onPress={() => {
                            if (!newTaskName.trim()) {
                              Alert.alert("Error", "Task name cannot be empty.");
                              return;
                            }
                            // startTime 可选，未选时用当前时间
                            const startTime = newTaskStartTime
                              ? new Date(newTaskStartTime)
                              : new Date();
                            const endTime = newTaskEndTime
                              ? new Date(newTaskEndTime)
                              : new Date(
                                  startTime.getFullYear(),
                                  startTime.getMonth(),
                                  startTime.getDate(),
                                  23,
                                  59
                                );
                            // 组装 details，过滤无 key 的项
                            const detailsObj = details.reduce((acc: Record<string, any>, detail) => {
                              if (detail.key) acc[detail.key] = detail.value;
                              return acc;
                            }, {});
                            // 组装后端任务数据
                            const taskData = {
                              name: newTaskName,
                              tags: newTaskTags,
                              goalId: selectedGoalId ?? undefined,
                              details: detailsObj,
                              scheduled: newTaskScheduled,
                              scheduledParam: {
                                ...newTaskScheduledParam,
                                startTime: startTime.toISOString(),
                                endTime: endTime.toISOString(),
                              },
                            };
                            createTask(taskData)
                              .then(() => getTasks())
                              .then(res => {
                                if (res && res.data) {
                                  dispatch(setTasks(res.data));
                                }
                                // 可选：刷新本地 scheduleData
                                // setScheduleData(res.data); // 若后端返回格式一致
                              })
                              .catch(e => Alert.alert("Add Task Failed", String(e)))
                              .finally(() => {
                                resetModalFields();
                                setModalVisible(false);
                              });
                          }}
                        >
                          <Text style={styles.buttonText}>Add Task</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[styles.moreButton, { flex: 1 }]}
                        onPress={() => setShowMoreFields(!showMoreFields)}
                      >
                        <Text style={styles.moreButtonText}>
                          {showMoreFields ? "Hide More" : "More"}
                        </Text>
                      </Pressable>
                    </View>

                    {/* Close Modal Button (X at top right) */}
                    <TouchableOpacity
                      style={styles.closeIcon}
                      onPress={() => {
                        resetModalFields();
                        setEditingTask(null);
                        setModalVisible(false);
                      }}
                    >
                      <Text style={{ fontSize: 28, color: "#888" }}>×</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
      <Text style={styles.screenTitle}>Tasks TODO</Text>

      <SwipeListView
        data={todoTasks}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(Number(rowData.key), "completed", true);
          });
          if (rowData.value >= SWIPETHRESHOLD) {
            handleTaskStatusChange(Number(rowData.key), true);
          }
        }}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(Number(rowData.key), "completed", false);
          });
          if (rowData.value <= -SWIPETHRESHOLD) {
            handleTaskStatusChange(Number(rowData.key), false);
          }
        }}
      />

      <Text style={styles.screenTitle}>Tasks Completed</Text>
      <SwipeListView
        data={completedTasks}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => item.id}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(Number(rowData.key), "completed", false);
          });
          if (rowData.value <= -SWIPETHRESHOLD) {
            handleTaskStatusChange(Number(rowData.key), false);
          }
        }}
      />
      <Text style={styles.screenTitle}>Tasks Not Done</Text>
      <SwipeListView
        data={notDoneTasks}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          requestAnimationFrame(() => {
            changeScheduleData(Number(rowData.key), "completed", null);
          });
          // 可选：如需联动 handleTaskStatusChange 可加
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
  taskNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
});

// 顶部添加类型定义
interface ScheduleTask {
  id: number;
  goal?: number;
  name: string;
  startTime: Date | null;
  endTime: Date | null;
  tags?: number[];
  details: Record<string, any>;
  goalId?: number;
  completed: boolean | null;
  scheduled?: string;
  scheduledParam?: any;
  fold?: boolean;
  editNDelete?: boolean;
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
