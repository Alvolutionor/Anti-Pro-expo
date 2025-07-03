import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Button, Alert, FlatList, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import DropDownPicker from "react-native-dropdown-picker";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getGoals,
  getTasks,
  GoalOut,
  TaskOut,
  createGoal,
} from "../../utils/api"; // 假设你已在api.ts里导出类型和方法
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { setGoals } from '../../store/goalSlice';
import { setTasks } from '../../store/taskSlice';

// 支持无 goalId 任务（goalId 为空或 0）
function convertTasksToMarkedDates(goals: GoalOut[], tasks: TaskOut[], colors: string[]) {
  // 0 号 key 专门用于无 goalId 任务
  const markedDatesByGoal: Record<number, any> = {};

  function getLocalISOString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 先处理有 goalId 的任务
  for (let index = 0; index < goals.length; index++) {
    const goal = goals[index];
    // colors[0] 是无 goalId 任务色，goal.id 从 1 开始，需 colors[index+1]
    const goalColor = colors[index + 1] || colors[0];
    const markedDates: Record<string, any> = {};

    if (goal.id && tasks.length > 0) {
      const processedDates = new Set<string>();
      for (const task of tasks.filter((t) => t.goalId === goal.id)) {
        const startTime = task.scheduledParam?.startTime || task.startTime;
        const endTime = task.scheduledParam?.endTime || task.endTime;
        const scheduledType = task.scheduled || task.scheduledParam?.type;
        if (!startTime && scheduledType !== 'finishedby') continue;

        // 独立渲染 finishedby 类型：只渲染 endTime 当天为圆点
        if (scheduledType === 'finishedby' && endTime) {
          const endDate = getLocalISOString(new Date(endTime));
          if (!markedDates[endDate]) markedDates[endDate] = { periods: [], dots: [] };
          // 用 dots 数组渲染圆点，color 用 goalColor
          markedDates[endDate].dots = markedDates[endDate].dots || [];
          markedDates[endDate].dots.push({ color: goalColor, key: `finishby-${task.id}` });
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
  const noGoalColor = '#B2B09B'; // 可自定义颜色
  const markedDatesNoGoal: Record<string, any> = {};
  const processedDatesNoGoal = new Set<string>();
  for (const task of tasks.filter((t) => !t.goalId || t.goalId === 0)) {
    const startTime = task.scheduledParam?.startTime || task.startTime;
    const endTime = task.scheduledParam?.endTime || task.endTime;
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
    markedDatesArray.forEach(({ date, periods }) => {
      if (!transformedMarkedDates[date]) {
        transformedMarkedDates[date] = { periods: [] };
      }
      transformedMarkedDates[date].periods.push(...periods);
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
          periods: data.periods,
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
  console.log("Generated colors:", colors);
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
function getGoalColors(count: number) {
  const colors: string[] = [];
  colors.push('#B2B09B'); // 0 号色为无 goalId 任务
  for (let i = 0; i < count; i++) {
    colors.push(COLOR_PALETTE[i % COLOR_PALETTE.length]);
  }
  return colors;
}

const CalendarTab = ({}) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<number[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  // 已移除 add goal 相关 state

  // 直接用 reduxGoals 和 reduxTasks，无需本地 goals/tasks state
  const reduxGoals = useSelector((state: RootState) => state.goal.goals);
  const reduxTasks = useSelector((state: RootState) => state.task.tasks);

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

  // reduxGoals/reduxTasks 变化时刷新 UI
  useEffect(() => {
    const goalsList = reduxGoals;
    setColors(getGoalColors(goalsList.length));
    setValue([0, ...goalsList.map((g: GoalOut) => g.id)]);
    setMarkedDates(
      convertTasksToMarkedDates(
        goalsList,
        reduxTasks,
        getGoalColors(goalsList.length)
      )([0, ...goalsList.map((g: GoalOut) => g.id)])
    );
  }, [reduxGoals, reduxTasks]);

  // 目标选择变化时，刷新 markedDates
  useEffect(() => {
    if (reduxTasks.length && colors.length) {
      setMarkedDates(
        convertTasksToMarkedDates(
          reduxGoals,
          reduxTasks,
          colors
        )(value)
      );
    }
  }, [value, reduxGoals, reduxTasks, colors]);

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
        selectedColor: "#4a90e2",
      },
    };

    setMarkedDates(updatedMarkedDates);
  };

  // 已移除 add goal 相关函数
// 任务卡片组件，支持多标签、无开始/结束时间渲染为单日
const TaskCard = (({ task, color }) => {
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
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 6, padding: 10, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: color, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{task.name || '未命名任务'}</Text>
      {noTime && (
        <Text style={{ color: '#888', fontSize: 12 }}>单日任务</Text>
      )}
      {startTime && !noTime && (
        <Text style={{ color: '#888', fontSize: 12 }}>开始: {new Date(startTime).toLocaleString()}</Text>
      )}
      {endTime && !noTime && (
        <Text style={{ color: '#888', fontSize: 12 }}>结束: {new Date(endTime).toLocaleString()}</Text>
      )}
      {task.tags && Array.isArray(task.tags) && task.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
          {task.tags.map((tag: any, tagIdx: number) => (
            <Text
              key={tag.id || tagIdx}
              style={{
                backgroundColor: '#eee',
                color: '#666',
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
        <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>{typeof task.details === 'string' ? task.details : JSON.stringify(task.details)}</Text>
      )}
    </View>
  );
});
  // 头部组件单独渲染，FlatList 只渲染任务组
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.screenTitle}>Goals Overview</Text>
      <Button onPress={onPressRefreshCalendar} title="Back to today" color="#8FD8F7" />
      <Calendar
        markedDates={markedDates}
        markingType={"multi-period"}
        theme={{
          calendarBackground: "#fff",
          selectedDayBackgroundColor: "#4a90e2",
        }}
        onDayPress={(day) => {
          const selectedDayString = day.dateString;
          setSelectedDate(new Date(selectedDayString));
          router.push(`/day-view/${selectedDayString}`);
        }}
      />
      <View>
        <Text style={{ marginTop: 15, marginBottom: 15 }}>Show Task bar</Text>
        <DropDownPicker
          zIndex={1000} // 确保在其他元素之上
          multipleText="{count} bars selected"
          multiple={true}
          open={open}
          value={value}
          itemKey={"id"}
          items={[
            { label: "无目标任务", value: 0, id: 0 },
            ...reduxGoals.map((goal: GoalOut, idx: number) => ({ label: goal.name, value: goal.id, id: goal.id }))
          ]}
          setOpen={setOpen}
          setValue={setValue}
          setItems={() => {}}
          placeholder={"Choose a bar."}
          theme="LIGHT"
          mode="BADGE"
          badgeDotColors={[...colors, '#B2B09B']}
          listMode="SCROLLVIEW"
        />
      </View>
      {/* 渲染所有选中的分组（包括无目标任务）的任务列表 */}
      {value.map((goalId) => {
        if (goalId === 0) {
          const noGoalTasks = reduxTasks.filter((task: TaskOut) => !task.goalId || task.goalId === 0);
          return (
            <View key={0} style={{ marginTop: 10, padding: 10, backgroundColor: '#f7f7f7', borderRadius: 8 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#888' }}>无目标任务</Text>
              {noGoalTasks.length === 0 ? (
                <Text style={{ color: '#bbb' }}>暂无无目标任务</Text>
              ) : (
                noGoalTasks.map((task: TaskOut) => (
                  <TaskCard key={task.id} task={task} color={'#B2B09B'} />
                ))
              )}
            </View>
          );
        } else {
          const goal = reduxGoals.find((g: GoalOut) => g.id === goalId);
          const color = colors[reduxGoals.findIndex((g2: GoalOut) => g2.id === goalId) + 1] || '#007bff';
          const goalTasks = reduxTasks.filter((task: TaskOut) => task.goalId === goalId);
          return (
            <View key={goalId} style={{ marginTop: 10, padding: 10, backgroundColor: '#f7f7f7', borderRadius: 8 }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8, color }}>{goal ? goal.name : `目标${goalId}`}</Text>
              {goalTasks.length === 0 ? (
                <Text style={{ color: '#bbb' }}>暂无任务</Text>
              ) : (
                goalTasks.map((task: TaskOut) => (
                  <TaskCard key={task.id} task={task} color={color} />
                ))
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
