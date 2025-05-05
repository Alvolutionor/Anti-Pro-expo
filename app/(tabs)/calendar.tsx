import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View, StyleSheet, Text, Button } from "react-native";
import { Calendar } from "react-native-calendars";
import DropDownPicker from "react-native-dropdown-picker";

const mockTasks = [
    { id: 1, name: "Task 1", completed: false },
    { id: 2, name: "Task 2", completed: true },
    { id: 3, name: "Task 3", completed: false },
]

const CalendarTab = ({}) => {
  const [random, setRandom] = useState(Math.random().toString());
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(null);
  const [items, setItems] = useState([
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
    { label: "Pear", value: "pear" },
  ]);
  const markedDates = {
    "2023-10-15": {
      periods: [
        {
          startingDay: true,
          endingDay: false,
          color: "#ffa726", // 橙色时段
        },
        {
          startingDay: false,
          endingDay: true,
          color: "#4CAF50", // 绿色时段
        },
        {
          startingDay: false,
          endingDay: false,
          color: "#2196F3", // 蓝色时段（中间段）
        },
      ],
    },
    "2023-10-16": {
      periods: [
        { color: "#ffa726" }, // 单一橙色块
        { color: "#4CAF50", width: 0.5 }, // 窄绿色块（自定义宽度）
      ],
    },
  };
  const onPressRandom = () => {
    setRandom(Math.random().toString());
  };
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>月度计划</Text>
      <Button onPress={onPressRandom} title="Back to today" color="#8FD8F7" />
      <Calendar
        key={random}
        markedDates={markedDates}
        markingType={"multi-period"}
        theme={{
          calendarBackground: "#fff",
          selectedDayBackgroundColor: "#4a90e2",
        }}
        onDayPress={(day) => {
          router.push(`/day-view/${day.dateString}`);
        }}
      />
      <View>
        {/* style={{ flexDirection: "row", justifyContent: "space-between" }} */}
        <Text style={{marginTop: 15, marginBottom: 15}}>Show Task bar</Text>
        <DropDownPicker
          //   badgeColors={["white"]}
          multipleText={"{count} tasks selected"}
          multiple={true}
          open={open}
          value={value}
          items={items}
          setOpen={setOpen}
          setValue={setValue}
          setItems={setItems}
          placeholder={"Choose a task."}
          theme="LIGHT"
          mode="BADGE"
          // badgeDotColors={["#e76f51", "#00b4d8", "#e9c46a", "#e76f51", "#8ac926", "#00b4d8", "#e9c46a"]}
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
