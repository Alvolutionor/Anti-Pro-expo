import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable } from "react-native";

const mockTasks = [
  {
    id: 1,
    goal: 1,
    date: "2025-05-09",
    name: "Task 1",
    startTime: new Date(2025, 4, 9, 9, 0),
    endTime: new Date(2025, 4, 9, 11, 0),
    tag: "Meeting",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "Discuss project updates",
    },
    completed: null,
  },
  {
    id: 2,
    goal: 1,
    date: "2025-05-09",
    name: "Task 2",
    startTime: new Date(2025, 4, 9, 12, 0),
    endTime: new Date(2025, 4, 9, 13, 0),
    tag: "Lunch",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "Team bonding lunch",
    },
    completed: null,
  },
  {
    id: 3,
    goal: 2,
    date: "2025-05-10",
    name: "Task 3",
    startTime: new Date(2025, 4, 10, 14, 0),
    endTime: new Date(2025, 4, 10, 16, 0),
    tag: "Study",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "Prepare for exams",
    },
    completed: null,
  },
];

const DayView = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams(); // 获取路由参数中的日期
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // 筛选出选定日期的任务
    const filteredTasks = mockTasks.filter(
      (task) => task.date === date
    );
    setTasks(filteredTasks);
  }, [date]);

  const renderTask = ({ item }) => (
    <TouchableOpacity
      style={styles.taskContainer}
      onPress={() => router.push(`/task-details/${item.id}`)} // 跳转到任务详情页面
    >
      <View style={styles.taskHeader}>
        <Text style={styles.taskName}>{item.name}</Text>
        <Text style={styles.taskTime}>
          {new Date(item.startTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}{" "}
          -{" "}
          {new Date(item.endTime).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </Text>
      </View>
      <Text style={styles.taskDescription}>{item.details.description}</Text>
    </TouchableOpacity>
  );

  const renderTimeBlock = ({ item }) => {
    return (
      <Pressable
        style={[
          styles.timeBlock,
          item.completed === true
            ? styles.completedTask
            : item.completed === false
            ? styles.incompleteTask
            : styles.pendingTask,
        ]}
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

            {/* 显示任务完成状态 */}
            <View style={{ marginTop: 10 }}>
              <Text
                style={[
                  styles.statusText,
                  item.completed === true
                    ? styles.completedStatus
                    : item.completed === false
                    ? styles.incompleteStatus
                    : styles.pendingStatus,
                ]}
              >
                {item.completed === true
                  ? "Completed"
                  : item.completed === false
                  ? "Not Completed"
                  : "Pending"}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Tasks for {date}</Text>
      {tasks.length > 0 ? (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTask}
        />
      ) : (
        <Text style={styles.noTasksText}>No tasks for this day.</Text>
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
    marginBottom: 20,
  },
  taskContainer: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  taskName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  taskTime: {
    fontSize: 16,
    color: "#666",
  },
  taskDescription: {
    fontSize: 14,
    color: "#555",
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
  completedTask: {
    backgroundColor: "#e8f5e9", // 绿色背景
    borderLeftWidth: 5,
    borderLeftColor: "#4caf50",
  },
  incompleteTask: {
    backgroundColor: "#ffebee", // 红色背景
    borderLeftWidth: 5,
    borderLeftColor: "#f44336",
  },
  pendingTask: {
    backgroundColor: "#fffde7", // 黄色背景
    borderLeftWidth: 5,
    borderLeftColor: "#ffeb3b",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  completedStatus: {
    color: "#4caf50",
  },
  incompleteStatus: {
    color: "#f44336",
  },
  pendingStatus: {
    color: "#ffeb3b",
  },
  timeText: {
    fontSize: 16,
    color: "#666",
  },
  taskNameText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  eventText: {
    fontSize: 14,
    color: "#555",
  },
});

export default DayView;