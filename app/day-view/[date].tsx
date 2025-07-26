import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable } from "react-native";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setTasks, updateTask as updateTaskInStore } from "../../store/taskSlice";
import { generatePeriodicTaskInstances } from '../../utils/time';
import AntDesign from "@expo/vector-icons/AntDesign";
import { getTasks } from '../../utils/api';

const convertTimeToMinutes = (date: Date) => {
  return date.getHours() * 60 + date.getMinutes();
};

const parseTaskDates = (tasks: any[]) => {
  return tasks.map((task: any) => {
    const start = task.startTime instanceof Date ? task.startTime : (task.scheduledParam?.startTime ? new Date(task.scheduledParam.startTime) : null);
    const end = task.endTime instanceof Date ? task.endTime : (task.scheduledParam?.endTime ? new Date(task.scheduledParam.endTime) : null);
    
    return {
      ...task,
      startTime: start,
      endTime: end,
    };
  });
};

const DayView = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams();
  const dispatch = useDispatch();
  const tasks = useSelector((state: RootState) => state.task.tasks);
  // local UI state for fold (collapse) and edit mode per task
  const [foldState, setFoldState] = useState<Record<number, boolean>>({});
  const [editState, setEditState] = useState<Record<number, boolean>>({});
  const [currentTime, setCurrentTime] = useState(new Date());
  const isMountedRef = useRef(true);

  // 将日期字符串转换为Date对象
  const selectedDate = useMemo(() => {
    if (typeof date === 'string') {
      return new Date(date + 'T00:00:00.000Z');
    }
    return new Date();
  }, [date]);

  useEffect(() => {
    getTasks().then(res => {
      if (res && res.data) {
        dispatch(setTasks(res.data));
      }
    });
  }, [dispatch]);

  // 添加定时器来动态更新当前时间，实现进度条实时更新
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMountedRef.current) {
        setCurrentTime(new Date());
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 修改任务数据 - 通过 Redux 更新
  const changeScheduleData = useCallback((id: number, property: string, value: any) => {
    if (!isMountedRef.current) return;
    
    const task = tasks.find((task: any) => task.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, [property]: value };
    dispatch(updateTaskInStore(updatedTask));
  }, [tasks, dispatch]);

  // 筛选出选定日期的任务
  const scheduleData = useMemo(() => {
    if (tasks && Array.isArray(tasks)) {
      const targetDate = selectedDate;
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
      
      const dayTasks: any[] = [];
      
      tasks.forEach((task: any) => {
        if (task.scheduled === 'periodic') {
          // 处理periodic任务 - 生成特定日期的实例
          const periodicInstances = generatePeriodicTaskInstances(task, dayStart, dayEnd);
          dayTasks.push(...periodicInstances);
        } else {
          // 处理one-time和finishedby任务 - 检查是否在目标日期
          const start = task.scheduledParam?.startTime || task.startTime;
          if (!start) return;
          const d = new Date(start);
          if (
            d.getFullYear() === targetDate.getFullYear() &&
            d.getMonth() === targetDate.getMonth() &&
            d.getDate() === targetDate.getDate()
          ) {
            dayTasks.push(task);
          }
        }
      });
      
      return parseTaskDates(dayTasks);
    }
    return [];
  }, [tasks, selectedDate]);

  // 渲染单个任务块 - 与index页面相同的逻辑
  const renderTimeBlock = useCallback(({ item }: { item: any }) => {
    const start = item.startTime instanceof Date ? item.startTime : null;
    const end = item.endTime instanceof Date ? item.endTime : null;
    const isNotDone = item.completed === false && end && end <= new Date();
    const isCompleted = item.completed === true;
    
    // 本地 UI 状态: 是否折叠和编辑模式
    const isFolded = foldState[item.id] ?? true;
    const inEdit = editState[item.id] ?? false;
    // 计算当前进度百分比
    const calculateProgress = () => {
      if (!start || !end || end <= start) return 0;
      
      const now = currentTime.getTime();
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      if (now < startTime) return 0;
      if (now > endTime) return 100;
      
      const progress = ((now - startTime) / (endTime - startTime)) * 100;
      return Math.max(0, Math.min(100, progress));
    };
    
    const progressPercentage = calculateProgress();
    
    // 判断是否是过去的日期
    const isPastDate = selectedDate < new Date(new Date().setHours(0, 0, 0, 0));
    
    // 根据任务状态确定样式
    const getTaskStyle = () => {
      if (isCompleted) {
        return {
          backgroundColor: "#e8f5e8",
          borderColor: "#28a745",
          borderWidth: 2,
          opacity: 0.8
        };
      } else if (isNotDone) {
        return {
          backgroundColor: "#ffeaea",
          borderColor: "#dc3545",
          borderWidth: 2,
        };
      } else {
        return {
          backgroundColor: "#ffffff",
          borderColor: "#e9ecef",
          borderWidth: 1,
        };
      }
    };
    
    // 获取任务状态显示文本
    const getStatusText = () => {
      if (isCompleted) return "DONE";
      if (isPastDate) return "OVERDUE";  // 过去日期未完成的都是OVERDUE
      if (isNotDone) return "OVERDUE";
      return "TODO";
    };
    
    // 获取状态背景色
    const getStatusColor = () => {
      if (isCompleted) return "#28a745";
      if (isPastDate) return "#dc3545";  // 过去日期未完成的都是红色
      if (isNotDone) return "#dc3545";
      return "#007bff";
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
        onLongPress={() => setEditState(prev => ({ ...prev, [item.id]: !inEdit }))}
        delayLongPress={500}
      >
        <View style={{ borderRadius: 10 }}>
          <View style={{ borderRadius: 10, overflow: "hidden", margin: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
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
                  <Text style={[styles.timeText, { fontSize: 12, marginTop: 2 }]}>
                    {start ? start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"} - {end ? end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "--:--"}
                  </Text>
                </View>
              </View>
              
              <View style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: getStatusColor()
              }}>
                <Text style={{ 
                  color: "#ffffff", 
                  fontSize: 10, 
                  fontWeight: "600"
                }}>
                  {getStatusText()}
                </Text>
              </View>
            </View>
            {!isFolded && (
              <View style={{ 
                marginTop: 12, 
                padding: 12,
                backgroundColor: "rgba(0,0,0,0.05)",
                borderRadius: 8,
                borderLeftWidth: 3,
                borderLeftColor: isCompleted ? "#28a745" : isPastDate ? "#dc3545" : isNotDone ? "#dc3545" : "#007bff"
              }}>
                <View style={{ marginBottom: 8 }}>
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
                
                {isNotDone && !inEdit && (
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
                      marginBottom: 8,
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      changeScheduleData(item.id, "completed", null);
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>Mark as Todo</Text>
                  </Pressable>
                )}
                
                {inEdit && (
                  <View style={{ 
                    flexDirection: "row", 
                    justifyContent: "space-between", 
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#e9ecef"
                  }}>
                    <Pressable
                      style={{ 
                        backgroundColor: "#28a745", 
                        borderRadius: 6, 
                        paddingVertical: 8, 
                        paddingHorizontal: 16,
                        marginRight: 8,
                        flex: 1,
                      }}
                      onPress={(e) => {
                        e.stopPropagation();
                        changeScheduleData(item.id, "completed", true);
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
                        Mark Done
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      style={{ 
                        backgroundColor: "#ffc107", 
                        borderRadius: 6, 
                        paddingVertical: 8, 
                        paddingHorizontal: 16,
                        marginRight: 8,
                        flex: 1,
                      }}
                      onPress={(e) => {
                        e.stopPropagation();
                        // 打开编辑界面或弹窗
                        console.log("Edit task:", item.id);
                        // 这里可以调用一个导航函数或显示一个模态框来编辑任务
                      }}
                    >
                      <Text style={{ color: "#000", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
                        Edit
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      style={{ 
                        backgroundColor: "#dc3545", 
                        borderRadius: 6, 
                        paddingVertical: 8, 
                        paddingHorizontal: 16,
                        flex: 1,
                      }}
                      onPress={(e) => {
                        e.stopPropagation();
                        // 这里可以添加删除任务的逻辑
                        console.log("Delete task:", item.id);
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600", textAlign: "center" }}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }, [currentTime, changeScheduleData]);

  const sortedScheduleData = useMemo(() => {
    return [...scheduleData].sort((a, b) => {
      const aStart = a.startTime instanceof Date ? convertTimeToMinutes(a.startTime) : 0;
      const bStart = b.startTime instanceof Date ? convertTimeToMinutes(b.startTime) : 0;
      return aStart - bStart;
    });
  }, [scheduleData]);

  return (
    <View style={styles.screen}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Text style={styles.screenTitle}>
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>
      
      {sortedScheduleData.length === 0 ? (
        <Text style={styles.noTasksText}>No tasks scheduled for this day</Text>
      ) : (
        <FlatList
          data={sortedScheduleData}
          keyExtractor={(item) => `day-${item.id || Math.random()}`}
          renderItem={renderTimeBlock}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  noTasksText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 50,
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
  taskNameText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  timeText: {
    fontSize: 16,
    color: "#666",
  },
  eventText: {
    fontSize: 14,
    color: "#555",
  },
});

export default DayView;