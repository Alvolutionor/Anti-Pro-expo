import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import { getTags, createTask, getTasks, updateTask, validateToken, getGoals } from '../../utils/api';
import { generatePeriodicTaskInstances } from '../../utils/time';
import { useDispatch } from "react-redux";
import { setTasks, updateTask as updateTaskInStore } from "../../store/taskSlice";
import { setGoals } from "../../store/goalSlice";
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VoiceInputButton from '../../components/VoiceInputButton';


LogBox.ignoreLogs(['useInsertionEffect must not schedule updates']);// some issue with swiper package


const mockEventTags = ["Meeting", "Workout", "Study", "Shopping", "Other"];

const convertTimeToMinutes = (date: Date) => {
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

const ScheduleScreen = ({}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const tasks = useSelector((state: RootState) => state.task.tasks);
  
  // 认证状态
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  
  // 组件挂载状态 - 防止内存泄漏
  const isMountedRef = useRef(true);
  
  // 添加当前时间状态用于动态更新进度条
  const [currentTime, setCurrentTime] = useState(new Date());

  // 认证检查
  useEffect(() => {
    let isCancelled = false;
    
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (isCancelled) return;
        
        if (!token) {
          router.replace("/auth");
          return;
        }
        
        const validation = await validateToken();
        if (isCancelled) return;
        
        if (!validation.valid) {
          console.log("Token validation failed:", validation.error);
          router.replace("/auth");
          return;
        }
        
        if (!isCancelled) {
          setIsAuthenticated(true);
          console.log("认证成功");
        }
        
      } catch (error) {
        if (!isCancelled) {
          console.error("Auth check failed:", error);
          router.replace("/auth");
        }
      } finally {
        if (!isCancelled) {
          setAuthChecking(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isCancelled = true;
    };
  }, [router]);

  // 添加定时器来动态更新当前时间，实现进度条实时更新
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000); // 每秒更新一次

    return () => clearInterval(timer);
  }, []);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 新建/编辑任务相关状态
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskTags, setNewTaskTags] = useState<number[]>([]);
  const [newTaskStartTime, setNewTaskStartTime] = useState("");
  const [newTaskEndTime, setNewTaskEndTime] = useState("");
  const [details, setDetails] = useState([{ key: "desc", value: "" }]);
  const [showMoreFields, setShowMoreFields] = useState(false);
  const goals = useSelector((state: RootState) => state.goal.goals);
  const [selectedGoalId, setSelectedGoalId] = useState<number | undefined>(undefined);
  const [openDropdown, setOpenDropdown] = useState<null | string>(null);
  // 恢复时间选择器相关状态
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);

  // 任务调度类型
  const SCHEDULED_OPTIONS = [
    { label: "Periodic", value: "periodic" },
    { label: "Finished By", value: "finishedby" },
    { label: "One-time", value: "onetime" },
  ];
  const [newTaskScheduled, setNewTaskScheduled] = useState("onetime");
  const [newTaskScheduledParam, setNewTaskScheduledParam] = useState<any>({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const [tagList, setTagList] = useState<{ id: number; name: string; color?: string }[]>([]);

  // scheduleData 操作函数
  // 修改任务数据 - 通过 Redux 更新
  const changeScheduleData = useCallback((id: number, property: string, value: any) => {
    if (!isMountedRef.current) return;
    
    const task = tasks.find((task: any) => task.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, [property]: value };
    dispatch(updateTaskInStore(updatedTask));
  }, [tasks, dispatch]);

  // 渲染单个任务块 - 使用 useCallback 优化
  const renderTimeBlock = useCallback(({ item }: { item: any }) => {
    const start = item.startTime instanceof Date ? item.startTime : null;
    const end = item.endTime instanceof Date ? item.endTime : null;
    const isNotDone = item.completed === false && end && end <= new Date();
    const isCompleted = item.completed === true;
    
    // 计算当前进度百分比
    const calculateProgress = () => {
      if (!start || !end || end <= start) return 0;
      
      const now = currentTime.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      if (now < startTime) return 0; // 任务还未开始
      if (now > endTime) return 100; // 任务已结束
      
      const progress = ((now - startTime) / (endTime - startTime)) * 100;
      return Math.max(0, Math.min(100, progress)); // 确保在 0-100% 范围内
    };
    
    const progressPercentage = calculateProgress();
    
    // 根据任务状态确定样式
    const getTaskStyle = () => {
      if (isCompleted) {
        return {
          backgroundColor: "#e8f5e8", // 浅绿色背景
          borderColor: "#28a745",
          borderWidth: 2,
          opacity: 0.8
        };
      } else if (isNotDone) {
        return {
          backgroundColor: "#ffeaea", // 浅红色背景
          borderColor: "#dc3545",
          borderWidth: 2,
        };
      } else {
        return {
          backgroundColor: "#ffffff", // 白色背景
          borderColor: "#e9ecef",
          borderWidth: 1,
        };
      }
    };
    
    return (
      <Pressable
        style={[
          styles.timeBlock, 
          getTaskStyle(),
          { 
            marginHorizontal: 8,
            marginVertical: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }
        ]}
        onPress={() => changeScheduleData(item.id, "fold", !item.fold)}
        onLongPress={() => handleEditTask(item)}
      >
        <View style={{ borderRadius: 10 }}>
          <View style={{ borderRadius: 10, overflow: "hidden", margin: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {/* 完成状态指示器 */}
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: isCompleted ? "#28a745" : "#ffffff",
                  borderWidth: 2,
                  borderColor: isCompleted ? "#28a745" : "#666666",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                  {isCompleted && (
                    <AntDesign name="check" size={12} color="#ffffff" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.taskNameText,
                    isCompleted && { 
                      textDecorationLine: 'line-through',
                      color: '#666666',
                      fontWeight: 'normal'
                    }
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.timeText,
                    { fontSize: 12, marginTop: 2 }
                  ]}>
                    {start ? start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"} - {end ? end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
                  </Text>
                </View>
              </View>
              
              {/* 状态标签 */}
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: isCompleted ? "#28a745" : isNotDone ? "#dc3545" : "#007bff"
              }}>
                <Text style={{ 
                  color: "#ffffff", 
                  fontSize: 10, 
                  fontWeight: "600"
                }}>
                  {isCompleted ? "DONE" : isNotDone ? "OVERDUE" : "TODO"}
                </Text>
              </View>
            </View>
            {!item.fold && (
              <View style={{ 
                marginTop: 12, 
                padding: 12,
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: isCompleted ? "#28a745" : isNotDone ? "#dc3545" : "#007bff"
              }}>
                <View style={{ marginBottom: 8 }}>
                  {/* 显示任务详细信息 */}
                  {item.details && typeof item.details === 'object' && (
                    <View>
                      {Object.entries(item.details).map(([key, value]) => (
                        <Text key={key} style={[styles.eventText, { marginBottom: 4, fontSize: 13 }]}>
                          <Text style={{ fontWeight: "600", color: "#495057" }}>{key}:</Text> {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </Text>
                      ))}
                    </View>
                  )}
                  {item.details && typeof item.details === 'string' && (
                    <Text style={[styles.eventText, { fontSize: 13 }]}>{item.details}</Text>
                  )}
                  {!item.details && (
                    <Text style={[styles.eventText, { color: '#999999', fontSize: 13, fontStyle: 'italic' }]}>No description</Text>
                  )}
                </View>
                
                {/* 进度信息 */}
                {start && end && (
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: "#666", fontWeight: "500" }}>
                        Progress: {progressPercentage.toFixed(1)}%
                      </Text>
                      <Text style={{ fontSize: 11, color: "#999" }}>
                        {progressPercentage >= 100 ? "Completed" : progressPercentage > 0 ? "In Progress" : "Not Started"}
                      </Text>
                    </View>
                    {/* 进度条 */}
                    <View style={{
                      height: 6,
                      backgroundColor: "#e9ecef",
                      borderRadius: 3,
                      overflow: "hidden"
                    }}>
                      <View style={{
                        height: "100%",
                        width: `${Math.min(progressPercentage, 100)}%`,
                        backgroundColor: progressPercentage >= 100 ? "#dc3545" : progressPercentage > 50 ? "#ffc107" : "#28a745",
                        borderRadius: 3,
                      }} />
                    </View>
                  </View>
                )}
                
                {isNotDone && (
                  <Pressable
                    style={{ 
                      backgroundColor: "#007bff", 
                      borderRadius: 6, 
                      paddingVertical: 8, 
                      paddingHorizontal: 16, 
                      alignSelf: "flex-start",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                    onPress={() => changeScheduleData(item.id, "completed", null)}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 12 }}>Move to TODO</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
        
        {/* 动态进度条覆盖层 */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progressPercentage}%`,
            backgroundColor: isCompleted 
              ? "rgba(40, 167, 69, 0.15)" 
              : isNotDone 
                ? "rgba(220, 53, 69, 0.15)" 
                : progressPercentage >= 100 
                  ? "rgba(255, 193, 7, 0.15)" 
                  : "rgba(0, 123, 255, 0.1)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        />
      </Pressable>
    );
  }, [currentTime, changeScheduleData, tasks, dispatch]);

  // 渲染 Tasks Not Done 的任务块 - 添加 Move to TODO 按钮 - 使用 useCallback 优化
  const renderNotDoneTimeBlock = useCallback(({ item }: { item: any }) => {
    const start = item.startTime instanceof Date ? item.startTime : null;
    const end = item.endTime instanceof Date ? item.endTime : null;
    
    // 计算当前进度百分比
    const calculateProgress = () => {
      if (!start || !end || end <= start) return 0;
      
      const now = currentTime.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      if (now < startTime) return 0; // 任务还未开始
      if (now > endTime) return 100; // 任务已结束
      
      const progress = ((now - startTime) / (endTime - startTime)) * 100;
      return Math.max(0, Math.min(100, progress)); // 确保在 0-100% 范围内
    };
    
    const progressPercentage = calculateProgress();
    
    return (
      <Pressable
        style={[
          styles.timeBlock, 
          { 
            backgroundColor: "#fff5f5", // 更明显的警告背景色
            borderColor: "#ff6b6b",
            borderWidth: 2,
            marginHorizontal: 8,
            marginVertical: 6,
            shadowColor: "#ff6b6b",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 4,
          }
        ]}
        onPress={() => changeScheduleData(item.id, "fold", !item.fold)}
        onLongPress={() => handleEditTask(item)}
      >
        <View style={{ borderRadius: 10 }}>
          <View style={{ borderRadius: 10, overflow: "hidden", margin: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              {/* 逾期状态指示器 */}
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#ff6b6b",
                  borderWidth: 2,
                  borderColor: "#ff6b6b",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12
                }}>
                  <AntDesign name="exclamation" size={12} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskNameText, { color: "#d63031", fontWeight: "600" }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.timeText, { fontSize: 12, marginTop: 2, color: "#ff6b6b" }]}>
                    {start ? start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"} - {end ? end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
                  </Text>
                </View>
              </View>
              
              {/* 逾期标签 */}
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: "#ff6b6b"
              }}>
                <Text style={{ 
                  color: "#ffffff", 
                  fontSize: 10, 
                  fontWeight: "700"
                }}>
                  OVERDUE
                </Text>
              </View>
            </View>
            {!item.fold && (
              <View style={{ 
                backgroundColor: "#fff", 
                borderRadius: 8, 
                marginTop: 12, 
                padding: 12,
                borderWidth: 1,
                borderColor: "#ffe6e6"
              }}>
                <Text style={[styles.eventText, { 
                  fontSize: 13, 
                  fontWeight: "500", 
                  color: "#666",
                  marginBottom: 4
                }]}>
                  Category: {item.category || 'None'}
                </Text>
                <Text style={[styles.eventText, { 
                  fontSize: 13, 
                  fontWeight: "400", 
                  color: "#666",
                  marginBottom: 6,
                  lineHeight: 18
                }]}>
                  Description: {item.content || 'No description'}
                </Text>
                
                {/* 进度显示 */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: "#ff6b6b", fontWeight: "600", marginRight: 8 }}>
                    Progress: {progressPercentage.toFixed(1)}%
                  </Text>
                  <View style={{
                    flex: 1,
                    height: 6,
                    backgroundColor: "#ffebee",
                    borderRadius: 3,
                    overflow: "hidden"
                  }}>
                    <View style={{
                      width: `${progressPercentage}%`,
                      height: "100%",
                      backgroundColor: "#ff6b6b",
                      borderRadius: 3
                    }} />
                  </View>
                </View>
                
                {/* 操作按钮 */}
                <Pressable
                  style={{ 
                    backgroundColor: "#ff6b6b", 
                    borderRadius: 6, 
                    paddingVertical: 10, 
                    paddingHorizontal: 16, 
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: 12
                  }}
                  onPress={() => {
                    changeScheduleData(item.id, "completed", null);
                    handleTaskStatusChange(item.id, null);
                  }}
                >
                  <AntDesign name="arrowleft" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 13 }}>Move to TODO</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
        
        {/* 动态进度条覆盖层 */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: `${progressPercentage}%`,
            backgroundColor: "rgba(255, 107, 107, 0.2)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        />
      </Pressable>
    );
  }, [currentTime, changeScheduleData, tasks, dispatch]);
  const SWIPETHRESHOLD = 0.4 * Dimensions.get("window").width;
  // 渲染滑动操作项（可扩展）
  const renderSwipeItem = () => <View style={{ height: 78 }} />;

  // 重置弹窗表单 - 使用 useCallback 优化
  const resetModalFields = useCallback(() => {
    setNewTaskName("");
    setNewTaskTags([]);
    setNewTaskStartTime("");
    setNewTaskEndTime("");
    setDetails([{ key: "desc", value: "" }]);
    setSelectedGoalId(undefined);
    setNewTaskScheduled("onetime");
    setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    setShowDatePicker(false);
  }, []);

  // 拉取 tag 列表和今日任务
  useEffect(() => {
    let isCancelled = false;
    
    Promise.all([
      getTags(),
      getGoals(),
      getTasks()
    ]).then(([tagsRes, goalsRes, tasksRes]) => {
      if (isCancelled) return;
      
      if (tagsRes && tagsRes.data) {
        setTagList(tagsRes.data);
      }
      
      if (goalsRes && goalsRes.data) {
        dispatch(setGoals(goalsRes.data));
      }
      
      if (tasksRes && tasksRes.data) {
        dispatch(setTasks(tasksRes.data));
      }
    }).catch((error) => {
      if (!isCancelled) {
        console.error('Failed to fetch data:', error);
        setTagList([]); // 失败兜底
      }
    });
    
    return () => {
      isCancelled = true;
    };
  }, [dispatch]);

  // scheduleData 由 redux tasks 派生 - 使用 useMemo 优化，支持periodic任务扩展
  const scheduleData = useMemo(() => {
    if (tasks && Array.isArray(tasks)) {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const todayTasks: any[] = [];
      
      tasks.forEach((task: any) => {
        if (task.scheduled === 'periodic') {
          // 处理periodic任务 - 生成今天的实例
          const periodicInstances = generatePeriodicTaskInstances(task, todayStart, todayEnd);
          todayTasks.push(...periodicInstances);
        } else {
          // 处理one-time和finishedby任务 - 检查是否在今天
          const start = task.scheduledParam?.startTime || task.startTime;
          if (!start) return;
          const d = new Date(start);
          if (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          ) {
            todayTasks.push(task);
          }
        }
      });
      
      return parseTaskDates(todayTasks).map((item: any) => ({
        ...item,
        fold: true,
        editNDelete: false,
      }));
    }
    return [];
  }, [tasks]);

  // 任务状态变更处理 - 使用 useCallback 优化
  const handleTaskStatusChange = useCallback((id: number, completed: boolean | null) => {
    if (!isMountedRef.current) return;
    
    // 只 patch 状态，null 视为 undefined
    updateTask(id, { completed: completed === null ? undefined : completed })
      .then(() => {
        if (!isMountedRef.current) return;
        return getTasks();
      })
      .then(res => {
        if (!isMountedRef.current || !res?.data) return;
        dispatch(setTasks(res.data));
      })
      .catch(error => {
        if (!isMountedRef.current) return;
        console.error("Failed to update task status:", error);
        // 如果API失败，恢复本地状态
        const originalItem = scheduleData.find(item => item.id === id);
        if (originalItem) {
          changeScheduleData(id, "completed", originalItem.completed);
        }
      });
  }, [scheduleData, changeScheduleData, dispatch]);

  const now = new Date();
  // 修正：completed 只用 boolean
  const todoTasks = scheduleData.filter((item: any) => item.completed === false && item.endTime && item.endTime > now);
  const notDoneTasks = scheduleData.filter((item: any) => item.completed === false && item.endTime && item.endTime <= now);
  const completedTasks = scheduleData.filter((item: any) => item.completed === true);

  // 编辑任务相关状态
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  
  // 编辑任务时填充表单 - 使用 useCallback 优化
  const handleEditTask = useCallback((task: ScheduleTask) => {
    if (!isMountedRef.current) return;
    
    setEditingTask(task);
    setNewTaskName(task.name);
    setNewTaskTags(task.tags || []);
    setNewTaskStartTime(task.startTime ? task.startTime.toISOString() : "");
    setNewTaskEndTime(task.endTime ? task.endTime.toISOString() : "");
    setDetails(Object.entries(task.details || {}).map(([key, value]) => ({ key, value })));
    setSelectedGoalId(task.goalId);
    setNewTaskScheduled(task.scheduled || "onetime");
    setNewTaskScheduledParam(task.scheduledParam || { type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    
    setShowMoreFields(true);
    setModalVisible(true);
  }, [tasks]);


  // 初始化通知通道（仅 Android 需要）
  // 通知相关逻辑已迁移到 utils/notifications.ts，无需本地实现

  // 认证检查中或未认证时显示加载状态
  if (authChecking) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>验证登录状态...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return null; // 这种情况下应该已经重定向到登录页了
  }

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

                    {/* Task Name Input with Voice Recognition */}
                    <View style={styles.inputWithVoice}>
                      <TextInput
                        style={[styles.input, styles.inputWithVoiceText]}
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
                      <VoiceInputButton
                        onTextReceived={(text) => {
                          setNewTaskName(text);
                        }}
                        style={styles.voiceButton}
                        placeholder="语音输入任务名称"
                      />
                    </View>

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
                              if (selectedDate) {
                                setNewTaskStartTime(selectedDate.toISOString());
                                if (newTaskEndTime && new Date(selectedDate) > new Date(newTaskEndTime)) {
                                  setNewTaskEndTime(selectedDate.toISOString());
                                }
                              }
                              // 只在用户确认或取消时关闭，滚动调整时不关闭
                              if ( event.type === "dismissed") {
                                setShowStartTimePicker(false);
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
                              <Text style={{ color: newTaskScheduled ? "#000000" : "#888888" }}>
                                {SCHEDULED_OPTIONS.find(
                                  (opt) => opt.value === newTaskScheduled
                                )?.label || "(Select type)"}
                              </Text>
                              <Text style={{ color: "#666666", fontSize: 14 }}>▼</Text>
                            </TouchableOpacity>
                            {openDropdown === "scheduled" && (
                              <View style={styles.detailPickerDropdown}>
                                {SCHEDULED_OPTIONS.map((opt) => (
                                  <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                      styles.detailPickerOption,
                                      newTaskScheduled === opt.value && {
                                        backgroundColor: "#f8f9fa",
                                      },
                                    ]}
                                    onPress={() => {
                                      setNewTaskScheduled(opt.value);
                                      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
                                      setShowDatePicker(false);
                                      setOpenDropdown(null);
                                    }}
                                  >
                                    <Text style={{ color: "#000000" }}>{opt.label}</Text>
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
                                  if (selectedDate) {
                                    setNewTaskStartTime(selectedDate.toISOString());
                                    if (newTaskEndTime && new Date(selectedDate) > new Date(newTaskEndTime)) {
                                      setNewTaskEndTime(selectedDate.toISOString());
                                    }
                                  }
                                  // 只在用户确认或取消时关闭，滚动调整时不关闭
                                  if (event.type === "dismissed") {
                                    setShowStartTimePicker(false);
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
                                minimumDate={newTaskStartTime ? new Date(newTaskStartTime) : undefined}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    setNewTaskEndTime(selectedDate.toISOString());
                                  }
                                  // 只在用户确认或取消时关闭，滚动调整时不关闭
                                  if (event.type === "dismissed") {
                                    setShowEndTimePicker(false);
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
                                  // 只在用户确认或取消时关闭，滚动调整时不关闭
                                  if (event.type === "dismissed") {
                                    setShowEndTimePicker(false);
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
                                <Text style={{ color: newTaskScheduledParam.type ? "#000000" : "#888888" }}>
                                  {["daily", "weekly", "monthly", "yearly"].find(
                                    (opt) => opt === newTaskScheduledParam.type
                                  )
                                    ?.replace(/^./, (c) => c.toUpperCase()) ||
                                    "Select frequency"}
                                </Text>
                                <Text style={{ color: "#666666", fontSize: 14 }}>▼</Text>
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
                                      }
                                      // 只在用户确认或取消时关闭，滚动调整时不关闭
                                      if ( event.type === "dismissed") {
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
                              tag: newTaskTags.length > 0 ? String(newTaskTags[0]) : "",
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
                              tag: newTaskTags.length > 0 ? String(newTaskTags[0]) : "",
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
                                // 通知调度已在Redux slice中自动处理
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
        keyExtractor={(item: any) => String(item.id)}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          if (rowData.value >= SWIPETHRESHOLD) {
            const task = todoTasks.find(t => String(t.id) === rowData.key);
            if (task) {
              changeScheduleData(task.id, "completed", true);
              handleTaskStatusChange(task.id, true);
            }
          }
        }}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          if (rowData.value <= -SWIPETHRESHOLD) {
            const task = todoTasks.find(t => String(t.id) === rowData.key);
            if (task) {
              changeScheduleData(task.id, "completed", false);
              handleTaskStatusChange(task.id, false);
            }
          }
        }}
      />

      <Text style={styles.screenTitle}>Tasks Completed</Text>
      <SwipeListView
        data={completedTasks}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => String(item.id)}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          if (rowData.value <= -SWIPETHRESHOLD) {
            const task = completedTasks.find(t => String(t.id) === rowData.key);
            if (task) {
              changeScheduleData(task.id, "completed", false);
              handleTaskStatusChange(task.id, false);
            }
          }
        }}
      />
      <Text style={styles.screenTitle}>Tasks Not Done</Text>
      <SwipeListView
        data={notDoneTasks}
        renderItem={renderNotDoneTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item: any) => String(item.id)}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          if (rowData.value >= SWIPETHRESHOLD) {
            const task = notDoneTasks.find(t => String(t.id) === rowData.key);
            if (task) {
              changeScheduleData(task.id, "completed", null);
              handleTaskStatusChange(task.id, null);
            }
          }
        }}
      />

      {/* Add Task Floating Button - Minimalist Style */}
      <TouchableOpacity
        style={styles.fabSmall}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabTextSmall}>+ Task</Text>
      </TouchableOpacity>

      {/* 临时通知测试按钮 - 稍后移除 */}
      <TouchableOpacity
        style={[styles.fabSmall, { bottom: 120, backgroundColor: '#ff6b6b' }]}
        onPress={async () => {
          try {
            console.log("测试通知按钮被点击");
            
            // 导入通知函数
            const { scheduleAllUpcomingTaskNotifications, scheduleTestNotification, requestNotificationPermission, setupNotificationChannel } = require('../../utils/notifications');
            
            // 检查权限
            console.log("检查通知权限...");
            const granted = await requestNotificationPermission();
            console.log("通知权限状态:", granted);
            
            if (!granted) {
              Alert.alert("权限错误", "通知权限未授权，请在设置中开启");
              return;
            }
            
            // 设置通知通道
            console.log("设置通知通道...");
            await setupNotificationChannel();
            
            // 测试立即通知
            console.log("发送测试通知...");
            await scheduleTestNotification();
            Alert.alert("测试通知", "已发送测试通知，请检查通知栏和控制台日志");
            
            // 测试任务通知调度
            console.log("调度任务通知...");
            const count = await scheduleAllUpcomingTaskNotifications();
            console.log("调度任务数量:", count);
            Alert.alert("通知调度", `已为 ${count} 个任务安排了通知，查看控制台获取详细信息`);
          } catch (error) {
            console.error("通知测试错误:", error);
            Alert.alert("通知测试失败", `错误: ${String(error)}`);
          }
        }}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabTextSmall, { color: '#fff' }]}>🔔</Text>
      </TouchableOpacity>

      {/* 临时语音测试按钮 - 稍后移除 */}
      <TouchableOpacity
        style={[styles.fabSmall, { bottom: 180, backgroundColor: '#4CAF50' }]}
        onPress={() => {
          // 导航到语音演示页面
          router.push('/voice-demo');
        }}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabTextSmall, { color: '#fff' }]}>🎤</Text>
      </TouchableOpacity>

      {/* 临时语音通知测试按钮 - 稍后移除 */}
      <TouchableOpacity
        style={[styles.fabSmall, { bottom: 240, backgroundColor: '#9C27B0' }]}
        onPress={async () => {
          try {
            const { testVoiceNotification } = require('../../utils/notifications');
            await testVoiceNotification();
            Alert.alert("语音通知测试", "语音播报测试已开始");
          } catch (error) {
            console.error('语音通知测试失败:', error);
            Alert.alert("语音通知测试失败", `错误: ${String(error)}`);
          }
        }}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabTextSmall, { color: '#fff' }]}>🔊</Text>
      </TouchableOpacity>


    </View>
  );
};
// 日历屏幕
export default function App() {
  // scheduleData 由 redux tasks 派生 - 使用 useMemo 优化

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
    backgroundColor: "#000000",
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
    color: "#ffffff",
    fontWeight: "500",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  taskNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  inputWithVoice: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
    gap: 8,
  },
  inputWithVoiceText: {
    flex: 1,
    width: 'auto',
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
  originalId?: number;  // 用于periodic任务实例的原始任务ID
  isPeriodicInstance?: boolean;  // 标识是否为periodic任务实例
  instanceDate?: Date;  // periodic任务实例的日期
}



const availableAttributes = ["desc", "loc", "prio", "stat"];


