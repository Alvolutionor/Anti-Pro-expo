// 时间相关工具函数
import dayjs from 'dayjs';

export function isTaskDueSoon(task, minutes = 10) {
  if (!task.startTime) return false;
  const now = dayjs();
  const start = dayjs(task.startTime);
  return start.diff(now, 'minute') <= minutes && start.isAfter(now);
}

export function isTaskEndingSoon(task, minutes = 5) {
  if (!task.endTime) return false;
  const now = dayjs();
  const end = dayjs(task.endTime);
  return end.diff(now, 'minute') <= minutes && end.isAfter(now);
}

export function isTaskJustEnded(task, minutes = 2) {
  if (!task.endTime) return false;
  const now = dayjs();
  const end = dayjs(task.endTime);
  return now.diff(end, 'minute') <= minutes && now.isAfter(end);
}
