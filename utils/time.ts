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

// 生成periodic任务在指定日期范围内的所有实例
export function generatePeriodicTaskInstances(task: any, startDate: Date, endDate: Date): any[] {
  if (!task || task.scheduled !== 'periodic' || !task.scheduledParam) {
    return [];
  }

  const instances = [];
  const { type, daysOfWeek, daysOfMonth, dateOfYear } = task.scheduledParam;
  const taskStartTime = new Date(task.startTime);
  const taskEndTime = new Date(task.endTime);
  
  // 获取任务的时分秒
  const startHour = taskStartTime.getHours();
  const startMinute = taskStartTime.getMinutes();
  const endHour = taskEndTime.getHours();
  const endMinute = taskEndTime.getMinutes();

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  while (current <= endDate) {
    let shouldInclude = false;
    
    // 确保不早于任务的原始开始日期
    if (current >= new Date(taskStartTime.getFullYear(), taskStartTime.getMonth(), taskStartTime.getDate())) {
      switch (type) {
        case 'daily':
          shouldInclude = true;
          break;
          
        case 'weekly':
          if (Array.isArray(daysOfWeek)) {
            const dayOfWeek = current.getDay(); // 0=Sunday, 1=Monday, etc.
            const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday=0
            shouldInclude = daysOfWeek.includes(adjustedDay);
          }
          break;
          
        case 'monthly':
          if (Array.isArray(daysOfMonth)) {
            shouldInclude = daysOfMonth.includes(current.getDate());
          }
          break;
          
        case 'yearly':
          if (dateOfYear) {
            const yearlyDate = new Date(dateOfYear);
            shouldInclude = (
              current.getMonth() === yearlyDate.getMonth() &&
              current.getDate() === yearlyDate.getDate()
            );
          }
          break;
      }
    }

    if (shouldInclude) {
      // 创建该日期的任务实例
      const instanceStartTime = new Date(current);
      instanceStartTime.setHours(startHour, startMinute, 0, 0);
      
      const instanceEndTime = new Date(current);
      instanceEndTime.setHours(endHour, endMinute, 0, 0);
      
      // 如果结束时间比开始时间早，说明是跨天任务，结束时间应该在第二天
      if (instanceEndTime <= instanceStartTime) {
        instanceEndTime.setDate(instanceEndTime.getDate() + 1);
      }

      instances.push({
        ...task,
        id: `${task.id}_${current.getTime()}`, // 为每个实例生成唯一ID
        originalId: task.id, // 保留原始任务ID
        startTime: instanceStartTime,
        endTime: instanceEndTime,
        isPeriodicInstance: true,
        instanceDate: new Date(current)
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return instances;
}
