import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Button, Alert, Modal, TextInput, TouchableOpacity } from "react-native";
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

function convertTasksToMarkedDates(goals: GoalOut[], tasks: TaskOut[], colors: string[]) {
  const markedDatesByGoal: Record<number, any> = {};

  function getLocalISOString(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  for (let index = 0; index < goals.length; index++) {
    const goal = goals[index];
    const goalColor = colors[index];
    const markedDates: Record<string, any> = {};

    if (goal.id && tasks.length > 0) {
      const processedDates = new Set<string>();

      for (const task of tasks.filter((t) => t.goalId === goal.id)) {
        if (!task.startTime || !task.endTime) continue;

        const start = new Date(task.startTime);
        const end = new Date(task.endTime);
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

// 用固定色板分配颜色，数量不够时循环
function getGoalColors(count: number) {
  const colors: string[] = [];
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
  const [addGoalVisible, setAddGoalVisible] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [newGoalAchieved, setNewGoalAchieved] = useState(false);
  const [newGoalLifePoints, setNewGoalLifePoints] = useState<string>("");
  const [newGoalPriority, setNewGoalPriority] = useState<string>("");

  // 直接用 reduxGoals 和 reduxTasks，无需本地 goals/tasks state
  const reduxGoals = useSelector((state: RootState) => state.goal.goals);
  const reduxTasks = useSelector((state: RootState) => state.task.tasks);

  // 拉取目标和任务
  useEffect(() => {
    async function fetchData() {
      let goalsRes: any = undefined;
      try {
        // 如果 reduxGoals 为空，主动拉取 goals 并同步 redux
        if (!reduxGoals.length) {
          goalsRes = await getGoals();
          if (goalsRes && goalsRes.data) {
            dispatch(setGoals(goalsRes.data));
          }
        }
        const goalsList = reduxGoals.length ? reduxGoals : goalsRes?.data || [];
        setColors(getGoalColors(goalsList.length));
        setValue(goalsList.map((g: GoalOut) => g.id));
        setMarkedDates(
          convertTasksToMarkedDates(
            goalsList,
            reduxTasks,
            getGoalColors(goalsList.length)
          )(goalsList.map((g: GoalOut) => g.id))
        );
      } catch (e) {
        Alert.alert("加载失败", String(e));
      }
    }
    fetchData();
  }, [reduxGoals, reduxTasks]);

  // 目标选择变化时，刷新 markedDates
  useEffect(() => {
    if (reduxGoals.length && reduxTasks.length && colors.length) {
      setMarkedDates(
        convertTasksToMarkedDates(
          reduxGoals,
          reduxTasks,
          colors
        )(value)
      );
    }
  }, [value, reduxGoals, reduxTasks, colors]);

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

  const handleAddGoal = async () => {
    if (!newGoalName.trim()) {
      Alert.alert("Name is required");
      return;
    }
    setAddingGoal(true);
    try {
      await createGoal({
        name: newGoalName,
        description: newGoalDesc,
        achieved: newGoalAchieved,
        lifePoints: newGoalLifePoints ? Number(newGoalLifePoints) : undefined,
        priority: newGoalPriority ? Number(newGoalPriority) : undefined,
      });
      setAddGoalVisible(false);
      setNewGoalName("");
      setNewGoalDesc("");
      setNewGoalAchieved(false);
      setNewGoalLifePoints("");
      setNewGoalPriority("");
      // Refresh goals
      const goalsRes = await getGoals();
      console.log(goalsRes.data);
      const goalsData: GoalOut[] = goalsRes.data;
      setColors(getGoalColors(goalsData.length));
      setValue(goalsData.map((g) => g.id));
    } catch (e) {
      Alert.alert("Failed to add goal", String(e));
    } finally {
      setAddingGoal(false);
    }
  };

  return (
    <View style={styles.screen}>
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
          // 不再设置 selected/selectedColor，点击后不变色
          router.push(`/day-view/${selectedDayString}`);
        }}
      />
      <View>
        <Text style={{ marginTop: 15, marginBottom: 15 }}>Show Task bar</Text>
        <DropDownPicker
          multipleText="{count} goals selected"
          multiple={true}
          open={open}
          value={value}
          itemKey={"id"}
          items={reduxGoals.map((goal: GoalOut) => ({ label: goal.name, value: goal.id, id: goal.id }))}
          setOpen={setOpen}
          setValue={setValue}
          setItems={() => {}}
          placeholder={"Choose a goal."}
          theme="LIGHT"
          mode="BADGE"
          badgeDotColors={colors}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", margin: 8 }}>
        <Button title="Add Goal" onPress={() => setAddGoalVisible(true)} />
      </View>
      <Modal visible={addGoalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "#fff", padding: 24, borderRadius: 12, width: 300 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>Add Goal</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 }}
              placeholder="Goal Name (e.g. Fitness)"
              value={newGoalName}
              onChangeText={setNewGoalName}
              maxLength={32}
              autoCapitalize="words"
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12, minHeight: 40 }}
              placeholder="Description (e.g. Run 3 times a week)"
              value={newGoalDesc}
              onChangeText={setNewGoalDesc}
              multiline
              maxLength={100}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ marginRight: 8 }}>Achieved:</Text>
              <Button title={newGoalAchieved ? "Yes" : "No"} onPress={() => setNewGoalAchieved(v => !v)} />
            </View>
            <TextInput
              style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 }}
              placeholder="Life Points (number, e.g. 10)"
              value={newGoalLifePoints}
              onChangeText={v => setNewGoalLifePoints(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={6}
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 }}
              placeholder="Priority (number, e.g. 1)"
              value={newGoalPriority}
              onChangeText={v => setNewGoalPriority(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={2}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity onPress={() => setAddGoalVisible(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddGoal} disabled={addingGoal}>
                <Text style={{ color: addingGoal ? "#aaa" : "#007bff", fontSize: 16 }}>{addingGoal ? "Adding..." : "Add"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
