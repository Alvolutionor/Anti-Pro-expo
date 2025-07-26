import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, Text, Button, Alert, FlatList, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import { Ionicons, AntDesign } from '@expo/vector-icons';
import {
  getGoals,
  getTasks,
  GoalOut,
  TaskOut,
  createGoal,
  updateTask,
} from "../../utils/api"; // 假设你已在api.ts里导出类型和方法
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setGoals } from '../../store/goalSlice';
import { setTasks } from '../../store/taskSlice';
import { generatePeriodicTaskInstances } from '../../utils/time';

// 支持无 goalId 任务（goalId 为空或 0）以及 periodic 任务
function convertTasksToMarkedDates(goals: GoalOut[], tasks: TaskOut[], colorMap: Record<number, string>, hiddenTaskIds: Set<number> = new Set()) {
  // 0 号 key 专门用于无 goalId 任务
  const markedDatesByGoal: Record<number, any> = {};

  function getLocalISOString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 获取日历显示的日期范围（例如当前年份的所有日期）
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  // 处理所有任务，包括 periodic 任务扩展
  const allTaskInstances: any[] = [];
  
  tasks.forEach((task: any) => {
    // 跳过前端隐藏的任务
    if (hiddenTaskIds && hiddenTaskIds.has(task.id)) return;
    
    if (task.scheduled === 'periodic') {
      // 处理 periodic 任务 - 生成整年的实例
      const periodicInstances = generatePeriodicTaskInstances(task, startOfYear, endOfYear);
      allTaskInstances.push(...periodicInstances.map((instance: any) => ({
        ...instance,
        originalTask: task,
        goalId: task.goalId
      })));
    } else {
      // 处理 one-time 和 finishedby 任务
      allTaskInstances.push({
        ...task,
        originalTask: task,
        startTime: task.scheduledParam?.startTime,
        endTime: task.scheduledParam?.endTime
      });
    }
  });

  // 先处理有 goalId的任务
  for (let index = 0; index < goals.length; index++) {
    const goal = goals[index];
    // 使用 colorMap 获取对应颜色
    const goalColor = colorMap[goal.id] || colorMap[0];
    const markedDates: Record<string, any> = {};

    if (goal.id && allTaskInstances.length > 0) {
      const processedDates = new Set<string>();
      for (const taskInstance of allTaskInstances.filter((t) => t.goalId === goal.id)) {
        const startTime = taskInstance.startTime;
        const endTime = taskInstance.endTime;
        const scheduledType = taskInstance.originalTask?.scheduled;
        
        if (!startTime && scheduledType !== 'finishedby') continue;

        // 独立渲染 finishedby 类型：只渲染 endTime 当天为圆点
        if (scheduledType === 'finishedby' && endTime) {
          const endDate = getLocalISOString(new Date(endTime));
          if (!markedDates[endDate]) markedDates[endDate] = { periods: [], dots: [] };
          // 用 dots 数组渲染圆点，color 用 goalColor
          markedDates[endDate].dots = markedDates[endDate].dots || [];
          markedDates[endDate].dots.push({ color: goalColor, key: `finishby-${taskInstance.id || taskInstance.originalTask?.id}` });
          continue;
        }

        // 其它类型按原有下划线渲染
        if (!startTime || !endTime) continue;
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (start > end) continue;
        let currentStart = new Date(start);
        while (currentStart <= end) {
          const currentDate = getLocalISOString(currentStart);
          if (processedDates.has(currentDate)) {
            currentStart.setDate(currentStart.getDate() + 1);
            currentStart.setHours(0, 0, 0, 0);
            continue;
          }
          const dayEnd = new Date(currentStart);
          dayEnd.setHours(23, 59, 59, 999);
          const currentEnd = dayEnd < end ? dayEnd : new Date(end);
          const period = {
            startingDay: currentStart.getTime() === start.getTime(),
            endingDay: currentEnd.getTime() === end.getTime(),
            color: goalColor,
          };
          if (!markedDates[currentDate]) {
            markedDates[currentDate] = { periods: [] };
          }
          markedDates[currentDate].periods.push(period);
          processedDates.add(currentDate);
          currentStart = new Date(currentEnd);
          currentStart.setDate(currentStart.getDate() + 1);
          currentStart.setHours(0, 0, 0, 0);
        }
      }
    }
    markedDatesByGoal[goal.id] = markedDates;
  }

  // 处理无 goalId 任务（goalId 为空、null、0、undefined）
  const noGoalColor = '#666666'; // 可自定义颜色
  const markedDatesNoGoal: Record<string, any> = {};
  const processedDatesNoGoal = new Set<string>();
  for (const taskInstance of allTaskInstances.filter((t) => !t.goalId || t.goalId === 0)) {
    const startTime = taskInstance.startTime;
    const endTime = taskInstance.endTime;
    if (!startTime || !endTime) continue;
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start > end) continue;
    let currentStart = new Date(start);
    while (currentStart <= end) {
      const currentDate = getLocalISOString(currentStart);
      if (processedDatesNoGoal.has(currentDate)) {
        currentStart.setDate(currentStart.getDate() + 1);
        currentStart.setHours(0, 0, 0, 0);
        continue;
      }
      const dayEnd = new Date(currentStart);
      dayEnd.setHours(23, 59, 59, 999);
      const currentEnd = dayEnd < end ? dayEnd : new Date(end);
      const period = {
        startingDay: currentStart.getTime() === start.getTime(),
        endingDay: currentEnd.getTime() === end.getTime(),
        color: noGoalColor,
      };
      if (!markedDatesNoGoal[currentDate]) {
        markedDatesNoGoal[currentDate] = { periods: [] };
      }
      markedDatesNoGoal[currentDate].periods.push(period);
      processedDatesNoGoal.add(currentDate);
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
      currentStart.setHours(0, 0, 0, 0);
    }
  }
  markedDatesByGoal[0] = markedDatesNoGoal;

  function transformMarkedDatesToCalendarFormat(markedDatesArray: any[]) {
    const transformedMarkedDates: Record<string, any> = {};
    markedDatesArray.forEach(({ date, periods, dots }) => {
      if (!transformedMarkedDates[date]) {
        transformedMarkedDates[date] = { periods: [], dots: [] };
      }
      if (periods && periods.length > 0) {
        transformedMarkedDates[date].periods.push(...periods);
      }
      if (dots && dots.length > 0) {
        transformedMarkedDates[date].dots.push(...dots);
      }
    });
    return transformedMarkedDates;
  }

  // goalIds: 0 表示无 goalId 任务
  return (goalIds: number[]) => {
    const combinedMarkedDates: any[] = [];
    for (const goalId of goalIds) {
      const goalMarkedDates = markedDatesByGoal[goalId] || {};
      for (const [date, data] of Object.entries(goalMarkedDates)) {
        combinedMarkedDates.push({
          date,
          periods: (data as any).periods || [],
          dots: (data as any).dots || [],
        });
      }
    }
    return transformMarkedDatesToCalendarFormat(combinedMarkedDates);
  };
}

