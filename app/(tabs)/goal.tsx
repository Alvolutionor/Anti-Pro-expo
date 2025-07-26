import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SwipeListView } from 'react-native-swipe-list-view';
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getTasks,
  GoalOut,
  TaskOut,
  CreateGoalData,
  createTask,
  deleteTask,
  updateTask,
  validateToken,
  aiPreviewTasks,
  aiSmartCreate,
  aiCreateFromPreview,
  AIPreviewResponse,
  AISmartCreateResponse,
  AITaskPreview,
} from "../../utils/api";
import {
  setGoals,
  addGoal,
  updateGoal as updateGoalRedux,
  deleteGoal as deleteGoalRedux,
} from "../../store/goalSlice";
import { setTasks, deleteTask as deleteTaskRedux } from "../../store/taskSlice";
import AntDesign from "@expo/vector-icons/AntDesign";
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTags } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function GoalsManager() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const goals = useSelector((state: RootState) => state.goal.goals);
  const tasks = useSelector((state: RootState) => state.task.tasks);
  
  // 组件挂载状�?- 防止内存泄漏
  const isMountedRef = useRef(true);
  
  // 添加认证状态检�?
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalOut | null>(null);
  const [form, setForm] = useState<CreateGoalData>({ name: "" });
  const [saving, setSaving] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  // 新增互斥下拉菜单控制
  const [openDropdown, setOpenDropdown] = useState<null | 'scheduled' | 'scheduledParam'>(null);

  const fetchGoalsAndTasks = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const [goalsRes, tasksRes] = await Promise.all([getGoals(), getTasks()]);
      
      // 只有在组件仍然挂载时才更新状�?
      if (isMountedRef.current) {
        dispatch(setGoals(goalsRes.data));
        dispatch(setTasks(tasksRes.data));
      }
    } catch (e) {
      if (isMountedRef.current) {
        Alert.alert("Failed to load data", String(e));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [dispatch]);

  // 认证检�?
  useEffect(() => {
    let isCancelled = false;
    
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("access_token");
        if (isCancelled) return;
        
        if (!token) {
          router.replace("/auth");
          return;
        }
        
        const validation = await validateToken();
        if (isCancelled) return;
        
        if (!validation.valid) {
          console.log("Token validation failed:", validation.error);
          router.replace("/auth");
          return;
        }
        
        if (!isCancelled) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("Auth check failed:", error);
          router.replace("/auth");
        }
      } finally {
        if (!isCancelled) {
          setAuthChecking(false);
        }
      }
    };
    
    checkAuth();
    
    return () => {
      isCancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGoalsAndTasks();
    }
  }, [isAuthenticated, fetchGoalsAndTasks]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const openAddModal = () => {
    setEditingGoal(null);
    setForm({ name: "" });
    setModalVisible(true);
  };

  const openEditModal = (goal: GoalOut) => {
    setEditingGoal(goal);
    setForm({
      name: goal.name,
      description: goal.description,
      achieved: goal.achieved,
      lifePoints: goal.lifePoints,
      priority: goal.priority,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editingGoal) {
        const res = await updateGoal(editingGoal.id, form);
        dispatch(updateGoalRedux(res.data));
        Alert.alert("Goal updated");
      } else {
        const res = await createGoal(form);
        dispatch(addGoal(res.data));
        Alert.alert("Goal created");
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Failed to save goal", String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal: GoalOut) => {
    Alert.alert("Delete Goal", `Are you sure to delete '${goal.name}'?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(goal.id);
            dispatch(deleteGoalRedux(goal.id));
          } catch (e) {
            Alert.alert("Failed to delete goal", String(e));
          }
        },
      },
    ]);
  };

  // Add Task 相关 state（完全复�?index.tsx 结构�?
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [addingTaskGoalId, setAddingTaskGoalId] = useState<number | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskTags, setNewTaskTags] = useState<number[]>([]); // 多选tag id
  const [newTaskStartTime, setNewTaskStartTime] = useState("");
  const [newTaskEndTime, setNewTaskEndTime] = useState("");
  const [details, setDetails] = useState([{ key: "desc", value: "" }]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showMoreFields, setShowMoreFields] = useState(true);
  const [newTaskScheduled, setNewTaskScheduled] = useState("onetime");
  const [newTaskScheduledParam, setNewTaskScheduledParam] = useState<any>({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
  const [tagList, setTagList] = useState<{ id: number; name: string; color?: string }[]>([]);
  const [savingTask, setSavingTask] = useState(false);
  const [taskFoldMap, setTaskFoldMap] = useState<{ [id: number]: boolean }>({});
  
  // Edit Task 相关 state
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskOut | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now()); // 添加时间戳来强制重新渲染

  // 拉取 tag 列表
  useEffect(() => {
    let isCancelled = false;
    
    getTags().then(res => {
      if (!isCancelled && res && res.data) {
        setTagList(res.data);
      }
    }).catch(() => {
      if (!isCancelled) {
        setTagList([]);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Add Task 逻辑
  const handleAddTask = useCallback(async () => {
    if (!newTaskName.trim()) {
      Alert.alert("Task name is required");
      return;
    }
    if (!addingTaskGoalId) {
      Alert.alert("No goal selected");
      return;
    }
    if (!isMountedRef.current) return;
    
    setSavingTask(true);
    try {
      const data = {
        name: newTaskName,
        tags: newTaskTags,
        goalId: addingTaskGoalId,
        details: details.reduce((acc: Record<string, any>, detail) => {
          if (!detail.key) {
            acc['desc'] = detail.value;
          } else {
            acc[detail.key] = detail.value;
          }
          return acc;
        }, {}),
        scheduled: newTaskScheduled,
        scheduledParam: {
          ...newTaskScheduledParam,
          startTime: newTaskStartTime || undefined,
          endTime: newTaskEndTime || undefined,
        },
      };
      await createTask(data);
      
      if (!isMountedRef.current) return;
      
      // 刷新 tasks
      const tasksRes = await getTasks();
      if (isMountedRef.current) {
        dispatch(setTasks(tasksRes.data));
        // 通知调度已在Redux slice中自动处理
        setAddTaskModalVisible(false);
        setNewTaskName("");
        setNewTaskTags([]);
        setNewTaskStartTime("");
        setNewTaskEndTime("");
        setDetails([{ key: "desc", value: "" }]);
        setNewTaskScheduled("onetime");
        setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
        setOpenDropdown(null);
        setAddingTaskGoalId(null);
      }
    } catch (e) {
      if (isMountedRef.current) {
        Alert.alert("Failed to add task", String(e));
      }
    } finally {
      if (isMountedRef.current) {
        setSavingTask(false);
      }
    }
  }, [newTaskName, addingTaskGoalId, newTaskTags, details, newTaskScheduled, newTaskScheduledParam, newTaskStartTime, newTaskEndTime, dispatch]);
    // renderGoal 任务卡片�?fold/展开按钮
  const handleDeleteTask = useCallback(async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    Alert.alert(
      "Delete Task", 
      `Are you sure to delete '${task?.name || 'this task'}'?`, 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!isMountedRef.current) return;
            
            try {
              await deleteTask(taskId);
              
              if (!isMountedRef.current) return;
              
              // 立即更新Redux状�?
              dispatch(deleteTaskRedux(taskId));
              // 强制刷新任务列表以确保删除生�?
              const tasksRes = await getTasks();
              if (isMountedRef.current) {
                dispatch(setTasks(tasksRes.data));
                // 更新时间戳来强制重新渲染
                setLastUpdateTime(Date.now());
                // 通知调度已在Redux slice中自动处理
              }
            } catch (e) {
              if (isMountedRef.current) {
                Alert.alert('Failed to delete task', String(e));
              }
            }
          },
        },
      ]
    );
  }, [tasks, dispatch]);

  // 长按任务操作菜单
  const handleLongPressTask = (task: TaskOut) => {
    Alert.alert(
      "Task Actions",
      `What would you like to do with "${task.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: task.completed ? "Mark as Incomplete" : "Mark as Complete",
          onPress: async () => {
            try {
              await updateTask(task.id, { ...task, completed: !task.completed });
              const tasksRes = await getTasks();
              dispatch(setTasks(tasksRes.data));
              // 通知调度已在Redux slice中自动处理
            } catch (e) {
              Alert.alert('Failed to update task', String(e));
            }
          }
        },
        {
          text: "Edit",
          onPress: () => {
            // 使用模态框编辑任务
            setEditingTask(task);
            setNewTaskName(task.name);
            setNewTaskTags(task.tags || []);
            setNewTaskStartTime(task.scheduledParam?.startTime || "");
            setNewTaskEndTime(task.scheduledParam?.endTime || "");
            setNewTaskScheduled(task.scheduled || "onetime");
            setNewTaskScheduledParam(task.scheduledParam || { type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
            setDetails(task.details ? Object.entries(task.details).map(([key, value]) => ({ key, value: String(value) })) : [{ key: "desc", value: "" }]);
            setEditTaskModalVisible(true);
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteTask(task.id)
        }
      ]
    );
  };

  // 更新任务
  const handleUpdateTask = async () => {
    if (!editingTask || !newTaskName.trim()) {
      Alert.alert("Task name is required");
      return;
    }
    setSavingTask(true);
    try {
      const data = {
        name: newTaskName,
        tags: newTaskTags,
        goalId: editingTask.goalId,
        details: details.reduce((acc: Record<string, any>, detail) => {
          if (!detail.key) {
            acc['desc'] = detail.value;
          } else {
            acc[detail.key] = detail.value;
          }
          return acc;
        }, {}),
        scheduled: newTaskScheduled,
        scheduledParam: {
          ...newTaskScheduledParam,
          startTime: newTaskStartTime || undefined,
          endTime: newTaskEndTime || undefined,
        },
      };
      await updateTask(editingTask.id, data);
      // 刷新任务列表
      const tasksRes = await getTasks();
      dispatch(setTasks(tasksRes.data));
      // 通知调度已在Redux slice中自动处理
      setEditTaskModalVisible(false);
      setEditingTask(null);
      // 重置表单
      setNewTaskName("");
      setNewTaskTags([]);
      setNewTaskStartTime("");
      setNewTaskEndTime("");
      setDetails([{ key: "desc", value: "" }]);
      setNewTaskScheduled("onetime");
      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    } catch (e) {
      Alert.alert("Failed to update task", String(e));
    } finally {
      setSavingTask(false);
    }
  };

  // 在渲染目录前，构造一个包�?无目标任�?的假 Goal 列表
  const unassignedTasks = useMemo(() => tasks.filter((t: TaskOut) => t.goalId == null), [tasks]);
  const displayGoals: GoalOut[] = useMemo(() => [
    { id: -1, name: 'Unassigned Tasks', description: '', achieved: false, lifePoints: undefined, priority: undefined, userId: 0, isDeleted: false, createdAt: '', updatedAt: '' },
    ...goals
  ], [goals]);

  const renderGoal = useCallback(({ item }: { item: GoalOut }) => {
    // 区分普�?goal 和“无目标任务”节�?
    const goalTasks: TaskOut[] = item.id === -1
      ? unassignedTasks
      : tasks.filter((t: TaskOut) => t.goalId === item.id);
    const expanded = expandedGoalId === item.id;
    return (
      <View style={styles.goalCard}>
        <TouchableOpacity
          onPress={() => {
            setExpandedGoalId(expanded ? null : item.id);
            // 当展开goal时，收起所有任�?
            if (!expanded) {
              setTaskFoldMap({});
            }
          }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <AntDesign 
            name={expanded ? "down" : "right"} 
            size={16} 
            color="#000000" 
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.goalTitle}>
              {item.id === -1 ? 'Unassigned Tasks' : item.name}
            </Text>
            {item.description ? (
              <Text style={styles.goalDesc}>{item.description}</Text>
            ) : null}
          </View>
        </TouchableOpacity>
        {expanded && (
          <View style={styles.goalDetailsBox}>
            <Text style={styles.goalField}>
              Achieved: {item.achieved ? "Yes" : "No"}
            </Text>
            {item.lifePoints !== undefined && (
              <Text style={styles.goalField}>
                Life Points: {item.lifePoints}
              </Text>
            )}
            {item.priority !== undefined && (
              <Text style={styles.goalField}>Priority: {item.priority}</Text>
            )}
            <Text
              style={[styles.goalField, { marginTop: 8, fontWeight: "bold" }]}
            >
              Tasks:
            </Text>
            {goalTasks.length === 0 ? (
              <Text style={{ color: "#666666", marginBottom: 8, marginLeft: 18 }}>
                No tasks for this goal.
              </Text>
            ) : (
              <View style={styles.taskTreeBox}>
                <View style={styles.taskTreeLine} />
                <FlatList
                  data={goalTasks}
                  keyExtractor={(task) => task.id.toString()}
                  extraData={[tasks.length, lastUpdateTime]} // 添加时间戳来强制FlatList重新渲染
                  renderItem={({ item: task }) => {
                    let startTime = task.scheduledParam?.startTime;
                    let endTime = task.scheduledParam?.endTime;
                    // 默认所有任务都是折叠的，除非在 taskFoldMap 中明确设置为 false
                    const folded = taskFoldMap[task.id] !== false;
                    return (
                      <View key={task.id} style={[
                        styles.taskCardTree,
                        task.completed && { backgroundColor: "#f8f9fa", opacity: 0.7 }
                      ]}>
                        <TouchableOpacity
                          onPress={() => setTaskFoldMap(m => ({ ...m, [task.id]: !folded }))}
                          onLongPress={() => handleLongPressTask(task)}
                          delayLongPress={500}
                          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                        >
                          <AntDesign 
                            name={folded ? "down" : "up"} 
                            size={12} 
                            color="#666666" 
                            style={{ marginRight: 6 }}
                          />
                          <View style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: task.completed ? "#28a745" : "#ffffff",
                            borderWidth: 2,
                            borderColor: task.completed ? "#28a745" : "#666666",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 8
                          }}>
                            {task.completed && (
                              <AntDesign name="check" size={8} color="#ffffff" />
                            )}
                          </View>
                          <Text style={[
                            styles.taskTitle,
                            task.completed && { 
                              textDecorationLine: 'line-through',
                              color: '#666666'
                            }
                          ]}>
                            {task.name}
                          </Text>
                          <Text style={styles.taskHint}>Long press for options</Text>
                        </TouchableOpacity>
                        {!folded && (
                          <>
                            <Text style={styles.taskField}>Start: {startTime ? new Date(startTime).toLocaleString() : '-'}</Text>
                            <Text style={styles.taskField}>End: {endTime ? new Date(endTime).toLocaleString() : '-'}</Text>
                            {task.completed !== undefined && (
                              <Text style={styles.taskField}>
                                Completed: {task.completed ? "Yes" : "No"}
                              </Text>
                            )}
                            {task.priority !== undefined && (
                              <Text style={styles.taskField}>
                                Priority: {task.priority}
                              </Text>
                            )}
                            {/* 任务卡片展示标签�?*/}
                            {Array.isArray(task.tags) && task.tags.length > 0 && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                                {task.tags.map((tid: any) => {
                                  const tagId = typeof tid === 'number' ? tid : Number(tid);
                                  const tag = tagList.find(t => t.id === tagId);
                                  return tag ? (
                                    <View key={tagId} style={{ backgroundColor: tag.color || '#666666', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6, marginBottom: 2 }}>
                                      <Text style={{ color: '#fff', fontSize: 12 }}>{tag.name}</Text>
                                    </View>
                                  ) : null;
                                })}
                              </View>
                            )}
                            {/* AddTagToTaskButton 区域 */}
                            <TouchableOpacity
                              style={{ marginTop: 6, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}
                              onPress={() => {
                                // TODO: 打开标签多选弹窗，调用 updateTask 只更新tags 字段
                                Alert.alert('Add Tag', 'Tag feature is under development, you can select tags in AddTaskModal');
                              }}
                            >
                              <AntDesign name="plus" size={14} color="#000000" style={{ marginRight: 4 }} />
                              <Text style={{ color: '#000000', fontSize: 13 }}>Add Tag</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    );
                  }}
                  showsVerticalScrollIndicator={false}
                  style={{ backgroundColor: 'transparent' }}
                  contentContainerStyle={{ paddingBottom: 0 }}
                  nestedScrollEnabled={true} // 允许嵌套滚动
                />
              </View>
            )}
            {/* Add Task 按钮 */}
            <TouchableOpacity
              style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}
              onPress={() => {
                setAddingTaskGoalId(item.id);
                setAddTaskModalVisible(true);
              }}
            >
              <AntDesign name="plus" size={16} color="#000000" style={{ marginRight: 6 }} />
              <Text style={{ color: '#000000', fontWeight: '500' }}>Add Task</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.goalActions}>
          <Button title="Edit" onPress={() => openEditModal(item)} />
          <Button
            title="Delete"
            color="#d33"
            onPress={() => handleDelete(item)}
          />
        </View>
      </View>
    );
  }, [unassignedTasks, tasks, expandedGoalId, taskFoldMap, tagList, handleLongPressTask]);

  // Add Goal 弹窗相关 state
  const [addGoalVisible, setAddGoalVisible] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalAchieved, setNewGoalAchieved] = useState(false);
  const [newGoalLifePoints, setNewGoalLifePoints] = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  
  // 选项卡状�?- "manual" �?"ai"
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("ai");

  // AI 生成相关 state（集成到Add Goal中）
  const [aiInput, setAiInput] = useState("");
  const [aiPreviewData, setAiPreviewData] = useState<AIPreviewResponse | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isCreatingFromPreview, setIsCreatingFromPreview] = useState(false);
  const [editableTasksPreview, setEditableTasksPreview] = useState<AITaskPreview[]>([]);
  
  // AI 生成参数
  const [aiGoalPriority, setAiGoalPriority] = useState("3");
  const [aiGoalLifePoints, setAiGoalLifePoints] = useState("");
  const [aiGoalDescription, setAiGoalDescription] = useState("");

  // Add Goal 逻辑
  const handleAddGoal = async () => {
    if (!newGoalName.trim()) {
      Alert.alert("Name is required");
      return;
    }
    setAddingGoal(true);
    try {
      const data = {
        name: newGoalName,
        description: newGoalDesc,
        achieved: newGoalAchieved,
        lifePoints: newGoalLifePoints ? Number(newGoalLifePoints) : undefined,
        priority: newGoalPriority ? Number(newGoalPriority) : undefined,
      };
      const res = await createGoal(data);
      dispatch(addGoal(res.data));
      setAddGoalVisible(false);
      // 重置表单
      setNewGoalName("");
      setNewGoalDesc("");
      setNewGoalAchieved(false);
      setNewGoalLifePoints("");
      setNewGoalPriority("");
    } catch (e) {
      Alert.alert("Failed to add goal", String(e));
    } finally {
      setAddingGoal(false);
    }
  };

  // AI 生成预览逻辑 - 添加超时和重试机�?
  const handleAIPreview = useCallback(async () => {
    if (!aiInput.trim()) {
      Alert.alert("Please enter goal description");
      return;
    }
    if (!isMountedRef.current) return;
    
    setIsGeneratingPreview(true);
    try {
      // 添加超时控制和重试逻辑
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI generation timeout, please retry')), 240000) // 4 minutes timeout
      );
      
      const res = await Promise.race([
        aiPreviewTasks(aiInput),
        timeoutPromise
      ]) as any;
      
      if (isMountedRef.current && res) {
        setAiPreviewData(res.data);
        setEditableTasksPreview(res.data.tasks_preview);
      }
    } catch (e) {
      if (isMountedRef.current) {
        console.error('AI Preview Error:', e);
        Alert.alert("AI generation failed", `${String(e)}\n\nPlease check network connection and retry`);
      }
    } finally {
      if (isMountedRef.current) {
        setIsGeneratingPreview(false);
      }
    }
  }, [aiInput]);

  // 从预览创建实际的目标和任�?
  const handleCreateFromPreview = useCallback(async () => {
    if (!aiPreviewData || !isMountedRef.current) return;
    
    setIsCreatingFromPreview(true);
    try {
      // 使用新的接口，传递修改后的任务数�?
      const res = await aiCreateFromPreview(
        aiPreviewData.goal_preview.name,
        aiPreviewData.goal_preview.description,
        editableTasksPreview
      );
      
      if (!isMountedRef.current) return;
      
      dispatch(addGoal(res.data.goal));
      await fetchGoalsAndTasks(); // 刷新任务列表
      
      if (isMountedRef.current) {
        setAddGoalVisible(false);
        resetAIModal();
        setNewGoalName("");
        setNewGoalDesc("");
        setNewGoalAchieved(false);
        setNewGoalLifePoints("");
        setNewGoalPriority("");
        Alert.alert("Success", "Goal and tasks created!");
      }
    } catch (e) {
      if (isMountedRef.current) {
        Alert.alert("Creation failed", String(e));
      }
    } finally {
      if (isMountedRef.current) {
        setIsCreatingFromPreview(false);
      }
    }
  }, [aiPreviewData, editableTasksPreview, dispatch, fetchGoalsAndTasks]);

  // 重置AI模态框
  const resetAIModal = () => {
    setAiInput("");
    setAiPreviewData(null);
    setEditableTasksPreview([]);
    setIsGeneratingPreview(false);
    setIsCreatingFromPreview(false);
    setAiGoalPriority("3");
    setAiGoalLifePoints("");
    setAiGoalDescription("");
    setActiveTab("ai");
  };

  // AddTaskModal 组件，参�?index.tsx �?startTime/endTime 显示逻辑�?timepicker UI
  function AddTaskModal({ visible, goalId, onClose, onSuccess, isEdit = false, initialData }: {
    visible: boolean; goalId: number | null; onClose: () => void;
    onSuccess: () => void; isEdit?: boolean; initialData?: {
      name?: string; tags?: number[]; startTime?: string; endTime?: string;
      scheduled?: string; scheduledParam?: any; details?: { key: string; value: string; }[];
      completed?: boolean;
    };
  }) {
    const dispatch = useDispatch<AppDispatch>();
    const [newTaskName, setNewTaskName] = useState(initialData?.name || "");
    const [newTaskEvent, setNewTaskEvent] = useState("");
    const [newTaskStartTime, setNewTaskStartTime] = useState(initialData?.startTime || "");
    const [newTaskEndTime, setNewTaskEndTime] = useState(initialData?.endTime || "");
    const [details, setNewTaskDetails] = useState(initialData?.details || [{ key: "desc", value: "" }]);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showMoreFields, setShowMoreFields] = useState(true);
    const [newTaskScheduled, setNewTaskScheduled] = useState(initialData?.scheduled || "onetime");
    const [newTaskScheduledParam, setNewTaskScheduledParam] = useState<any>(initialData?.scheduledParam || { type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    const [modalOpenDropdown, setModalOpenDropdown] = useState<null | string>(null);
    const [tagList, setTagList] = useState<{ id: number; name: string; color?: string }[]>([]);
    const [savingTask, setSavingTask] = useState(false);
    const [localNewTaskTags, setLocalNewTaskTags] = useState<number[]>(initialData?.tags || []);
    const [newTaskCompleted, setNewTaskCompleted] = useState(initialData?.completed || false);

    // �?initialData 变化时更新状�?
    useEffect(() => {
      if (isEdit && initialData) {
        setNewTaskName(initialData.name || "");
        setNewTaskStartTime(initialData.startTime || "");
        setNewTaskEndTime(initialData.endTime || "");
        setNewTaskDetails(initialData.details || [{ key: "desc", value: "" }]);
        setNewTaskScheduled(initialData.scheduled || "onetime");
        setNewTaskScheduledParam(initialData.scheduledParam || { type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
        setLocalNewTaskTags(initialData.tags || []);
        setNewTaskCompleted(initialData.completed || false);
      }
    }, [isEdit, initialData]);

    useEffect(() => {
      let isCancelled = false;
      
      getTags().then(res => {
        if (!isCancelled && res && res.data) {
          setTagList(res.data);
        }
      }).catch(() => {
        if (!isCancelled) {
          setTagList([]);
        }
      });

      return () => {
        isCancelled = true;
      };
    }, []);

    // 详情字段动态增�?
    const handleDetailChange = (idx: number, value: string) => {
      setNewTaskDetails(details => details.map((d, i) => i === idx ? { ...d, value } : d));
    };
    const handleAddDetail = () => {
      setNewTaskDetails(details => [...details, { key: "", value: "" }]);
    };
    const handleDeleteDetail = (idx: number) => {
      setNewTaskDetails(details => details.filter((_, i) => i !== idx));
    };

    // index.tsx 逻辑：不�?scheduled 类型下，start/end time 的显示和 picker 类型
    // onetime: 显示 start/end，均�?datetime picker
    // periodic: 只显�?start（time picker），不显�?end
    // finishedby: 只显�?end（datetime picker），不显�?start

    const handleAddTask = async () => {
      if (!newTaskName.trim()) {
        Alert.alert("Task name is required");
        return;
      }
      if (!goalId && !isEdit) {
        Alert.alert("No goal selected");
        return;
      }
      setSavingTask(true);
      try {
        const data = {
          name: newTaskName,
          tags: localNewTaskTags,
          goalId: goalId || undefined,
          completed: newTaskCompleted,
          details: details.reduce((acc: Record<string, any>, detail) => {
            if (!detail.key) {
              acc['desc'] = detail.value;
            } else {
              acc[detail.key] = detail.value;
            }
            return acc;
          }, {}),
          scheduled: newTaskScheduled,
          scheduledParam: {
            ...newTaskScheduledParam,
            startTime: newTaskStartTime || undefined,
            endTime: newTaskEndTime || undefined,
          },
        };
        
        if (isEdit) {
          // 如果是编辑模式，调用 onSuccess (实际上是 handleUpdateTask)
          onSuccess();
        } else {
          await createTask(data);
          const tasksRes = await getTasks();
          dispatch(setTasks(tasksRes.data));
          // 通知调度已在Redux slice中自动处理
          onSuccess();
          handleClose();
        }
      } catch (e) {
        Alert.alert(isEdit ? "Failed to update task" : "Failed to add task", String(e));
      } finally {
        setSavingTask(false);
      }
    };

    const handleClose = () => {
      setNewTaskName("");
      setLocalNewTaskTags([]); // 重置标签
      setNewTaskEvent("");
      setNewTaskStartTime("");
      setNewTaskEndTime("");
      setNewTaskDetails([{ key: "desc", value: "" }]);
      setNewTaskScheduled("onetime");
      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
      setNewTaskCompleted(false);
      setModalOpenDropdown(null);
      setShowStartTimePicker(false);
      setShowEndTimePicker(false);
      setShowDatePicker(false);
      onClose();
    };

    if (!visible) return null;
    return (
      <Modal visible={visible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.modalContent}>
                <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                  <Text style={styles.modalTitle}>{isEdit ? "Edit Task" : "Add Task"}</Text>
                  
                  {/* Task Name Input */}
                  <View style={{ marginBottom: 12 }}>
                    <TextInput
                      style={[styles.input, { marginBottom: 0 }]}
                      placeholder="Task Name (e.g. Read a book)"
                      value={newTaskName}
                      onChangeText={setNewTaskName}
                      maxLength={40}
                      autoCapitalize="sentences"
                    />
                  </View>
                  {/* Scheduled 下拉选择 - 统一下拉菜单风格 */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.goalField}>Scheduled</Text>
                    <View>
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setModalOpenDropdown(modalOpenDropdown === "scheduled" ? null : "scheduled")}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: newTaskScheduled ? "#000000" : "#666666" }}>
                          {newTaskScheduled.charAt(0).toUpperCase() + newTaskScheduled.slice(1)}
                        </Text>
                        <AntDesign name="down" size={16} color="#555" />
                      </TouchableOpacity>
                      {modalOpenDropdown === "scheduled" && (
                        <View style={styles.detailPickerDropdown}>
                          {["periodic", "finishedby", "onetime"].map((opt) => (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.detailPickerOption,
                                newTaskScheduled === opt && { backgroundColor: "#e6f0ff" },
                              ]}
                              onPress={() => {
                                setNewTaskScheduled(opt);
                                setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
                                setShowDatePicker(false);
                                setModalOpenDropdown(null);
                              }}
                            >
                              <Text style={{ color: "#000000" }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Start/End Time 选择器，逻辑�?index.tsx，可根据 scheduled 类型动态渲�?*/}
                  {newTaskScheduled === "onetime" && (
                    <>
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={{ color: newTaskStartTime ? "#000000" : "#666666" }}>
                          {newTaskStartTime ? new Date(newTaskStartTime).toLocaleString() : "Select Start Time"}
                        </Text>
                        <AntDesign name="clockcircleo" size={16} color="#555" />
                      </TouchableOpacity>
                      {showStartTimePicker && (
                        <DateTimePicker
                          value={newTaskStartTime ? new Date(newTaskStartTime) : new Date()}
                          mode="datetime"
                          display="default"
                          onChange={(event, date) => {
                            if (event.type === 'dismissed') {
                              setShowStartTimePicker(false);
                            } else if (date) {
                              setNewTaskStartTime(date.toISOString());
                              // 只在用户确认时关闭 (Android上为'set', iOS上会自动处理)
                              if (event.type === 'set') {
                                setShowStartTimePicker(false);
                              }
                            }
                          }}
                        />
                      )}
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={{ color: newTaskEndTime ? "#000000" : "#666666" }}>
                          {newTaskEndTime ? new Date(newTaskEndTime).toLocaleString() : "Select End Time"}
                        </Text>
                        <AntDesign name="clockcircleo" size={16} color="#555" />
                      </TouchableOpacity>
                      {showEndTimePicker && (
                        <DateTimePicker
                          value={newTaskEndTime ? new Date(newTaskEndTime) : (newTaskStartTime ? new Date(newTaskStartTime) : new Date())}
                          mode="datetime"
                          display="default"
                          minimumDate={newTaskStartTime ? new Date(newTaskStartTime) : undefined}
                          maximumDate={(() => {
                            if (newTaskStartTime) {
                              const start = new Date(newTaskStartTime);
                              const max = new Date(start);
                              max.setHours(23, 59, 59, 999);
                              return max;
                            }
                            return undefined;
                          })()}
                          onChange={(event, date) => {
                            if (event.type === 'dismissed') {
                              setShowEndTimePicker(false);
                            } else if (date && newTaskStartTime) {
                              // 强制 endTime 日期�?startTime 相同
                              const start = new Date(newTaskStartTime);
                              const end = new Date(date);
                              end.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
                              setNewTaskEndTime(end.toISOString());
                              // 只在用户确认时关闭
                              if (event.type === 'set') {
                                setShowEndTimePicker(false);
                              }
                            } else if (date) {
                              setNewTaskEndTime(date.toISOString());
                              if (event.type === 'set') {
                                setShowEndTimePicker(false);
                              }
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                  {newTaskScheduled === "periodic" && (
                    <>
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={{ color: newTaskStartTime ? "#000000" : "#666666" }}>
                          {newTaskStartTime ? new Date(newTaskStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Select Start Time"}
                        </Text>
                        <AntDesign name="clockcircleo" size={16} color="#555" />
                      </TouchableOpacity>
                      {showStartTimePicker && (
                        <DateTimePicker
                          value={newTaskStartTime ? new Date(newTaskStartTime) : new Date()}
                          mode="time"
                          display="default"
                          onChange={(event, date) => {
                            if (date) {
                              setNewTaskStartTime(date.toISOString());
                            }
                            // 只在用户确认或取消时关闭，滚动调整时不关闭
                            if (event.type === 'set' || event.type === 'dismissed') {
                              setShowStartTimePicker(false);
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                  {newTaskScheduled === "finishedby" && (
                    <>
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={{ color: newTaskEndTime ? "#000000" : "#666666" }}>
                          {newTaskEndTime ? new Date(newTaskEndTime).toLocaleString() : "Select End Time"}
                        </Text>
                        <AntDesign name="clockcircleo" size={16} color="#555" />
                      </TouchableOpacity>
                      {showEndTimePicker && (
                        <DateTimePicker
                          value={newTaskEndTime ? new Date(newTaskEndTime) : new Date()}
                          mode="datetime"
                          display="default"
                          onChange={(event, date) => {
                            if (event.type === 'dismissed') {
                              setShowEndTimePicker(false);
                            } else if (date) {
                              setNewTaskEndTime(date.toISOString());
                              if (event.type === 'set') {
                                setShowEndTimePicker(false);
                              }
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                  {/* 详情字段输入，支持多行增�?*/}
                  <View style={styles.detailContainer}>
                    <Text style={styles.goalField}>Details</Text>
                    {details.map((detail, idx) => (
                      <View key={idx} style={styles.detailRow}>
                        {/* 新增：详情key选择�?*/}
                        <TouchableOpacity
                          style={[styles.detailPickerTouchable, { flex: 0.5, marginRight: 8, minWidth: 80 }]}
                          onPress={() => setModalOpenDropdown(modalOpenDropdown === `detail-key-${idx}` ? null : `detail-key-${idx}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: detail.key ? '#000000' : '#666666' }}>
                            {detail.key ? detail.key : 'desc'}
                          </Text>
                          <AntDesign name="down" size={14} color="#555" />
                        </TouchableOpacity>
                        {modalOpenDropdown === `detail-key-${idx}` && (
                          <View style={[styles.detailPickerDropdown, { left: 0, right: undefined, minWidth: 80, zIndex: 20 }]}> 
                            {['desc', 'event', 'location', 'note', 'remark'].map(opt => (
                              <TouchableOpacity
                                key={opt}
                                style={[styles.detailPickerOption, detail.key === opt && { backgroundColor: '#e6f0ff' }]
                                }
                                onPress={() => {
                                  setNewTaskDetails(ds => ds.map((d, i) => i === idx ? { ...d, key: opt } : d));
                                  setModalOpenDropdown(null);
                                }}
                              >
                                <Text style={{ color: '#000000' }}>{opt}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        <TextInput
                          style={[styles.detailValueInput, { flex: 1 }]}
                          placeholder="Detail"
                          value={detail.value}
                          onChangeText={v => handleDetailChange(idx, v)}
                          multiline
                        />
                        {details.length > 1 && (
                          <TouchableOpacity style={styles.deleteDetailButton} onPress={() => handleDeleteDetail(idx)}>
                            <AntDesign name="delete" size={18} color="#d33" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity style={styles.addDetailButton} onPress={handleAddDetail}>
                      <Text style={styles.addDetailButtonText}>+ Add Detail</Text>
                    </TouchableOpacity>
                  </View>
                  {/* 标签多选UI */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.goalField}>Tags</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {tagList.map(tag => (
                        <TouchableOpacity
                          key={tag.id}
                          style={{
                            backgroundColor: localNewTaskTags.includes(tag.id) ? (tag.color || '#666666') : '#f0f0f0',
                            borderRadius: 16,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            marginRight: 8,
                            marginBottom: 8,
                          }}
                          onPress={() => {
                            setLocalNewTaskTags(tags => tags.includes(tag.id) ? tags.filter(t => t !== tag.id) : [...tags, tag.id]);
                          }}
                        >
                          <Text style={{ color: localNewTaskTags.includes(tag.id) ? '#fff' : '#333' }}>{tag.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  {/* Task Completion Status */}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.goalField}>Task Status</Text>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: newTaskCompleted ? "#e8f5e8" : "#f0f0f0",
                        padding: 12,
                        borderRadius: 4,
                        borderWidth: 1,
                        borderColor: newTaskCompleted ? "#28a745" : "#ddd"
                      }}
                      onPress={() => setNewTaskCompleted(!newTaskCompleted)}
                    >
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: newTaskCompleted ? "#28a745" : "#ccc",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12
                      }}>
                        {newTaskCompleted && (
                          <AntDesign name="check" size={12} color="#fff" />
                        )}
                      </View>
                      <Text style={{ 
                        fontSize: 14, 
                        color: newTaskCompleted ? "#28a745" : "#666"
                      }}>
                        {newTaskCompleted ? "Completed" : "In Progress"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* 其他表单项复�?index.tsx 逻辑 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                    <TouchableOpacity onPress={handleClose} style={{ marginRight: 16 }}>
                      <Text style={{ color: "#666666", fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddTask} disabled={savingTask}>
                      <Text style={{ color: savingTask ? "#999999" : "#000000", fontSize: 16 }}>
                        {savingTask ? (isEdit ? "Updating..." : "Adding...") : (isEdit ? "Update" : "Add")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    )
  }
  // 修复：确�?AddTaskModal 组件完整闭合
  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={styles.header}>Goals & Tasks</Text>

      </View>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={displayGoals}
          keyExtractor={(g) => g.id.toString()}
          extraData={[goals.length, tasks.length, lastUpdateTime]} // 添加时间戳来强制重新渲染
          renderItem={renderGoal}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 32 }}>
              No goals yet.
            </Text>
          }
          nestedScrollEnabled={true} // 允许嵌套滚动
        />
      )}
      {/* Add Goal Floating Button - Minimalist Style */}
      <TouchableOpacity
        style={styles.fabSmall}
        onPress={() => setAddGoalVisible(true)}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={16} color="#ffffff" style={{ marginRight: 4 }} />
        <Text style={styles.fabTextSmall}>Goal</Text>
      </TouchableOpacity>
      

      <Modal visible={addGoalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: "#ffffff", padding: 20, borderRadius: 4, width: "95%", maxWidth: 450, maxHeight: "90%" }}>
                {/* Header */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: "600", color: "#000000" }}>Add Goal</Text>
                  <TouchableOpacity onPress={() => setAddGoalVisible(false)}>
                    <Text style={{ fontSize: 16, color: "#666666" }}>×</Text>
                  </TouchableOpacity>
                </View>

                {/* Tab Switcher */}
                <View style={{ flexDirection: "row", backgroundColor: "#f8f9fa", borderRadius: 4, padding: 2, marginBottom: 20 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      backgroundColor: activeTab === "ai" ? "#000000" : "transparent",
                      borderRadius: 2,
                      alignItems: "center"
                    }}
                    onPress={() => setActiveTab("ai")}
                  >
                    <Text style={{ 
                      color: activeTab === "ai" ? "#ffffff" : "#666666", 
                      fontWeight: activeTab === "ai" ? "500" : "400",
                      fontSize: 14
                    }}>
                      AI Generate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      backgroundColor: activeTab === "manual" ? "#000000" : "transparent",
                      borderRadius: 2,
                      alignItems: "center"
                    }}
                    onPress={() => setActiveTab("manual")}
                  >
                    <Text style={{ 
                      color: activeTab === "manual" ? "#ffffff" : "#666666", 
                      fontWeight: activeTab === "manual" ? "500" : "400",
                      fontSize: 14
                    }}>
                      Manual Create
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* AI Tab Content */}
                  {activeTab === "ai" && (
                    <>
                      {/* Loading Overlay for AI Generation */}
                      {isGeneratingPreview && (
                        <View style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          justifyContent: 'center',
                          alignItems: 'center',
                          zIndex: 1000,
                          borderRadius: 8
                        }}>
                          <ActivityIndicator size="large" color="#000000" />
                          <Text style={{ marginTop: 12, fontSize: 16, color: "#000000", fontWeight: "500" }}>
                            AI is generating...
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 14, color: "#666666", textAlign: "center" }}>
                            This may take a few minutes
                          </Text>
                        </View>
                      )}

                      {!aiPreviewData ? (
                        <View>
                          {/* AI Input Section */}
                          <View style={{ backgroundColor: "#f8f9fa", padding: 16, borderRadius: 4, marginBottom: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: "500", marginBottom: 12, color: "#000000" }}>
                              Describe your goal
                            </Text>
                            <TextInput
                              style={{
                                borderWidth: 1,
                                borderColor: "#dddddd",
                                borderRadius: 4,
                                padding: 12,
                                minHeight: 80,
                                textAlignVertical: 'top',
                                marginBottom: 16,
                                backgroundColor: "#ffffff"
                              }}
                              placeholder="e.g.: Learn React Native and build a calendar app&#10;or: Prepare for postgraduate exams including Math, English, and major courses"
                              value={aiInput}
                              onChangeText={setAiInput}
                              multiline
                              maxLength={300}
                            />
                            
                            {/* AI Goal Parameters */}
                            <View style={{ marginBottom: 16 }}>
                              <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#000000" }}>
                                Goal Parameters (optional)
                              </Text>
                              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                  <Text style={{ fontSize: 12, color: "#666666", marginBottom: 4 }}>Priority</Text>
                                  <TextInput
                                    style={{
                                      borderWidth: 1,
                                      borderColor: "#dddddd",
                                      borderRadius: 4,
                                      padding: 8,
                                      fontSize: 14,
                                      backgroundColor: "#ffffff"
                                    }}
                                    placeholder="1-5"
                                    value={aiGoalPriority}
                                    onChangeText={setAiGoalPriority}
                                    keyboardType="numeric"
                                    maxLength={1}
                                  />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                  <Text style={{ fontSize: 12, color: "#666666", marginBottom: 4 }}>Life Points</Text>
                                  <TextInput
                                    style={{
                                      borderWidth: 1,
                                      borderColor: "#dddddd",
                                      borderRadius: 4,
                                      padding: 8,
                                      fontSize: 14,
                                      backgroundColor: "#ffffff"
                                    }}
                                    placeholder="100"
                                    value={aiGoalLifePoints}
                                    onChangeText={setAiGoalLifePoints}
                                    keyboardType="numeric"
                                  />
                                </View>
                              </View>
                              <TextInput
                                style={{
                                  borderWidth: 1,
                                  borderColor: "#dddddd",
                                  borderRadius: 4,
                                  padding: 8,
                                  fontSize: 14,
                                  backgroundColor: "#ffffff"
                                }}
                                placeholder="Additional description (optional)"
                                value={aiGoalDescription}
                                onChangeText={setAiGoalDescription}
                                maxLength={100}
                              />
                            </View>

                            <TouchableOpacity
                              style={{
                                backgroundColor: isGeneratingPreview ? "#e0e0e0" : "#000000",
                                padding: 12,
                                borderRadius: 4,
                                alignItems: "center"
                              }}
                              onPress={handleAIPreview}
                              disabled={isGeneratingPreview || !aiInput.trim()}
                            >
                              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "500" }}>
                                {isGeneratingPreview ? "Generating..." : "Generate"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        /* AI Preview Results */
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <Text style={{ fontSize: 14, fontWeight: "500", color: "#000000" }}>AI Preview</Text>
                            <TouchableOpacity
                              onPress={() => {
                                setAiPreviewData(null);
                                setEditableTasksPreview([]);
                              }}
                            >
                              <Text style={{ color: "#666666", fontSize: 12 }}>Regenerate</Text>
                            </TouchableOpacity>
                          </View>
                          
                          {/* Goal Preview */}
                          <View style={{ backgroundColor: "#f8f9fa", padding: 12, borderRadius: 4, marginBottom: 12 }}>
                            <Text style={{ fontSize: 12, fontWeight: "500", color: "#666666" }}>Goal:</Text>
                            <Text style={{ fontSize: 14, color: "#000000", marginTop: 4, fontWeight: "400" }}>
                              {aiPreviewData?.goal_preview?.name}
                            </Text>
                            {aiPreviewData?.goal_preview?.description && (
                              <Text style={{ fontSize: 12, color: "#666666", marginTop: 4 }}>
                                {aiPreviewData.goal_preview.description}
                              </Text>
                            )}
                          </View>

                          {/* Tasks Preview - Enhanced with editing capabilities */}
                          <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 8 }}>
                            Task List ({aiPreviewData?.total_tasks || 0} tasks):
                          </Text>
                          <View style={{ maxHeight: 300, marginBottom: 16 }}>
                            <ScrollView 
                              nestedScrollEnabled={true}
                              showsVerticalScrollIndicator={true}
                              bounces={true}
                              scrollEventThrottle={16}
                              keyboardShouldPersistTaps="handled"
                              contentContainerStyle={{ paddingBottom: 10 }}
                              style={{ backgroundColor: "#f8f9fa", borderRadius: 2, padding: 8 }}
                            >
                              {editableTasksPreview.map((task, index) => (
                                <View key={index} style={{ 
                                  backgroundColor: "#ffffff", 
                                  borderWidth: 1, 
                                  borderColor: "#e0e0e0", 
                                  borderRadius: 2, 
                                  padding: 12, 
                                  marginBottom: 8 
                                }}>
                                  {/* Task Header with Edit/Delete */}
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                    <View style={{ flex: 1, paddingRight: 8 }}>
                                      <Text style={{ fontSize: 14, fontWeight: "500", color: "#000000" }}>
                                        {index + 1}. {task.name}
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: "row", gap: 6, flexShrink: 0 }}>
                                      <TouchableOpacity
                                        activeOpacity={0.7}
                                        delayPressIn={100}
                                        onPress={() => {
                                          // Handle edit task - open comprehensive edit dialog
                                          const task = editableTasksPreview[index];
                                          
                                          // Create a simple multi-step edit process
                                          const editTaskSteps = [
                                            // Step 1: Edit name
                                            () => {
                                              Alert.prompt(
                                                "Edit Task Name",
                                                "Enter task name:",
                                                [
                                                  { text: "Cancel", style: "cancel" },
                                                  { 
                                                    text: "Next", 
                                                    onPress: (newName) => {
                                                      if (newName && newName.trim()) {
                                                        const updatedTasks = [...editableTasksPreview];
                                                        updatedTasks[index].name = newName.trim();
                                                        setEditableTasksPreview(updatedTasks);
                                                        
                                                        // Step 2: Edit description
                                                        setTimeout(() => {
                                                          Alert.prompt(
                                                            "Edit Description",
                                                            "Enter task description (optional):",
                                                            [
                                                              { text: "Skip", onPress: () => editPriority() },
                                                              { 
                                                                text: "Next", 
                                                                onPress: (newDesc) => {
                                                                  const updatedTasks = [...editableTasksPreview];
                                                                  updatedTasks[index].description = newDesc || "";
                                                                  setEditableTasksPreview(updatedTasks);
                                                                  editPriority();
                                                                }
                                                              }
                                                            ],
                                                            "plain-text",
                                                            task.description
                                                          );
                                                        }, 100);
                                                      }
                                                    }
                                                  }
                                                ],
                                                "plain-text",
                                                task.name
                                              );
                                            }
                                          ];
                                          
                                          const editPriority = () => {
                                            Alert.prompt(
                                              "Edit Priority",
                                              "Enter priority (1-5):",
                                              [
                                                { text: "Skip", onPress: () => editDays() },
                                                { 
                                                  text: "Next", 
                                                  onPress: (newPriority) => {
                                                    const priority = parseInt(newPriority || "3");
                                                    if (priority >= 1 && priority <= 5) {
                                                      const updatedTasks = [...editableTasksPreview];
                                                      updatedTasks[index].priority = priority;
                                                      setEditableTasksPreview(updatedTasks);
                                                    }
                                                    editDays();
                                                  }
                                                }
                                              ],
                                              "plain-text",
                                              task.priority.toString()
                                            );
                                          };
                                          
                                          const editDays = () => {
                                            Alert.prompt(
                                              "Edit Duration",
                                              "Enter estimated days:",
                                              [
                                                { text: "Skip", onPress: () => editPoints() },
                                                { 
                                                  text: "Next", 
                                                  onPress: (newDays) => {
                                                    const days = parseInt(newDays || "1");
                                                    if (days > 0) {
                                                      const updatedTasks = [...editableTasksPreview];
                                                      updatedTasks[index].scheduledParam = {
                                                        ...updatedTasks[index].scheduledParam,
                                                        estimatedDays: days
                                                      };
                                                      setEditableTasksPreview(updatedTasks);
                                                    }
                                                    editPoints();
                                                  }
                                                }
                                              ],
                                              "plain-text",
                                              task.scheduledParam?.estimatedDays?.toString() || "1"
                                            );
                                          };
                                          
                                          const editPoints = () => {
                                            Alert.prompt(
                                              "Edit Points",
                                              "Enter day points (optional):",
                                              [
                                                { text: "Done", onPress: () => Alert.alert("Success", "Task updated successfully!") },
                                                { 
                                                  text: "Save", 
                                                  onPress: (newPoints) => {
                                                    const points = newPoints ? parseInt(newPoints) : null;
                                                    const updatedTasks = [...editableTasksPreview];
                                                    updatedTasks[index].dayPoints = points;
                                                    setEditableTasksPreview(updatedTasks);
                                                    Alert.alert("Success", "Task updated successfully!");
                                                  }
                                                }
                                              ],
                                              "plain-text",
                                              task.dayPoints?.toString() || ""
                                            );
                                          };
                                          
                                          // Start the edit process
                                          editTaskSteps[0]();
                                        }}
                                        style={{ 
                                          padding: 6,
                                          backgroundColor: "#f0f0f0",
                                          borderRadius: 2,
                                          minWidth: 28,
                                          alignItems: "center"
                                        }}
                                      >
                                        <Text style={{ color: "#666666", fontSize: 10, fontWeight: "500" }}>Edit</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        activeOpacity={0.7}
                                        delayPressIn={100}
                                        onPress={() => {
                                          Alert.alert(
                                            "Delete Task",
                                            `Are you sure you want to delete "${task.name}"?`,
                                            [
                                              { text: "Cancel", style: "cancel" },
                                              { 
                                                text: "Delete", 
                                                style: "destructive",
                                                onPress: () => {
                                                  const updatedTasks = editableTasksPreview.filter((_, i) => i !== index);
                                                  setEditableTasksPreview(updatedTasks);
                                                }
                                              }
                                            ]
                                          );
                                        }}
                                        style={{ 
                                          padding: 6,
                                          backgroundColor: "#f0f0f0",
                                          borderRadius: 2,
                                          minWidth: 28,
                                          alignItems: "center"
                                        }}
                                      >
                                        <Text style={{ color: "#666666", fontSize: 10, fontWeight: "500" }}>Del</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                  
                                  {/* Task Description */}
                                  {task.description && (
                                    <Text style={{ fontSize: 12, color: "#666666", marginBottom: 8, lineHeight: 16 }}>
                                      {task.description}
                                    </Text>
                                  )}
                                  
                                  {/* Task Details Grid */}
                                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                    <View style={{ backgroundColor: "#f0f0f0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                                      <Text style={{ fontSize: 11, color: "#666666" }}>Priority: {task.priority}</Text>
                                    </View>
                                    
                                    {task.scheduledParam?.estimatedDays && (
                                      <View style={{ backgroundColor: "#f0f0f0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                                        <Text style={{ fontSize: 11, color: "#666666" }}>
                                          Duration: {task.scheduledParam.estimatedDays} days
                                        </Text>
                                      </View>
                                    )}
                                    
                                    {task.dayPoints && (
                                      <View style={{ backgroundColor: "#f0f0f0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                                        <Text style={{ fontSize: 11, color: "#666666" }}>Points: {task.dayPoints}</Text>
                                      </View>
                                    )}
                                    
                                    {task.scheduled && (
                                      <View style={{ backgroundColor: "#f0f0f0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                                        <Text style={{ fontSize: 11, color: "#666666" }}>
                                          Scheduled: {new Date(task.scheduled).toLocaleDateString()}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  
                                  {/* Time Information */}
                                  {(task.scheduledParam?.startTime || task.scheduledParam?.endTime) && (
                                    <View style={{ marginTop: 6, padding: 6, backgroundColor: "#f8f9fa", borderRadius: 2 }}>
                                      <Text style={{ fontSize: 10, color: "#666666", fontWeight: "500" }}>Time Schedule:</Text>
                                      {task.scheduledParam.startTime && (
                                        <Text style={{ fontSize: 10, color: "#666666" }}>
                                          Start: {task.scheduledParam.startTime}
                                        </Text>
                                      )}
                                      {task.scheduledParam.endTime && (
                                        <Text style={{ fontSize: 10, color: "#666666" }}>
                                          End: {task.scheduledParam.endTime}
                                        </Text>
                                      )}
                                    </View>
                                  )}
                                </View>
                              ))}
                              
                              {/* Add New Task Button */}
                              <TouchableOpacity
                                activeOpacity={0.7}
                                delayPressIn={100}
                                onPress={() => {
                                  // Multi-step new task creation
                                  const createNewTask = () => {
                                    let newTask: AITaskPreview = {
                                      name: "",
                                      description: "",
                                      priority: 3,
                                      dayPoints: null,
                                      completed: false,
                                      scheduled: new Date().toISOString(),
                                      scheduledParam: {
                                        estimatedDays: 1
                                      }
                                    };
                                    
                                    // Step 1: Name
                                    Alert.prompt(
                                      "Add New Task",
                                      "Enter task name:",
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        { 
                                          text: "Next", 
                                          onPress: (taskName) => {
                                            if (taskName && taskName.trim()) {
                                              newTask.name = taskName.trim();
                                              
                                              // Step 2: Description
                                              Alert.prompt(
                                                "Task Description",
                                                "Enter description (optional):",
                                                [
                                                  { text: "Skip", onPress: () => setPriority() },
                                                  { 
                                                    text: "Next", 
                                                    onPress: (description) => {
                                                      newTask.description = description || "";
                                                      setPriority();
                                                    }
                                                  }
                                                ],
                                                "plain-text"
                                              );
                                            }
                                          }
                                        }
                                      ],
                                      "plain-text"
                                    );
                                    
                                    const setPriority = () => {
                                      Alert.prompt(
                                        "Task Priority",
                                        "Enter priority (1-5, default is 3):",
                                        [
                                          { text: "Skip", onPress: () => setDuration() },
                                          { 
                                            text: "Next", 
                                            onPress: (priority) => {
                                              const p = parseInt(priority || "3");
                                              if (p >= 1 && p <= 5) {
                                                newTask.priority = p;
                                              }
                                              setDuration();
                                            }
                                          }
                                        ],
                                        "plain-text",
                                        "3"
                                      );
                                    };
                                    
                                    const setDuration = () => {
                                      Alert.prompt(
                                        "Task Duration",
                                        "Enter estimated days (default is 1):",
                                        [
                                          { text: "Skip", onPress: () => setPoints() },
                                          { 
                                            text: "Next", 
                                            onPress: (days) => {
                                              const d = parseInt(days || "1");
                                              if (d > 0) {
                                                newTask.scheduledParam.estimatedDays = d;
                                              }
                                              setPoints();
                                            }
                                          }
                                        ],
                                        "plain-text",
                                        "1"
                                      );
                                    };
                                    
                                    const setPoints = () => {
                                      Alert.prompt(
                                        "Day Points",
                                        "Enter day points (optional):",
                                        [
                                          { text: "Create", onPress: () => finalizeTask() },
                                          { 
                                            text: "Save", 
                                            onPress: (points) => {
                                              const p = points ? parseInt(points) : null;
                                              if (p !== null && p > 0) {
                                                newTask.dayPoints = p;
                                              }
                                              finalizeTask();
                                            }
                                          }
                                        ],
                                        "plain-text"
                                      );
                                    };
                                    
                                    const finalizeTask = () => {
                                      setEditableTasksPreview([...editableTasksPreview, newTask]);
                                      Alert.alert("Success", "New task added successfully!");
                                    };
                                  };
                                  
                                  createNewTask();
                                }}
                                style={{
                                  backgroundColor: "#f8f9fa",
                                  borderWidth: 1,
                                  borderColor: "#e0e0e0",
                                  borderStyle: "dashed",
                                  borderRadius: 2,
                                  padding: 12,
                                  alignItems: "center",
                                  marginTop: 8,
                                  marginBottom: 8
                                }}
                              >
                                <Text style={{ color: "#666666", fontSize: 13, fontWeight: "500" }}>
                                  + Add New Task
                                </Text>
                              </TouchableOpacity>
                            </ScrollView>
                          </View>

                          {/* Create Button */}
                          <TouchableOpacity
                            style={{
                              backgroundColor: isCreatingFromPreview ? "#e0e0e0" : "#000000",
                              padding: 12,
                              borderRadius: 2,
                              alignItems: "center",
                              marginBottom: 16
                            }}
                            onPress={handleCreateFromPreview}
                            disabled={isCreatingFromPreview}
                          >
                            {isCreatingFromPreview ? (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 }}>
                                  Creating...
                                </Text>
                              </View>
                            ) : (
                              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                                �?Confirm Create Goal and Tasks
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}

                  {/* Manual Tab Content */}
                  {activeTab === "manual" && (
                    <View>
                      {/* Goal Name Input */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#000000" }}>
                          Goal Name *
                        </Text>
                        <TextInput
                          style={{ 
                            borderWidth: 1, 
                            borderColor: "#dddddd", 
                            borderRadius: 4, 
                            padding: 12,
                            backgroundColor: "#ffffff",
                            fontSize: 16
                          }}
                          placeholder="e.g.: Fitness Plan, Learn React Native"
                          value={newGoalName}
                          onChangeText={setNewGoalName}
                          maxLength={50}
                          autoCapitalize="words"
                        />
                      </View>
                      
                      {/* Goal Description Input */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#000000" }}>
                          Goal Description
                        </Text>
                        <TextInput
                          style={{ 
                            borderWidth: 1, 
                            borderColor: "#dddddd", 
                            borderRadius: 4, 
                            padding: 12, 
                            minHeight: 80, 
                            textAlignVertical: 'top',
                            backgroundColor: "#ffffff",
                            fontSize: 14
                          }}
                          placeholder="Describe your goal in detail..."
                          value={newGoalDesc}
                          onChangeText={setNewGoalDesc}
                          multiline
                          maxLength={200}
                        />
                      </View>
                      
                      {/* Parameters Row */}
                      <View style={{ flexDirection: "row", marginBottom: 16 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#000000" }}>
                            Priority
                          </Text>
                          <TextInput
                            style={{ 
                              borderWidth: 1, 
                              borderColor: "#dddddd", 
                              borderRadius: 4, 
                              padding: 12,
                              backgroundColor: "#ffffff",
                              fontSize: 14
                            }}
                            placeholder="1-5"
                            value={newGoalPriority}
                            onChangeText={v => setNewGoalPriority(v.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            maxLength={1}
                          />
                        </View>
                        
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#000000" }}>
                            Life Points
                          </Text>
                          <TextInput
                            style={{ 
                              borderWidth: 1, 
                              borderColor: "#dddddd", 
                              borderRadius: 4, 
                              padding: 12,
                              backgroundColor: "#ffffff",
                              fontSize: 14
                            }}
                            placeholder="100"
                            value={newGoalLifePoints}
                            onChangeText={v => setNewGoalLifePoints(v.replace(/[^0-9]/g, ''))}
                            keyboardType="numeric"
                            maxLength={6}
                          />
                        </View>
                      </View>
                      
                      {/* Achieved Toggle */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#000000" }}>
                          Goal Status
                        </Text>
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: newGoalAchieved ? "#f8f9fa" : "#f8f9fa",
                            padding: 12,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: newGoalAchieved ? "#000000" : "#dddddd"
                          }}
                          onPress={() => setNewGoalAchieved(!newGoalAchieved)}
                        >
                          <View style={{
                            width: 16,
                            height: 16,
                            borderRadius: 2,
                            backgroundColor: newGoalAchieved ? "#000000" : "#ffffff",
                            borderWidth: newGoalAchieved ? 0 : 1,
                            borderColor: "#dddddd",
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 12
                          }}>
                            {newGoalAchieved && (
                              <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>✓</Text>
                            )}
                          </View>
                          <Text style={{ 
                            fontSize: 14, 
                            color: newGoalAchieved ? "#000000" : "#666666"
                          }}>
                            {newGoalAchieved ? "Completed" : "In Progress"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Create Button */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: addingGoal ? "#e0e0e0" : "#000000",
                          padding: 16,
                          borderRadius: 4,
                          alignItems: "center",
                          marginBottom: 16
                        }}
                        onPress={handleAddGoal}
                        disabled={addingGoal || !newGoalName.trim()}
                      >
                        {addingGoal ? (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <ActivityIndicator size="small" color="#666666" />
                            <Text style={{ color: "#666666", fontSize: 16, fontWeight: "500", marginLeft: 8 }}>
                              Creating...
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "500" }}>
                            Create Goal
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>

                {/* Bottom Buttons */}
                <View style={{ 
                  flexDirection: "row", 
                  justifyContent: "space-between", 
                  alignItems: "center",
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: "#eee",
                  marginTop: 8
                }}>
                  <TouchableOpacity 
                    onPress={() => {
                      setAddGoalVisible(false);
                      resetAIModal();
                      setNewGoalName("");
                      setNewGoalDesc("");
                      setNewGoalAchieved(false);
                      setNewGoalLifePoints("");
                      setNewGoalPriority("");
                    }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 4,
                      backgroundColor: "#f8f9fa",
                      borderWidth: 1,
                      borderColor: "#dddddd"
                    }}
                  >
                    <Text style={{ color: "#666666", fontSize: 16, fontWeight: "400" }}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <Text style={{ fontSize: 12, color: "#999999", textAlign: "center", flex: 1, marginHorizontal: 16 }}>
                    {activeTab === "ai" ? "AI will generate goals and tasks" : "Create a custom goal"}
                  </Text>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AddTaskModal
        visible={addTaskModalVisible}
        goalId={addingTaskGoalId}
        onClose={() => setAddTaskModalVisible(false)}
        onSuccess={() => {}}
      />
      <AddTaskModal
        visible={editTaskModalVisible}
        goalId={editingTask?.goalId || null}
        onClose={() => {
          setEditTaskModalVisible(false);
          setEditingTask(null);
        }}
        onSuccess={handleUpdateTask}
        isEdit={true}
        initialData={{
          name: newTaskName,
          tags: newTaskTags,
          startTime: newTaskStartTime,
          endTime: newTaskEndTime,
          scheduled: newTaskScheduled,
          scheduledParam: newTaskScheduledParam,
          details: details,
          completed: editingTask?.completed || false
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  header: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
    color: "#000000",
  },
  goalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#000000",
  },
  goalDesc: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
  },
  goalDetailsBox: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#dddddd",
  },
  goalField: {
    fontSize: 14,
    color: "#000000",
    marginBottom: 8,
  },
  taskTreeBox: {
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 18,
    position: "relative",
  },
  taskTreeLine: {
    position: "absolute",
    top: 0,
    left: 9,
    width: 2,
    height: "100%",
    backgroundColor: "#dddddd",
    zIndex: 1,
  },
  taskCardTree: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
    marginLeft: 18,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
  },
  taskField: {
    fontSize: 14,
    color: "#666666",
    marginTop: 4,
  },
  taskHint: {
    fontSize: 10,
    color: "#999999",
    marginLeft: 8,
    fontStyle: 'italic',
  },
  goalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  fabSmall: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#000000",
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  fabTextSmall: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: "#333",
  },
  detailPickerTouchable: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailPickerDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 4,
    zIndex: 10,
  },
  detailPickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    fontSize: 16,
    color: "#333",
  },
  deleteDetailButton: {
    padding: 8,
  },
  addDetailButton: {
    backgroundColor: "#000000",
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addDetailButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  dateTimeContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  // AddTagToTaskButton 组件样式
  tagButton: {
    backgroundColor: "#000000",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonText: {
    color: "#ffffff",
    fontSize: 14,
    marginLeft: 4,
  },
  tagPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  tagPickerContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 4,
  },
  tagPickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
       marginBottom: 16,
    textAlign: "center",
  },
  tagOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tagOptionText: {
    fontSize: 16,
    color: "#333",
  },
  tagSelected: {
    backgroundColor: "#e6f0ff",
  },
  tagPickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  tagPickerCancel: {
    marginRight: 16,
  },
  tagPickerSave: {
    color: "#000000",
    fontSize: 16,
  },
});
