// App.js
import React, { useState } from "react";
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
} from "react-native";
import Swiper from "react-native-swiper";
import AntDesign from "@expo/vector-icons/AntDesign";
import { Redirect, useRouter, useFocusEffect } from "expo-router";
import { SwipeListView } from "react-native-swipe-list-view";
// 生成当天时间块数据（示例数据）

const mockTasks = [
  {
    id: 1,
    name: "Task 1",
    startTime: "08:00",
    endTime: "09:00",
    event: "吃饭",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
    },
  },
  {
    id: 2,
    name: "Task 2",
    startTime: "09:00",
    endTime: "10:00",
    event: "上课",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
    },
  },
  {
    id: 3,
    name: "Task 3",
    startTime: "10:00",
    endTime: "11:00",
    event: "上课",
    details: {
      location: "https://www.google.com/maps/search/?api=1&query=lumen+field",
      description: "fruit",
    },
  },
];

// 主屏幕 - 时间块界面
const ScheduleScreen = ({ scheduleData, setScheduleData }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [fold, setFold] = useState(
    scheduleData.map((item) => {
      return true;
    })
  );
  const [editNDelete, setEditNDelete] = useState(
    scheduleData.map((item) => {
      return false;
    })
  );
  console.log(fold);
  const renderTimeBlock = ({ item, index }) => {
    return (
      <Pressable
        style={[styles.timeBlock, { backgroundColor: "#b3e5fc" }]}
        onPress={() => {
          const newfold = [];
          for (const i of fold) {
            newfold.push(i);
          }
          newfold[index] = !fold[index];
          console.log(newfold);
          setFold(newfold);
        }}
        onLongPress={() => {
          const newEditNDelete = [];
          for (const i of editNDelete) {
   -         newEditNDelete.push(i);
          }
          newEditNDelete[index] = !editNDelete[index];
          console.log(newEditNDelete);
          setEditNDelete(newEditNDelete);
        }}
        onBlur={() => {}}
      >
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 15,
              marginBottom: 15,
            }}
          >
            <Text style={styles.timeText}>{item.startTime} - {item.endTime}</Text>
            <Text style={styles.timeText}>{item.event}</Text>
          </View>
          {!fold[index] && (
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={styles.eventText}>{item.details.description}</Text>
              <View style={{ flexDirection: "row" }}>
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
                    console.log("");
                  }}
                >
                  <AntDesign name="closecircleo" size={24} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          {editNDelete[index] && (
            <View>
              <TouchableOpacity>
                <Text>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Pressable>
    );
  };
  const renderSwipeItem = ({ item, index }) => {
    console.log("renderHiddenItem", item, index);
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
            backgroundColor: "#FF9EB3",
            marginLeft: 10,
            justifyContent: "center",
            height: "100%", // 容器高度
          }}
        >
          <Text
            style={{
              textAlign: "center",
              width: "50",
            }}
          >
            Delete
          </Text>
        </Pressable>
        <Pressable
          style={{
            borderRadius: 10,
            backgroundColor: "#8FD8F7",
            justifyContent: "center",
            marginLeft: 10,
            height: "100%", // 容器高度
          }}
          onPress={() => {}}
        >
          <Text
            style={{
              textAlign: "center",
              width: "50",
            }}
          >
            Edit
          </Text>
        </Pressable>
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
        data={scheduleData}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        rightOpenValue={-120}
        keyExtractor={(item) => item.id}
      />

      <Text style={styles.screenTitle}>Tasks Completed</Text>

      <SwipeListView
        data={scheduleData}
        renderItem={renderTimeBlock}
        closeOnRowPress={true}
        renderHiddenItem={renderSwipeItem}
        rightOpenValue={-120}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
};

// 日历屏幕
export default function App() {
  const [scheduleData, setScheduleData] = useState(mockTasks);
  const [markedDates, setMarkedDates] = useState({
    "2025-03-20": {
      periods: [{ startingDay: true, endingDay: true, color: "#4a90e2" }],
    },
  });

  const handleAddEvent = (timeBlock) => {
    // 打开事件添加模态框的逻辑
    const newData = scheduleData.map((item) => {
      if (item.id === timeBlock.id) {
        return { ...item, event: "示例事件", color: "#b3e5fc" };
      }
      return item;
    });
    setScheduleData(newData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScheduleScreen
        scheduleData={scheduleData}
        setScheduleData={setScheduleData}
      />

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
    padding: 15,
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
