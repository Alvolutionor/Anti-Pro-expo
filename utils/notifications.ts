import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import dayjs from 'dayjs';
import store from '../store/store';
import { TaskOut, GoalOut } from './api';

// 初始化通知权限和通道（建议在 App 启动时调用一次）
export async function initNotification() {
  await Notifications.requestPermissionsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// 安排任务提醒通知
export async function scheduleTaskNotification(task: { name: string; startTime: string | Date }) {
  if (!task.startTime) return;
  const date = new Date(task.startTime);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Task Reminder',
      body: `It's time for: ${task.name}`,
      sound: true,
    },
    trigger: {
      type: 'calendar',
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      repeats: false,
    },
  });
}

// 定时检查任务和目标，自动提醒和反馈
export function startTaskGoalNotificationLoop() {
  setInterval(() => {
    const state = store.getState();
    const tasks: TaskOut[] = state.task.tasks;
    const goals: GoalOut[] = state.goal.goals;
    const now = dayjs();
    // 任务开始前10分钟提醒
    tasks.forEach(task => {
      if (task.startTime && dayjs(task.startTime).diff(now, 'minute') === 10 && !task.completed) {
        scheduleTaskNotification({
          name: task.name,
          startTime: task.startTime,
        });
      }
      // 任务结束时要求反馈
      if (task.endTime && dayjs().isAfter(dayjs(task.endTime)) && !task.completed) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Task Feedback',
            body: `Please provide feedback for: ${task.name}`,
            sound: true,
          },
          trigger: null,
        });
      }
    });
    // 可扩展：目标相关提醒
    // goals.forEach(goal => {...});
  }, 60 * 1000); // 每分钟检查一次
}

// 提示：请确保已安装 dayjs，运行 npm install dayjs
