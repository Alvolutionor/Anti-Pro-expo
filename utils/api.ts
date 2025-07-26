import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_BASE = "http://3.26.35.148:8080";
// const API_BASE = "http://13.211.79.130:8000";
const API_BASE = "http://192.168.0.191:8000"; // 本地开发时使用

// 获取token的辅助函数（React Native 环境用 AsyncStorage）
async function getToken() {
  return await AsyncStorage.getItem("access_token");
}

// 通用axios实例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10秒默认超时
});

// AI专用axios实例 - 更长的超时时间
const aiApi = axios.create({
  baseURL: API_BASE,
  timeout: 180000, // 3分钟超时，适合AI生成
});

// 请求拦截器自动加token（适配异步）
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// AI专用请求拦截器
aiApi.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器处理401错误
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token无效，清除本地存储的token
      await AsyncStorage.removeItem("access_token");
      console.log("Token expired or invalid, cleared from storage");
      
      // 可以在这里触发跳转到登录页，但需要小心避免循环
      // 这里我们只是清除token，让应用的其他部分处理跳转
    }
    return Promise.reject(error);
  }
);

// AI专用响应拦截器
aiApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token无效，清除本地存储的token
      await AsyncStorage.removeItem("access_token");
      console.log("Token expired or invalid, cleared from storage");
    }
    return Promise.reject(error);
  }
);

// 类型定义
export interface RegisterUserData {
  email: string;
  password: string;
  name?: string;
  avatarUrl?: string;
}

export interface LoginUserData {
  username: string;
  password: string;
}

export interface CreateGoalData {
  name: string;
  description?: string;
  achieved?: boolean;
  lifePoints?: number;
  priority?: number;
}

