import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import dayjs from 'dayjs';
import store from '../store/store';
import { TaskOut, GoalOut } from './api';
import * as Speech from 'expo-speech';




// 发送一个简单的通知（带权限判断和通道注册）
export async function sendSimpleNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await setupNotificationChannel();
  
  // 立即显示通知
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification',
      body: 'This is a test notification!',
      sound: true,
    },
    trigger: null, // 立即显示
  });
}



// 注册通知通道（Android）
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

// 请求通知权限（iOS/Android）
export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    if (typeof window === 'undefined') return false;
    // 仅在前端环境弹窗
    alert('通知权限未开启，请在设置中允许通知权限，否则无法收到提醒');
    return false;
  }
  return true;
}

// 测试30秒后触发的任务通知（使用原生通知调度）
export async function testThirtySecondTaskNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  
  // 导入所需的API功能
  const { createTask } = require('./api');
  
  // 创建一个30秒后的测试任务
  const futureTime = new Date();
  futureTime.setSeconds(futureTime.getSeconds() + 30);
  
  try {
    // 创建实际任务
    const taskData = {
      name: "30秒后的测试任务",
      completed: false,
      priority: 1,
      tag: "Test",
      scheduledParam: {
        startTime: futureTime.toISOString(),
        endTime: new Date(futureTime.getTime() + 10 * 60000).toISOString(), // 任务持续10分钟
      },
      details: {
        description: "这是一个自动创建的测试任务，将在30秒后通过原生通知触发"
      }
    };
    
    // 调用API创建任务
    const response = await createTask(taskData);
    console.log("创建的30秒测试任务:", response.data);
    
    // 使用原生通知调度，而不是JavaScript定时器
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '任务开始',
        body: `现在开始：${taskData.name}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        badge: 1,
        data: { 
          type: 'task_start', 
          taskName: taskData.name, 
          taskTime: futureTime.toISOString() 
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 30, // 30秒后触发
        repeats: false,
      },
    });
    
    console.log(`30秒测试任务已创建，原生通知已调度，ID: ${notificationId}`);
    
    return notificationId;
  } catch (error) {
    console.error("创建30秒测试任务失败:", error);
    throw error;
  }
}

// 为所有未来的任务安排原生通知
export async function scheduleAllUpcomingTaskNotifications() {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.log("通知权限未获得，无法安排任务通知");
      return;
    }
    
    // 清除所有已安排的通知
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("已清除所有之前安排的通知");
    
    const state = store.getState();
    const tasks: TaskOut[] = state.task.tasks;
    const now = dayjs();
    
    if (!tasks || !Array.isArray(tasks)) {
      console.log("没有找到任务数据");
      return;
    }
    
    let scheduledCount = 0;
    
    for (const task of tasks) {
      const startTime = task.scheduledParam?.startTime;
      const endTime = task.scheduledParam?.endTime;
      
      if (!startTime || task.completed) continue;
      
      const startMoment = dayjs(startTime);
      const diffSeconds = startMoment.diff(now, 'second');
      
      // 只为未来的任务安排通知（最多7天内）
      if (diffSeconds > 0 && diffSeconds <= 7 * 24 * 60 * 60) {
        try {
          // 安排任务开始通知
          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: '任务开始',
              body: `现在开始：${task.name}`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              badge: 1,
              data: { 
                type: 'task_start', 
                taskName: task.name, 
                taskId: task.id,
                taskTime: startTime 
              },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: diffSeconds,
              repeats: false,
            },
          });
          
          console.log(`已为任务 "${task.name}" 安排通知，${diffSeconds}秒后触发，ID: ${notificationId}`);
          scheduledCount++;
          
          // 如果有结束时间，也安排结束通知
          if (endTime) {
            const endMoment = dayjs(endTime);
            const endDiffSeconds = endMoment.diff(now, 'second');
            
            if (endDiffSeconds > 0 && endDiffSeconds <= 7 * 24 * 60 * 60) {
              const endNotificationId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: '任务结束',
                  body: `${task.name} 已结束，请反馈完成情况`,
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  badge: 1,
                  data: { 
                    type: 'task_end', 
                    taskName: task.name, 
                    taskId: task.id,
                    taskTime: endTime 
                  },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                  seconds: endDiffSeconds,
                  repeats: false,
                },
              });
              
              console.log(`已为任务 "${task.name}" 安排结束通知，${endDiffSeconds}秒后触发，ID: ${endNotificationId}`);
              scheduledCount++;
            }
          }
        } catch (error) {
          console.error(`为任务 "${task.name}" 安排通知失败:`, error);
        }
      }
    }
    
    console.log(`总共为 ${scheduledCount} 个通知安排了原生调度`);
    return scheduledCount;
  } catch (error) {
    console.error("安排任务通知时出错:", error);
    return 0;
  }
}

// 修改后的测试1分钟任务通知函数
export async function testOneMinuteTaskNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) return null;
  
  // 导入所需的API功能
  const { createTask } = require('./api');
  
  // 创建一个1分钟后的测试任务
  const futureTime = new Date();
  futureTime.setMinutes(futureTime.getMinutes() + 1);
  
  try {
    // 创建实际任务
    const taskData = {
      name: "1分钟后的测试任务",
      completed: false,
      priority: 1,
      tag: "Test",
      scheduledParam: {
        startTime: futureTime.toISOString(),
        endTime: new Date(futureTime.getTime() + 30 * 60000).toISOString(), // 任务持续30分钟
      },
      details: {
        description: "这是一个自动创建的测试任务，将在1分钟后通过原生通知触发"
      }
    };
    
    // 调用API创建任务
    const response = await createTask(taskData);
    console.log("创建的任务:", response.data);
    
    // 使用原生通知调度，而不是JavaScript定时器
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '任务开始',
        body: `现在开始：${taskData.name}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        badge: 1,
        data: { 
          type: 'task_start', 
          taskName: taskData.name, 
          taskTime: futureTime.toISOString() 
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60, // 60秒后触发
        repeats: false,
      },
    });
    
    console.log(`1分钟测试任务已创建，原生通知已调度，ID: ${notificationId}`);
    
    return notificationId;
  } catch (error) {
    console.error("创建测试任务失败:", error);
    throw error; // 让错误传递给调用者，以便UI可以显示错误消息
  }
}
