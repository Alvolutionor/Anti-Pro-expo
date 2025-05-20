// App.js
import React, { useEffect, useRef, useState } from "react";
import DeviceInfo from 'react-native-device-info';
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
} from "react-native";
import Swiper from "react-native-swiper";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { SwipeListView } from "react-native-swipe-list-view";

const genMockTimeblock = () => {
  return {
    id: 4,
    goal:1,
    name: "Task5",
    startTime: new Date(2025, 5, 8, 9, 0),
    endTime: new Date(2025, 5, 8, 10, 0),
    event: "上课",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
    },
    completed: null,
  };
};

const mockTasks = [
  {
    id: 1,
    goal:1,
    date: "2025-5-9",
    name: "Task 1",
    startTime: new Date(2025, 4, 9, 9, 0),
    endTime: new Date(2025, 4, 9, 11, 0),
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
    startTime: new Date(2025, 4, 9, 9, 0),
    endTime: new Date(2025, 4, 9, 10, 0),
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
const convertTimeToMinutes = (date) => {
  return date.getHours() * 60 + date.getMinutes();
};

//
const ScheduleScreen = ({}) => {
  const [scheduleData, setScheduleData] = useState(
    mockTasks.filter((task) => {
      const today = new Date()
      return task.startTime.getDate() == today.getDate() &&
      task.startTime.getMonth() == today.getMonth() &&
      task.startTime.getFullYear() == today.getFullYear()}).map((item) => {
      return {
        ...item,
        fold: true,
        editNDelete: false,
      };
    })
  );
  const [modalVisible, setModalVisible] = useState(false);

  const addToScheduleData = (timeBlock) => {
    const newData = [
      ...scheduleData,
      { ...timeBlock, fold: false, editNDelete: false },
    ];
    newData.sort((a, b) => a.startTime - b.startTime + 0.0001 * Math.sign(a.endTime - b.endTime));
    setScheduleData(newData);
  };
  const deleteFromScheduleData = (id) => {
    const newData = [...scheduleData].filter((item) => item.id !== id);
    newData.sort(
      (a, b) =>
        convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime)
    );
    setScheduleData(newData);
  };
  const changeScheduleData = (id, property, value) => {
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

  //tik trick
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1);
      if (count > 60) {
        setCount(0);
      }
    }, 1000); 
    return () => clearInterval(timer);
  }, [count]);
  function calculateTimeProgress(currentTime, startTime, endTime) {
    // 转换为时间戳（毫秒）
    const start = startTime.getTime();
    const end = endTime.getTime();
    const current = currentTime.getTime();
    // 处理异常时间范围
    if (start >= end) {
      return current >= start ? 1 : 0; // 无效时间段视为已结束或未开始
    }

    // 边界判断
    if (current <= start) return 0;
    if (current >= end) return 1;

    // 计算比例
    const totalDuration = end - start;
    const elapsedTime = current - start;
    return elapsedTime / totalDuration;
  }
  const renderTimeBlock = ({ item, index }) => {

    return (
      <Pressable
        style={[styles.timeBlock, { backgroundColor: "#DEF3FD" }]} //
        onPress={() => {
          changeScheduleData(item.id, "fold", !item.fold);
        }}
        onLongPress={() => {
          changeScheduleData(item.id, "editNDelete", !item.editNDelete);
        }}
        onBlur={() => {}}
      >
        <View
          style={{
            borderRadius: 10,
          }}
        >
          <View
            style={{
              // backgroundColor: "#",
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
              }}
            >
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
              <Text style={styles.timeText}>{item.event}</Text>
            </View>
            {!item.fold && (
              <View
                style={{
                  marginTop: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.eventText}>{item.details.description}</Text>
                {/* <View style={{ flexDirection: "row" }}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      console.log("");
                    }}
                  >
                    <AntDesign
                      name="checkcircleo" 
                      size={24}
                      color="green"
                      style={{ marginRight: 4 }}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <AntDesign name="closecircleo" size={24} color="red" />
                  </TouchableOpacity>
                </View> */}
              </View>
            )}
            {item.editNDelete && (
              <View>
                <TouchableOpacity
                // style={{
                //   position: "fixed",
                //   width: Dimensions.get("window").width,
                //   height: Dimensions.get("window").height,
                //   backgroundColor: "transparent",
                // }}
                // onPress={() => {
                //   changeScheduleData(item.id, "editNDelete", !item.editNDelete);
                // }}
                >
                  <TouchableOpacity onPress={() => {}}>
                    <Text>Edit</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {!item.editNDelete && item.fold && item.completed === null && (
            <View
              style={[
                {
                  borderRadius: 10,
                  position: "absolute",
                  height: "100%", //F89466
                  backgroundColor: "#F56727", //
                  opacity: 0.5,
                  width: `${(calculateTimeProgress(new Date(), item.startTime, item.endTime)  * 100).toFixed(1)}%` as DimensionValue,
                },
              ]}
            ></View>
          )}
        </View>
      </Pressable>
    );
  };
  const SWIPETHRESHOLD = 0.4 * Dimensions.get("window").width;
  const PERSISTENCE_DURATION = 200;
  const renderSwipeItem = ({ item, index }) => {
    return (
      <View
        style={{
          alignItems: "flex-end",
          flexDirection: "row-reverse",
          height: "78",
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

  return (
    <View style={styles.screen}>
      <View>
        <View style={{ flexDirection: "row", width: "100%" }}>
          <Text style={styles.screenTitle}>今日日程</Text>
          <Pressable
            style={[styles.button, styles.buttonOpen, styles.buttonAlignRight]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.textStyle}>+</Text>
          </Pressable>
        </View>
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            Alert.alert("Modal has been closed.");
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalText}>Hello World!</Text>

              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => addToScheduleData(genMockTimeblock())}
              >
                <Text style={styles.textStyle}>x</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonClose]}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={styles.textStyle}>x</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
      <Text style={styles.screenTitle}>Tasks TODO</Text>

      <SwipeListView
        data={scheduleData.filter((item) => item.completed === null)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        // rightOpenValue={-120}
        keyExtractor={(item) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", true);
          }, PERSISTENCE_DURATION);
        }}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", false);
          }, PERSISTENCE_DURATION);
        }}
      />

      <Text style={styles.screenTitle}>Tasks Completed</Text>

      <SwipeListView
        data={scheduleData.filter((item) => item.completed)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item) => item.id}
        rightActivationValue={-SWIPETHRESHOLD}
        onRightActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", false);
          }, PERSISTENCE_DURATION);
        }}
      />
      <Text style={styles.screenTitle}>Tasks Not Done</Text>

      <SwipeListView
        data={scheduleData.filter((item) => item.completed === false)}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        keyExtractor={(item) => item.id}
        leftActivationValue={SWIPETHRESHOLD}
        onLeftActionStatusChange={(rowData) => {
          setTimeout(() => {
            changeScheduleData(rowData.key, "completed", true);
          }, PERSISTENCE_DURATION);
        }}
      />
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
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  button: {
    borderRadius: 20,
    width: 40,
    padding: 10,
    elevation: 2,
    marginBottom: 20,
  },
  buttonOpen: {
    backgroundColor: "#F194FF",
  },
  buttonClose: {
    backgroundColor: "#2196F3",
  },
  buttonAlignRight: {
    marginLeft: "auto",
  },
  textStyle: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
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
});