export interface GoalOut extends CreateGoalData {
  id: number;
  userId: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskData {
  name: string;
  completed?: boolean;
  dayPoints?: number;
  priority?: number;
  belongTo?: number;
  scheduled?: string;
  scheduledParam?: {
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  };
  goalId?: number;
  tag?: string;
  details?: Record<string, any>;
  hideFromCalendar?: boolean; // 控制任务是否在日历中显示
}

export interface TaskOut extends CreateTaskData {
  id: number;
  userId: number;
  name: string;
  goalId?: number;
  parentTaskId?: number;
  order?: number;
  date?: string; // ISO字符串
  completed?: boolean;
  dayPoints?: number;
  priority?: number;
  belongTo?: number;
  createdAt: string;
  updatedAt: string;
  scheduled?: string;
  scheduledParam?: {
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  };
  tags?: number[]; // 修正为 id 数组
  details?: Record<string, any>;
  hideFromCalendar?: boolean; // 控制任务是否在日历中显示
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface CreateTaskDetailData {
  key: string;
  value: string;
}

// 1. 用户注册
export async function registerUser(data: RegisterUserData) {
  return api.post("/users/register", data);
}

// 2. 用户登录
export async function loginUser(data: LoginUserData) {
  // 修正为 /users/token，并正确转换数据格式
  const formData = new URLSearchParams();
  formData.append('username', data.username);
  formData.append('password', data.password);
  
  return api.post("/users/token", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

// 3. 获取当前用户信息
export async function getMe() {
  return api.get("/users/me");
}

// 验证token有效性
export async function validateToken() {
  try {
    const response = await getMe();
    return { valid: true, user: response.data };
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token无效
      await AsyncStorage.removeItem("access_token");
      return { valid: false, error: 'Token expired' };
    }
    // 其他错误（网络问题等）
    return { valid: false, error: error.message };
  }
}

// 4. 创建目标
export async function createGoal(data: CreateGoalData) {
  return api.post("/goals/", data);
}

// 5. 获取目标列表
export async function getGoals() {
  return api.get("/goals/");
}

// 6. 获取目标详情
export async function getGoal(goalId: number) {
  return api.get(`/goals/${goalId}`);
}

// 7. 更新目标
export async function updateGoal(goalId: number, data: CreateGoalData) {
  return api.patch(`/goals/${goalId}`, data);
}

// 8. 删除目标
export async function deleteGoal(goalId: number) {
  return api.delete(`/goals/${goalId}`);
}

// 9. 创建任务
export async function createTask(data: CreateTaskData) {
  return api.post("/tasks/", data);
}

// 10. 获取任务列表
export async function getTasks() {
  return api.get("/tasks/");
}

// 11. 获取任务详情
export async function getTask(taskId: number) {
  return api.get(`/tasks/${taskId}`);
}

// 12. 更新任务
export type UpdateTaskData = Partial<CreateTaskData>;
export async function updateTask(taskId: number, data: UpdateTaskData) {
  return api.patch(`/tasks/${taskId}`, data);
}

// 13. 删除任务
export async function deleteTask(taskId: number) {
  return api.delete(`/tasks/${taskId}`);
}

// 14. 获取子任务
export async function getSubtasks(taskId: number) {
  return api.get(`/tasks/${taskId}/subtasks`);
}

// 15. 添加任务详情
export async function addTaskDetail(taskId: number, data: CreateTaskDetailData) {
  return api.post(`/tasks/${taskId}/details`, data);
}

// 16. 获取任务详情列表
export async function getTaskDetails(taskId: number) {
  return api.get(`/tasks/${taskId}/details`);
}

// 17. 创建标签
export async function createTag(data: CreateTagData) {
  return api.post("/tags/", data);
}

// 18. 获取标签列表
export async function getTags() {
  return api.get("/tags/");
}

// 19. 任务添加标签
export async function addTagToTask(taskId: number, tagId: number) {
  return api.post(`/tasks/${taskId}/tags/${tagId}`);
}

// 20. 任务移除标签
export async function removeTagFromTask(taskId: number, tagId: number) {
  return api.delete(`/tasks/${taskId}/tags/${tagId}`);
}

// 21. AI function call - 使用长超时
export async function aiFunctionCall(functionName: string, args: any) {
  return aiApi.post("/ai/function_call", {
    function: functionName,
    arguments: args,
  });
}

// 22. 获取function call支持的所有函数
export async function getFunctionList() {
  return api.get("/ai/function_list");
}

// 23. AI预览任务拆解（仅获取ChatGPT结果，不创建任务）- 使用长超时
export async function aiPreviewTasks(input: string) {
  return aiApi.post("/ai/preview_tasks", { input });
}

// 24. AI智能创建Goal+Task - 使用长超时
export async function aiSmartCreate(input: string) {
  return aiApi.post("/ai/smart_create", { input });
}

// 25. 从预览数据创建目标和任务 - 使用长超时
export async function aiCreateFromPreview(goalName: string, goalDescription: string, tasks: AITaskPreview[]) {
  return aiApi.post("/ai/create_from_preview", {
    goal_name: goalName,
    goal_description: goalDescription,
    tasks: tasks
  });
}

// AI预览和智能创建的响应类型定义
export interface AITaskPreview {
  name: string;
  description: string;
  priority: number;
  dayPoints?: number | null;
  completed: boolean;
  scheduled: string;
  scheduledParam: {
    estimatedDays?: number;
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  };
}

export interface AIPreviewResponse {
  goal_preview: {
    name: string;
    description: string;
  };
  tasks_preview: AITaskPreview[];
  total_tasks: number;
  ai_response: {
    raw_content: string;
    model: string;
    usage?: any;
    created: number;
  };
}

export interface AISmartCreateResponse {
  goal: {
    id: number;
    name: string;
    description: string;
  };
  tasks: {
    id: number;
    name: string;
    priority: number;
    scheduledParam: any;
    goalId: number;
  }[];
  ai_response: {
    raw_content: string;
    model: string;
    usage?: any;
    created: number;
  };
}

// utils/api.ts 或 types.ts
export interface GoalOut {
  id: number;
  name: string;
  description?: string;
  achieved?: boolean;
  lifePoints?: number;
  priority?: number;
  userId: number;
  isDeleted: boolean;
  createdAt: string; // ISO字符串
  updatedAt: string;
}

export interface TaskOut {
  id: number;
  userId: number;
  name: string;
  goalId?: number;
  parentTaskId?: number;
  order?: number;
  date?: string; // ISO字符串
  completed?: boolean;
  dayPoints?: number;
  priority?: number;
  belongTo?: number;
  createdAt: string;
  updatedAt: string;
  scheduled?: string;
  scheduledParam?: {
    startTime?: string;
    endTime?: string;
    [key: string]: any;
  };
  tag?: string;
  details?: Record<string, any>;
  hideFromCalendar?: boolean; // 控制任务是否在日历中显示
}

export default api;