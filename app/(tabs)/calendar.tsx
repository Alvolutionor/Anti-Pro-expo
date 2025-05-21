import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, StyleSheet, Text, Button } from "react-native";
import { Calendar } from "react-native-calendars";
import DropDownPicker from "react-native-dropdown-picker";

const mockGoals = [
  {
    id: 1,
    name: "Task 1",
    tasks: [1,2,6,5,8,9],
    description:"Learn React Native",
    achieved: false,
    lifePoints: 10,
    priority: 1,
    scheduled: "recurrent", //temp, by date, for period
    scheduled_param: 7, // null,  Date,  365(days)
    // userID: 1,
    //isDeleted: false, only in db
  },
  {
    id: 2,
    name: "Task 2",
    tasks: [3,4,7],
    description:"Learn React Native",
    achieved: false,
    lifePoints: 10,
    priority: 1,
    scheduled: "recurrent", //temp, by date, for period
    scheduled_param: 7, // null,  Date,  365(days)
    // userID: 1,
    //isDeleted: false, only in db
  },
];

const mockTasks = [
  {
    id: 1,
    goal:1,
    date: "2025-5-9",
    name: "Task 1",
    startTime: new Date(2025, 4, 9, 9, 0),
    endTime: new Date(2025, 5, 11, 11, 0),
    event: "吃饭",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
      subs: [],
    },
    completed: null,
    next: 4, //taskid
    dayPoints: 10,
    priority: 1,
    belongTo: 1, //goal id
  },
  {
    id: 2,
    goal: 1,
    date: "2025-10-15",
    name: "Task 1",
    startTime: new Date(2025, 4, 9, 9, 0),
    endTime: new Date(2025, 4, 9, 13, 0),
    event: "吃饭",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
      subs: [],
    },
    completed: null,
    next: 4, //taskid
    dayPoints: 10,
    priority: 1,
    belongTo: 1, //goal id
  },
  {
    id: 3,
    goal: 2,
    date: "2025-10-15",
    name: "Task 1",
    startTime: new Date(2025, 5, 29, 9, 0),
    endTime: new Date(2025, 5, 29, 10, 0),
    event: "吃饭",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
      subs: [],
    },
    completed: null,
    next: 4, //taskid
    dayPoints: 10,
    priority: 1,
    belongTo: 1, //goal id
  },
];