function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function generateDistinctColors(count: number, options = {}) {
  const {
    sMin = 70,
    sMax = 90,
    lMin = 60,
    lMax = 80,
    seed = null,
  } = options as any;

  const colors = [];
  const goldenAngle = 137.508;

  const random =
    seed !== null
      ? seededRandom(seed)
      : { next: () => Math.random() };

  for (let i = 0; i < count; i++) {
    const hue = (i * goldenAngle) % 360;
    const saturation = random.next() * (sMax - sMin) + sMin;
    const lightness = random.next() * (lMax - lMin) + lMin;

    colors.push(
      `${hslToHex(
        Number(hue.toFixed(2)),
        Number(saturation.toFixed(2)),
        Number(lightness.toFixed(2))
      )}`
    );
  }
  return colors;
}
function seededRandom(seed: number) {
  let state = seed;
  return {
    next: () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    },
  };
}

// 推荐固定色板，保证每个 badge 颜色都明显区分
const COLOR_PALETTE = [
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#6BCB77', // Green
  '#4D96FF', // Blue
  '#A66CFF', // Purple
  '#FF922B', // Orange
  '#43C6AC', // Teal
  '#FF5EAE', // Pink
  '#5F6CAF', // Indigo
  '#B2B09B', // Olive
];

// 用固定色板分配颜色，数量不够时循环。第 0 个为无 goalId 任务专用色
function getGoalColors(goals: GoalOut[]) {
  const colorMap: Record<number, string> = {};
  colorMap[0] = '#666666'; // 0 号色为无 goalId 任务
  
  goals.forEach((goal, index) => {
    colorMap[goal.id] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  });
  
  return colorMap;
}

