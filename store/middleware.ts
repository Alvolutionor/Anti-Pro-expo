import { scheduleAllUpcomingTaskNotifications } from '../utils/notifications';

export const taskNotificationMiddleware = (store: any) => (next: any) => (action: any) => {
  // 先处理 action
  const result = next(action);
  
  // 检查是否是 task 相关的 action
  if (action.type && action.type.startsWith('task/')) {
    // 异步处理通知，不阻塞 action 流
    setTimeout(async () => {
      try {
        const count = await scheduleAllUpcomingTaskNotifications();
        console.log(`已为 ${count} 个任务安排了原生通知调度`);
      } catch (error) {
        console.error("安排任务通知失败:", error);
      }
    }, 0);
  }
  
  return result;
};