function convertTasksToMarkedDates(goals, colors) {
  const markedDatesByGoal = {};

  // Helper function to format a date as YYYY-MM-DD
  function getLocalISOString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  for (let index = 0; index < goals.length; index++) {
    const goal = goals[index];
    const goalColor = colors[index];
    const markedDates = {};

    // Check if the goal has tasks
    if (goal.tasks && goal.tasks.length > 0) {
      const processedDates = new Set(); // Track dates already processed for this goal

      for (const taskId of goal.tasks) {
        // Find the task in the mockTasks array
        const task = mockTasks.find((t) => t.id === taskId);
        if (!task || !task.startTime || !task.endTime) continue;

        const start = new Date(task.startTime);
        const end = new Date(task.endTime);
        if (start > end) continue; // Ignore invalid time ranges

        let currentStart = new Date(start);

        while (currentStart <= end) {
          const currentDate = getLocalISOString(currentStart);

          // Ensure only one line is drawn per goal per day
          if (processedDates.has(currentDate)) {
            currentStart.setDate(currentStart.getDate() + 1);
            currentStart.setHours(0, 0, 0, 0);
            continue;
          }

          const dayEnd = new Date(currentStart);
          dayEnd.setHours(23, 59, 59, 999);
          const currentEnd = dayEnd < end ? dayEnd : new Date(end);

          const period = {
            startingDay: currentStart.getTime() === start.getTime(), // Is this the task's start day?
            endingDay: currentEnd.getTime() === end.getTime(),       // Is this the task's end day?
            color: goalColor,
          };

          if (!markedDates[currentDate]) {
            markedDates[currentDate] = { periods: [] };
          }
          markedDates[currentDate].periods.push(period);

          // Mark this date as processed for the current goal
          processedDates.add(currentDate);

          // Move to the next day
          currentStart = new Date(currentEnd);
          currentStart.setDate(currentStart.getDate() + 1);
          currentStart.setHours(0, 0, 0, 0);
        }
      }
    }

    // Store markedDates for the current goal
    markedDatesByGoal[index] = markedDates;
  }
  function transformMarkedDatesToCalendarFormat(markedDatesArray) {
    const transformedMarkedDates = {};
  
    markedDatesArray.forEach(({ date, periods }) => {
      if (!transformedMarkedDates[date]) {
        transformedMarkedDates[date] = { periods: [] };
      }
      transformedMarkedDates[date].periods.push(...periods);
    });
  
    return transformedMarkedDates;
  }

  // Return a function to get markedDates by goal ID
  return (goalIds) => {
    const combinedMarkedDates = [];

    for (const goalId of goalIds) {
      const goalMarkedDates = markedDatesByGoal[goalId] || {};
      for (const [date, data] of Object.entries(goalMarkedDates)) {
        combinedMarkedDates.push({
          date,
          periods: data.periods,
        });
      }
    }
    // console.log("combinedMarkedDates", combinedMarkedDates[0].periods);

    return transformMarkedDatesToCalendarFormat(combinedMarkedDates);
  };
}
function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
function generateDistinctColors(count, options = {}) {
  const { 
      sMin = 70, 
      sMax = 90, 
      lMin = 60, 
      lMax = 80,
      seed = null  // 新增随机种子参数
  } = options;
  
  const colors = [];
  const goldenAngle = 137.508;
  
  // 可播种的随机数生成器
  const random = (seed !== null) ? 
      seededRandom(seed) : 
      { next: () => Math.random() };

  for (let i = 0; i < count; i++) {
      const hue = (i * goldenAngle) % 360;
      
      // 使用可控随机源生成参数
      const saturation = random.next() * (sMax - sMin) + sMin;
      const lightness = random.next() * (lMax - lMin) + lMin;

      colors.push(`${hslToHex(hue.toFixed(2), saturation.toFixed(2), lightness.toFixed(2))}`);
  }
  
  return colors;
}
function seededRandom(seed) {
  let state = seed;
  return {
      next: () => {
          state = (state * 9301 + 49297) % 233280;
          return state / 233280;
      }
  };
}

const CalendarTab = ({}) => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState([]);
  const [goals, setGoals] = useState(
    mockGoals.map((goal, index) => ({
      label: goal.name,
      value: index,
      id: goal.id,
    }))
  );
  const [colors, setColors] = useState(generateDistinctColors(goals.length));
  const [markedDates, setMarkedDates] = useState(
    convertTasksToMarkedDates(mockGoals, colors)(value)
  );

  useEffect(() => {
    const updatedMarkedDates = convertTasksToMarkedDates(mockGoals, colors)(value);
    setMarkedDates(updatedMarkedDates);
  }, [value, goals]);

  const onPressRefreshCalendar = () => {
    const today = new Date();
    setSelectedDate(today);

    const todayString = today.toISOString().split("T")[0]; // 格式化为 YYYY-MM-DD
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

          // 更新选中的日期
          setSelectedDate(new Date(selectedDayString));

          // 更新 markedDates
          const updatedMarkedDates = {
            ...markedDates,
            [selectedDayString]: {
              ...markedDates[selectedDayString],
              selected: true,
              selectedColor: "#4a90e2",
            },
          };

          setMarkedDates(updatedMarkedDates);

          // 跳转到 day-view 页面
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
          items={goals}
          setOpen={setOpen}
          setValue={setValue}
          setItems={setGoals}
          placeholder={"Choose a task."}
          theme="LIGHT"
          mode="BADGE"
          badgeDotColors={colors}
        />
      </View>
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
});

export default CalendarTab;