const CalendarTab = ({}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]); // 多选的目标索引数组
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // 控制下拉菜单显示
  const [colorMap, setColorMap] = useState<Record<number, string>>({});
  const [markedDates, setMarkedDates] = useState<any>({});
  const [expandedGoalIds, setExpandedGoalIds] = useState<Set<number>>(new Set());
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<number>>(new Set()); // 前端隐藏的任务ID集合
  // 直接用 reduxGoals 和 reduxTasks，无需本地 goals/tasks state
  const reduxGoals = useSelector((state: RootState) => state.goal.goals);
  const reduxTasks = useSelector((state: RootState) => state.task.tasks);

  // 将选中的索引转换为实际的目标ID数组
  const getSelectedGoalIds = () => {
    return selectedIndices.map(index => {
      if (index === 0) return 0; // 无分类任务
      return reduxGoals[index - 1]?.id || 0; // 索引1对应第一个目标
    });
  };

  // 只在挂载时请求 goals 和 tasks
  useEffect(() => {
    getGoals().then(res => {
      if (res && res.data) {
        dispatch(setGoals(res.data));
      }
    });
    getTasks().then(res => {
      if (res && res.data) {
        dispatch(setTasks(res.data));
      }
    });
    // eslint-disable-next-line
  }, []);

  // 在 goals 列表变化时更新配色并重置默认选中的目标索引
  useEffect(() => {
    const goalsList = reduxGoals;
    const newColorMap = getGoalColors(goalsList);
    setColorMap(newColorMap);
    // 默认全选所有目标（包括 0 表示无分类）
    setSelectedIndices([0, ...goalsList.map((g: GoalOut, idx: number) => idx + 1)]);
  }, [reduxGoals]);

  // 同步任务数据
  useEffect(() => {
    if (reduxTasks.length && Object.keys(colorMap).length) {
      const selectedGoalIds = getSelectedGoalIds();
      setMarkedDates(
        convertTasksToMarkedDates(
          reduxGoals,
          reduxTasks,
          colorMap,
          hiddenTaskIds
        )(selectedGoalIds)
      );
    }
  }, [selectedIndices, reduxGoals, reduxTasks, colorMap, hiddenTaskIds]);

  // 同步任务数据
  useFocusEffect(
    React.useCallback(() => {
      getTasks().then(res => {
        if (res && res.data) {
          dispatch(setTasks(res.data));
        }
      });
    }, [dispatch])
  );

  const onPressRefreshCalendar = () => {
    const today = new Date();
    setSelectedDate(today);

    const todayString = today.toISOString().split("T")[0];
    const updatedMarkedDates = {
      ...markedDates,
      [todayString]: {
        ...markedDates[todayString],
        selected: true,
        selectedColor: "#000000",
      },
    };

    setMarkedDates(updatedMarkedDates);
  };

  const toggleGoalExpansion = (goalId: number) => {
    setExpandedGoalIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };


  // 任务卡片组件，支持多标签、无开始/结束时间渲染为单日
  const TaskCard = ({ task, color }: { task: TaskOut; color: string }) => {
    const [folded, setFolded] = useState(true);
    
    // 判断是否无开始/结束时间
    const noTime = !task.scheduledParam?.startTime && !task.scheduledParam?.endTime;
    let startTime = task.scheduledParam?.startTime;
    let endTime = task.scheduledParam?.endTime;
    // 若无开始/结束时间，渲染为单日任务（用 createdAt 或 today）
    if (noTime) {
      const singleDay = task.createdAt ? new Date(task.createdAt) : new Date();
      startTime = singleDay.toISOString();
      endTime = singleDay.toISOString();
    }

    // 判断是否有详细信息需要显示
    const hasDetails = (task.tags && task.tags.length > 0) || task.details || (!noTime && (startTime || endTime));

    return (
      <View style={{
        backgroundColor: '#ffffff',
        borderRadius: 6,
        padding: 8,
        marginBottom: 6,
        borderLeftWidth: 4,
        borderLeftColor: color,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 2,
        elevation: 1,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 日历显示控制复选框 */}
          <TouchableOpacity
            style={{
              width: 24,
              height: 24,
              borderWidth: 2,
              borderColor: hiddenTaskIds.has(task.id) ? '#ccc' : '#4a90e2',
              backgroundColor: hiddenTaskIds.has(task.id) ? 'transparent' : '#4a90e2',
              borderRadius: 3,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12
            }}
            onPress={() => {
              setHiddenTaskIds(prev => {
                const newSet = new Set(prev);
                if (newSet.has(task.id)) {
                  newSet.delete(task.id); // 显示任务
                } else {
                  newSet.add(task.id); // 隐藏任务
                }
                return newSet;
              });
            }}
            activeOpacity={0.7}
          >
            {!hiddenTaskIds.has(task.id) && (
              <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>✓</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              if (!hasDetails) return;
              setFolded(!folded);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}
          >
            <Text style={{ fontWeight: 'bold', fontSize: 14, flex: 1 }}>{task.name || '未命名任务'}</Text>
            {hasDetails && (
              <Ionicons
                name={folded ? 'chevron-forward' : 'chevron-down'}
                size={16}
                color="#666666"
              />
            )}
          </TouchableOpacity>
        </View>
        
        {!folded && hasDetails && (
          <View style={{ marginTop: 8 }}>
            {noTime && (
              <Text style={{ color: '#666666', fontSize: 12 }}>单日任务</Text>
            )}
            {startTime && !noTime && (
              <Text style={{ color: '#666666', fontSize: 12 }}>
                开始: {new Date(startTime).toLocaleString('zh-CN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            )}
            {endTime && !noTime && (
              <Text style={{ color: '#666666', fontSize: 12 }}>
                结束: {new Date(endTime).toLocaleString('zh-CN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </Text>
            )}
            {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                {task.tags.map((tag: any, tagIdx: number) => (
                  <Text
                    key={tag.id || tagIdx}
                    style={{
                      backgroundColor: '#f8f9fa',
                      color: '#666666',
                      borderRadius: 4,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      fontSize: 12,
                      marginRight: 4,
                      marginBottom: 2,
                    }}
                  >
                    {tag.name || tag}
                  </Text>
                ))}
              </View>
            )}
            {task.details && (
              <View style={{ marginTop: 4 }}>
                {typeof task.details === 'string' ? (
                  <Text style={{ color: '#666666', fontSize: 12 }}>{task.details}</Text>
                ) : (
                  Object.entries(task.details).map(([key, value]) => (
                    <Text key={key} style={{ color: '#666666', fontSize: 12 }}>
                      {key}: {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </Text>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };
  
  // 头部组件单独渲染，FlatList 只渲染任务组
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.screenTitle}>Goals Overview</Text>
      <TouchableOpacity onPress={onPressRefreshCalendar} style={{ backgroundColor: "#000000", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 4, alignItems: "center", marginVertical: 8 }}>
        <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "500" }}>Back to today</Text>
      </TouchableOpacity>
      <Calendar
        markedDates={markedDates}
        markingType={"multi-period"}
        theme={{
          calendarBackground: "#fff",
          selectedDayBackgroundColor: "#000000",
        }}
        onDayPress={(day) => {
          const selectedDayString = day.dateString;
          setSelectedDate(new Date(selectedDayString));
          router.push(`/day-view/${selectedDayString}`);
        }}
      />
      <View>
        <Text style={{ marginTop: 15, marginBottom: 15 }}>Show Task bar</Text>
        
        {/* 自定义多选下拉组件 */}
        <View style={styles.customDropdownContainer}>
          <Text style={styles.dropdownLabel}>Select Goals to Display:</Text>
          
          {/* 下拉触发按钮 */}
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setIsDropdownOpen(!isDropdownOpen);
            }}
          >
            <Text style={styles.dropdownTriggerText}>
              {selectedIndices.length === 0 
                ? 'Select goals...' 
                : `${selectedIndices.length} goal${selectedIndices.length > 1 ? 's' : ''} selected`}
            </Text>
            <Ionicons 
              name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>

          {/* 下拉选项列表 */}
          {isDropdownOpen && (
            <View style={styles.dropdownList}>
              {/* 全选/取消全选按钮 */}
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => {
                  const allIndices = [0, ...reduxGoals.map((g: GoalOut, idx: number) => idx + 1)];
                  if (selectedIndices.length === allIndices.length) {
                    setSelectedIndices([]); // 取消全选
                  } else {
                    setSelectedIndices(allIndices); // 全选
                  }
                }}
              >
                <Text style={styles.selectAllText}>
                  {selectedIndices.length === reduxGoals.length + 1 ? '取消全选' : '全选'}
                </Text>
              </TouchableOpacity>

              {/* 无分类任务选项 */}
              <TouchableOpacity
                style={[
                  styles.dropdownOption,
                  selectedIndices.includes(0) && styles.dropdownOptionSelected
                ]}
                onPress={() => {
                  setSelectedIndices(prev => {
                    const newIndices = prev.includes(0) 
                      ? prev.filter(i => i !== 0)
                      : [...prev, 0];
                    return newIndices;
                  });
                }}
              >
                <View style={[styles.optionBadge, { backgroundColor: colorMap[0] || '#666666' }]} />
                <Text style={styles.optionText}>Uncategorized tasks</Text>
                {selectedIndices.includes(0) && (
                  <Ionicons name="checkmark" size={18} color="#4a90e2" />
                )}
              </TouchableOpacity>

              {/* 目标选项 */}
              {reduxGoals.map((goal: GoalOut, idx: number) => {
                const itemIndex = idx + 1;
                const isSelected = selectedIndices.includes(itemIndex);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.dropdownOption,
                      isSelected && styles.dropdownOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedIndices(prev => {
                        const newIndices = prev.includes(itemIndex)
                          ? prev.filter(i => i !== itemIndex)
                          : [...prev, itemIndex];
                        return newIndices;
                      });
                    }}
                  >
                    <View style={[styles.optionBadge, { backgroundColor: colorMap[goal.id] || '#007bff' }]} />
                    <Text style={styles.optionText}>{goal.name}</Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="#4a90e2" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* 渲染所有选中的分组（包括无目标任务）的任务列表 */}
      {getSelectedGoalIds().map((goalId: number) => {
        if (goalId === 0) {
          const noGoalTasks = reduxTasks.filter((task: TaskOut) => 
            (!task.goalId || task.goalId === 0)
          );
          const expanded = expandedGoalIds.has(0);
          const noGoalColor = colorMap[0] || '#666666'; // 使用 colorMap 中的无目标任务颜色
          return (
            <View key={0} style={{ marginTop: 10, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
              <TouchableOpacity
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  padding: 10,
                  justifyContent: 'space-between'
                }}
                onPress={() => toggleGoalExpansion(0)}
              >
                <Text style={{ fontWeight: '500', color: noGoalColor, flex: 1 }}>
                  Uncategorized tasks ({noGoalTasks.length})
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-down' : 'chevron-forward'}
                  size={20}
                  color={noGoalColor}
                />
              </TouchableOpacity>
              {expanded && (
                <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                  {/* 分组任务全选控制 */}
                  <TouchableOpacity
                    style={[styles.selectAllButton, { marginBottom: 10 }]}
                    onPress={() => {
                      const uncategorizedTaskIds = noGoalTasks.map(task => task.id);
                      const allHidden = uncategorizedTaskIds.every(id => hiddenTaskIds.has(id));
                      
                      setHiddenTaskIds(prev => {
                        const newSet = new Set(prev);
                        if (allHidden) {
                          // 如果全部隐藏，则显示全部
                          uncategorizedTaskIds.forEach(id => newSet.delete(id));
                        } else {
                          // 如果有显示的，则隐藏全部
                          uncategorizedTaskIds.forEach(id => newSet.add(id));
                        }
                        return newSet;
                      });
                    }}
                  >
                    <Text style={[styles.selectAllText, { fontSize: 12 }]}>
                      {noGoalTasks.every(task => hiddenTaskIds.has(task.id)) 
                        ? 'Show All in Calendar' 
                        : 'Hide All from Calendar'}
                    </Text>
                  </TouchableOpacity>

                  {noGoalTasks.length === 0 ? (
                    <Text style={{ color: '#bbb' }}>No tasks</Text>
                  ) : (
                    noGoalTasks.map((task: TaskOut) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        color={noGoalColor}
                      />
                    ))
                  )}
                </View>
              )}
            </View>
          );
        } else {
          const goal = reduxGoals.find((g: GoalOut) => g.id === goalId);
          const color = colorMap[goalId] || '#007bff'; // 直接使用 goalId 获取颜色
          const goalTasks = reduxTasks.filter((task: TaskOut) => 
            task.goalId === goalId
          );
          const expanded = expandedGoalIds.has(goalId);
          return (
            <View key={goalId} style={{ marginTop: 10, backgroundColor: '#f7f7f7', borderRadius: 8 }}>
              <TouchableOpacity
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  padding: 10,
                  justifyContent: 'space-between'
                }}
                onPress={() => toggleGoalExpansion(goalId)}
              >
                <Text style={{ fontWeight: 'bold', color, flex: 1 }}>
                  {goal ? goal.name : `目标${goalId}`} ({goalTasks.length})
                </Text>
                <Ionicons
                  name={expanded ? 'chevron-down' : 'chevron-forward'}
                  size={20}
                  color={color}
                />
              </TouchableOpacity>
              {expanded && (
                <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                  {/* 分组任务全选控制 */}
                  <TouchableOpacity
                    style={[styles.selectAllButton, { marginBottom: 10 }]}
                    onPress={() => {
                      const goalTaskIds = goalTasks.map(task => task.id);
                      const allHidden = goalTaskIds.every(id => hiddenTaskIds.has(id));
                      
                      setHiddenTaskIds(prev => {
                        const newSet = new Set(prev);
                        if (allHidden) {
                          // 如果全部隐藏，则显示全部
                          goalTaskIds.forEach(id => newSet.delete(id));
                        } else {
                          // 如果有显示的，则隐藏全部
                          goalTaskIds.forEach(id => newSet.add(id));
                        }
                        return newSet;
                      });
                    }}
                  >
                    <Text style={[styles.selectAllText, { fontSize: 12 }]}>
                      {goalTasks.every(task => hiddenTaskIds.has(task.id)) 
                        ? 'Show All in Calendar' 
                        : 'Hide All from Calendar'}
                    </Text>
                  </TouchableOpacity>

                  {goalTasks.length === 0 ? (
                    <Text style={{ color: '#bbb' }}>暂无任务</Text>
                  ) : (
                    goalTasks.map((task: TaskOut) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        color={color}
                      />
                    ))
      )}
                </View>
              )}
            </View>
          );
        }
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  pickerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  picker: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginBottom: 12,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  selectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  multiSelectContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  multiSelectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  multiSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  multiSelectItemSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4a90e2',
  },
  multiSelectItemText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  badge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  
  // 自定义下拉组件样式
  customDropdownContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    padding: 12,
    minHeight: 48,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginTop: 8,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectAllButton: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a90e2',
    textAlign: 'center',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  dropdownOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  optionBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  
  detailPickerTouchable: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#f8f8f8',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  detailPickerDropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbb',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 100,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  detailPickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

export default CalendarTab;
