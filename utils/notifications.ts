import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';
import dayjs from 'dayjs';
import store from '../store/store';
import { TaskOut, GoalOut } from './api';
import * as Speech from 'expo-speech';

// 语音播报设置
const VOICE_CONFIG = {
  language: 'zh-CN', // 中文语音
  pitch: 1.0,
  rate: 0.8, // 稍慢的语速便于理解
  volume: 1.0,
};

// 语音播报功能
export async function speakNotification(title: string, body: string, options?: Speech.SpeechOptions) {
  try {
    console.log("准备语音播报:", title, body);
    
    // 检查语音功能是否可用
    const available = await Speech.isSpeakingAsync();
    if (available) {
      console.log("当前正在播报，停止之前的语音");
      await Speech.stop();
    }
    
    // 组合要播报的内容
    const textToSpeak = `${title}。${body}`;
    
    // 使用配置进行语音播报
    const speakOptions: Speech.SpeechOptions = {
      ...VOICE_CONFIG,
      ...options, // 允许外部覆盖配置
      onStart: () => console.log("开始语音播报:", textToSpeak),
      onDone: () => console.log("语音播报完成"),
      onStopped: () => console.log("语音播报被停止"),
      onError: (error) => console.error("语音播报错误:", error),
    };
    
    await Speech.speak(textToSpeak, speakOptions);
    console.log("语音播报已启动");
    
  } catch (error) {
    console.error("语音播报失败:", error);
  }
}

// 停止语音播报
export async function stopSpeaking() {
  try {
    const isSpeaking = await Speech.isSpeakingAsync();
    if (isSpeaking) {
      await Speech.stop();
      console.log("已停止语音播报");
    }
  } catch (error) {
    console.error("停止语音播报失败:", error);
  }
}

// 测试语音播报功能
export async function testVoiceNotification() {
  console.log("开始测试语音通知");
  await speakNotification(
    "语音测试", 
    "这是一个语音通知测试，如果您能听到这段话，说明语音功能正常工作"
  );
}
// 发送一个简单的通知（带权限判断和通道注册）
export async function sendSimpleNotification() {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await setupNotificationChannel();
  
  const title = 'Test Notification';
  const body = 'This is a test notification!';
  
  // 立即显示通知
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // 立即显示
  });
  
  // 同时进行语音播报
  await speakNotification(title, body);
}

// 测试通知函数 - 临时使用（包含语音播报）
export async function scheduleTestNotification() {
  console.log("开始测试通知函数");
  
  const granted = await requestNotificationPermission();
  console.log("权限检查结果:", granted);
  if (!granted) {
    throw new Error('通知权限未授权');
  }
  
  await setupNotificationChannel();
  console.log("通知通道设置完成");
  
  const title = '🔔 通知测试';
  const body = `测试时间: ${new Date().toLocaleTimeString()} - 通知系统正常工作!`;
  
  // 立即发送一个测试通知
  console.log("准备发送立即通知...");
  const immediateNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { type: 'test' },
    },
    trigger: null, // 立即显示
  });
  console.log("立即通知已安排，ID:", immediateNotificationId);
  
  // 立即进行语音播报
  await speakNotification(title, body);
  
  const delayedTitle = '⏰ 延迟测试通知';
  const delayedBody = '这是一个5秒延迟的测试通知';
  
  // 5秒后再发送一个延迟通知
  console.log("准备安排延迟通知...");
  const delayedNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: delayedTitle,
      body: delayedBody,
      sound: true,
      data: { type: 'delayed_test', hasVoice: true },
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5 
    },
  });
  console.log("延迟通知已安排，ID:", delayedNotificationId);
  
  // 检查已安排的通知
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  console.log("当前已安排的通知数量:", scheduledNotifications.length);
  console.log("已安排通知详情:", scheduledNotifications);
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

// 通知监听器 - 处理通知接收时的语音播报
export function setupNotificationHandler() {
  console.log("设置通知处理器");
  
  // 设置通知接收监听器
  Notifications.addNotificationReceivedListener((notification) => {
    console.log("收到通知:", notification);
    
    const { title, body, data } = notification.request.content;
    
    // 检查通知数据，决定是否需要语音播报
    if (data?.hasVoice !== false) { // 默认开启语音播报，除非明确设置为false
      console.log("准备为收到的通知进行语音播报");
      speakNotification(title || "通知", body || "");
    }
  });
  
  // 设置通知响应监听器（用户点击通知时）
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("用户响应通知:", response);
    
    const { title, body, data } = response.notification.request.content;
    
    // 如果通知包含任务信息，可以在这里添加特殊处理逻辑
    if (data?.type === 'task_start') {
      console.log("用户点击了任务开始通知:", data.taskName);
    } else if (data?.type === 'task_end') {
      console.log("用户点击了任务结束通知:", data.taskName);
    }
  });
}

// 带语音播报的任务通知创建函数
export async function scheduleTaskNotificationWithVoice(task: TaskOut, diffSeconds: number, notificationType: 'start' | 'end') {
  const title = notificationType === 'start' ? '任务开始' : '任务结束';
  const body = notificationType === 'start' 
    ? `现在开始：${task.name}` 
    : `${task.name} 已结束，请反馈完成情况`;
    
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      badge: 1,
      data: { 
        type: `task_${notificationType}`, 
        taskName: task.name, 
        taskId: task.id,
        taskTime: notificationType === 'start' ? task.scheduledParam?.startTime : task.scheduledParam?.endTime,
        hasVoice: true // 标记此通知需要语音播报
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: diffSeconds,
      repeats: false,
    },
  });
  
  return notificationId;
}
