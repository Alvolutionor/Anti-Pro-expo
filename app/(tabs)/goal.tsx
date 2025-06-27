import React, { useEffect, useState } from "react";
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
} from "../../utils/api";
import {
  setGoals,
  addGoal,
  updateGoal as updateGoalRedux,
  deleteGoal as deleteGoalRedux,
} from "../../store/goalSlice";
import { setTasks } from "../../store/taskSlice";
import AntDesign from "@expo/vector-icons/AntDesign";
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTags } from '../../utils/api';
import { scheduleTaskNotification as utilScheduleTaskNotification } from '../../utils/notifications';

export default function GoalsManager() {
  const dispatch = useDispatch<AppDispatch>();
  const goals = useSelector((state: RootState) => state.goal.goals);
  const tasks = useSelector((state: RootState) => state.task.tasks);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalOut | null>(null);
  const [form, setForm] = useState<CreateGoalData>({ name: "" });
  const [saving, setSaving] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<number | null>(null);
  // 新增互斥下拉菜单控制
  const [openDropdown, setOpenDropdown] = useState<null | 'scheduled' | 'scheduledParam'>(null);

  const fetchGoalsAndTasks = async () => {
    setLoading(true);
    try {
      const [goalsRes, tasksRes] = await Promise.all([getGoals(), getTasks()]);
      dispatch(setGoals(goalsRes.data));
      dispatch(setTasks(tasksRes.data));
    } catch (e) {
      Alert.alert("Failed to load data", String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsAndTasks();
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

  // Add Task 相关 state（完全复用 index.tsx 结构）
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [addingTaskGoalId, setAddingTaskGoalId] = useState<number | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskEvent, setNewTaskEvent] = useState("");
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

  // 拉取 tag 列表
  useEffect(() => {
    getTags().then(res => {
      if (res && res.data) {
        setTagList(res.data);
      }
    }).catch(() => {
      setTagList([]);
    });
  }, []);

  // Add Task 逻辑
  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      Alert.alert("Task name is required");
      return;
    }
    if (!addingTaskGoalId) {
      Alert.alert("No goal selected");
      return;
    }
    setSavingTask(true);
    try {
      const data = {
        name: newTaskName,
        startTime: newTaskStartTime,
        endTime: newTaskEndTime,
        details: details.reduce((acc: Record<string, any>, detail) => {
          // desc 必须有，且 key 为空时自动用 desc
          if (!detail.key) {
            acc['desc'] = detail.value;
          } else {
            acc[detail.key] = detail.value;
          }
          return acc;
        }, {}),
        tag: newTaskEvent,
        goalId: addingTaskGoalId,
        scheduled: newTaskScheduled,
        scheduledParam: newTaskScheduled === "periodic" ? newTaskScheduledParam : {},
      };
      await createTask(data);
      // 刷新 tasks
      const tasksRes = await getTasks();
      dispatch(setTasks(tasksRes.data));
      setAddTaskModalVisible(false);
      setNewTaskName("");
      setNewTaskEvent("");
      setNewTaskStartTime("");
      setNewTaskEndTime("");
      setDetails([{ key: "desc", value: "" }]);
      setNewTaskScheduled("onetime");
      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
      setOpenDropdown(null);
      setAddingTaskGoalId(null);
    } catch (e) {
      Alert.alert("Failed to add task", String(e));
    } finally {
      setSavingTask(false);
    }
  };

  const renderGoal = ({ item }: { item: GoalOut }) => {
    const goalTasks: TaskOut[] = tasks.filter((t: TaskOut) => t.goalId === item.id);
    const expanded = expandedGoalId === item.id;
    return (
      <View style={styles.goalCard}>
        <TouchableOpacity
          onPress={() => setExpandedGoalId(expanded ? null : item.id)}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <AntDesign
            name={expanded ? 'down' : 'right'}
            size={18}
            color="#007bff"
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.goalTitle}>{item.name}</Text>
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
              <Text style={{ color: "#888", marginBottom: 8, marginLeft: 18 }}>
                No tasks for this goal.
              </Text>
            ) : (
              <View style={styles.taskTreeBox}>
                <View style={styles.taskTreeLine} />
                <View style={{ flex: 1 }}>
                  {goalTasks.map((task: TaskOut) => (
                    <View key={task.id} style={styles.taskCardTree}>
                      <Text style={styles.taskTitle}>{task.name}</Text>
                      <Text style={styles.taskField}>Start: {task.startTime}</Text>
                      <Text style={styles.taskField}>End: {task.endTime}</Text>
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
                    </View>
                  ))}
                </View>
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
              <AntDesign name="pluscircleo" size={18} color="#007bff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#007bff', fontWeight: 'bold' }}>Add Task</Text>
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
  };

  // Add Goal 弹窗相关 state
  const [addGoalVisible, setAddGoalVisible] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDesc, setNewGoalDesc] = useState("");
  const [newGoalAchieved, setNewGoalAchieved] = useState(false);
  const [newGoalLifePoints, setNewGoalLifePoints] = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState("");
  const [openScheduled, setOpenScheduled] = useState(false);
  const [openFreq, setOpenFreq] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);

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
      setOpenScheduled(false);
      setOpenFreq(false);
      setShowDatePicker(false);
    } catch (e) {
      Alert.alert("Failed to add goal", String(e));
    } finally {
      setAddingGoal(false);
    }
  };

  // AddTaskModal 组件，参考 index.tsx 的 startTime/endTime 显示逻辑和 timepicker UI
  function AddTaskModal({ visible, goalId, onClose, onSuccess }: {
    visible: boolean; goalId: number | null; onClose: () => void;
    onSuccess: () => void
  }) {
    const dispatch = useDispatch<AppDispatch>();
    const [newTaskName, setNewTaskName] = useState("");
    const [newTaskEvent, setNewTaskEvent] = useState("");
    const [newTaskStartTime, setNewTaskStartTime] = useState("");
    const [newTaskEndTime, setNewTaskEndTime] = useState("");
    const [details, setDetails] = useState([{ key: "desc", value: "" }]);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showMoreFields, setShowMoreFields] = useState(true);
    const [newTaskScheduled, setNewTaskScheduled] = useState("onetime");
    const [newTaskScheduledParam, setNewTaskScheduledParam] = useState<any>({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
    const [modalOpenDropdown, setModalOpenDropdown] = useState<null | string>(null);
    const [tagList, setTagList] = useState<{ id: number; name: string; color?: string }[]>([]);
    const [savingTask, setSavingTask] = useState(false);

    useEffect(() => {
      getTags().then(res => {
        if (res && res.data) {
          setTagList(res.data);
        }
      }).catch(() => {
        setTagList([]);
      });
    }, []);

    // 详情字段动态增删
    const handleDetailChange = (idx: number, value: string) => {
      setDetails(details => details.map((d, i) => i === idx ? { ...d, value } : d));
    };
    const handleAddDetail = () => {
      setDetails(details => [...details, { key: "", value: "" }]);
    };
    const handleDeleteDetail = (idx: number) => {
      setDetails(details => details.filter((_, i) => i !== idx));
    };

    // index.tsx 逻辑：不同 scheduled 类型下，start/end time 的显示和 picker 类型
    // onetime: 显示 start/end，均为 datetime picker
    // periodic: 只显示 start（time picker），不显示 end
    // finishedby: 只显示 end（datetime picker），不显示 start

    const handleAddTask = async () => {
      if (!newTaskName.trim()) {
        Alert.alert("Task name is required");
        return;
      }
      if (!goalId) {
        Alert.alert("No goal selected");
        return;
      }
      setSavingTask(true);
      try {
        const data = {
          name: newTaskName,
          startTime: newTaskStartTime,
          endTime: newTaskEndTime,
          details: details.reduce((acc: Record<string, any>, detail) => {
            // desc 必须有，且 key 为空时自动用 desc
            if (!detail.key) {
              acc['desc'] = detail.value;
            } else {
              acc[detail.key] = detail.value;
            }
            return acc;
          }, {}),
          tag: newTaskEvent,
          goalId: goalId,
          scheduled: newTaskScheduled,
          scheduledParam: newTaskScheduled === "periodic" ? newTaskScheduledParam : {},
        };
        // 不传 description 字段，避免后端报错
        await createTask(data);
        const tasksRes = await getTasks();
        dispatch(setTasks(tasksRes.data));
        onSuccess();
        handleClose();
      } catch (e) {
        Alert.alert("Failed to add task", String(e));
      } finally {
        setSavingTask(false);
      }
    };

    const handleClose = () => {
      setNewTaskName("");
      setNewTaskEvent("");
      setNewTaskStartTime("");
      setNewTaskEndTime("");
      setDetails([{ key: "desc", value: "" }]);
      setNewTaskScheduled("onetime");
      setNewTaskScheduledParam({ type: "", daysOfWeek: [], daysOfMonth: [], dateOfYear: "" });
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
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalTitle}>Add Task</Text>
                  {/* Task Name Input */}
                  <TextInput
                    style={styles.input}
                    placeholder="Task Name (e.g. Read a book)"
                    value={newTaskName}
                    onChangeText={setNewTaskName}
                    maxLength={40}
                    autoCapitalize="sentences"
                  />
                  {/* Scheduled 下拉选择 - 统一下拉菜单风格 */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.goalField}>Scheduled</Text>
                    <View>
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setModalOpenDropdown(modalOpenDropdown === "scheduled" ? null : "scheduled")}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: newTaskScheduled ? "#222" : "#888" }}>
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
                              <Text style={{ color: "#222" }}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Start/End Time 选择器，逻辑同 index.tsx，可根据 scheduled 类型动态渲染 */}
                  {newTaskScheduled === "onetime" && (
                    <>
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setShowStartTimePicker(true)}
                      >
                        <Text style={{ color: newTaskStartTime ? "#222" : "#888" }}>
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
                            setShowStartTimePicker(false);
                            if (date) setNewTaskStartTime(date.toISOString());
                          }}
                        />
                      )}
                      <TouchableOpacity
                        style={styles.detailPickerTouchable}
                        onPress={() => setShowEndTimePicker(true)}
                      >
                        <Text style={{ color: newTaskEndTime ? "#222" : "#888" }}>
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
                            setShowEndTimePicker(false);
                            if (date) setNewTaskEndTime(date.toISOString());
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
                        <Text style={{ color: newTaskStartTime ? "#222" : "#888" }}>
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
                            setShowStartTimePicker(false);
                            if (date) setNewTaskStartTime(date.toISOString());
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
                        <Text style={{ color: newTaskEndTime ? "#222" : "#888" }}>
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
                            setShowEndTimePicker(false);
                            if (date) setNewTaskEndTime(date.toISOString());
                          }}
                        />
                      )}
                    </>
                  )}
                  {/* 详情字段输入，支持多行增删 */}
                  <View style={styles.detailContainer}>
                    <Text style={styles.goalField}>Details</Text>
                    {details.map((detail, idx) => (
                      <View key={idx} style={styles.detailRow}>
                        {/* 新增：详情key选择器 */}
                        <TouchableOpacity
                          style={[styles.detailPickerTouchable, { flex: 0.5, marginRight: 8, minWidth: 80 }]}
                          onPress={() => setModalOpenDropdown(modalOpenDropdown === `detail-key-${idx}` ? null : `detail-key-${idx}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={{ color: detail.key ? '#222' : '#888' }}>
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
                                  setDetails(ds => ds.map((d, i) => i === idx ? { ...d, key: opt } : d));
                                  setModalOpenDropdown(null);
                                }}
                              >
                                <Text style={{ color: '#222' }}>{opt}</Text>
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
                  {/* 其他表单项复用 index.tsx 逻辑 */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                    <TouchableOpacity onPress={handleClose} style={{ marginRight: 16 }}>
                      <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddTask} disabled={savingTask}>
                      <Text style={{ color: savingTask ? "#aaa" : "#007bff", fontSize: 16 }}>{savingTask ? "Adding..." : "Add"}</Text>
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
  // 修复：确保 AddTaskModal 组件完整闭合
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Goals & Tasks</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(g) => g.id.toString()}
          renderItem={renderGoal}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 32 }}>
              No goals yet.
            </Text>
          }
        />
      )}
      {/* Add Goal Floating Button - calendar风格 */}
      <TouchableOpacity
        style={styles.fabSmall}
        onPress={() => setAddGoalVisible(true)}
        activeOpacity={0.85}
      >
        <AntDesign name="plus" size={22} color="#fff" />
        <Text style={styles.fabTextSmall}>Add Goal</Text>
      </TouchableOpacity>
      <Modal visible={addGoalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: "#fff", padding: 24, borderRadius: 12, width: 300 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>Add Goal</Text>
                <TextInput
                  style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 }}
                  placeholder="Goal Name (e.g. Fitness)"
                  value={newGoalName}
                  onChangeText={setNewGoalName}
                  maxLength={32}
                  autoCapitalize="words"
                />
                <TextInput
                  style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12, minHeight: 40 }}
                  placeholder="Description (e.g. Run 3 times a week)"
                  value={newGoalDesc}
                  onChangeText={setNewGoalDesc}
                  multiline
                  maxLength={100}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ marginRight: 8 }}>Achieved:</Text>
                  <Button title={newGoalAchieved ? "Yes" : "No"} onPress={() => setNewGoalAchieved(v => !v)} />
                </View>
                <TextInput
                  style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 }}
                  placeholder="Life Points (number, e.g. 10)"
                  value={newGoalLifePoints}
                  onChangeText={v => setNewGoalLifePoints(v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TextInput
                  style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8, marginBottom: 12 }}
                  placeholder="Priority (number, e.g. 1)"
                  value={newGoalPriority}
                  onChangeText={v => setNewGoalPriority(v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <TouchableOpacity onPress={() => setAddGoalVisible(false)} style={{ marginRight: 16 }}>
                    <Text style={{ color: "#888", fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddGoal} disabled={addingGoal}>
                    <Text style={{ color: addingGoal ? "#aaa" : "#007bff", fontSize: 16 }}>{addingGoal ? "Adding..." : "Add"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.modalTitle}>
                    {editingGoal ? "Edit Goal" : "Add Goal"}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name* (e.g. Fitness, Learn React)"
                    value={form.name}
                    onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                    autoCapitalize="words"
                    maxLength={32}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Description (e.g. Run 3 times a week)"
                    value={form.description || ""}
                    onChangeText={(v) =>
                      setForm((f) => ({ ...f, description: v }))
                    }
                    maxLength={100}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ marginRight: 8 }}>Achieved:</Text>
                    <Button
                      title={form.achieved ? "Yes" : "No"}
                      onPress={() =>
                        setForm((f) => ({ ...f, achieved: !f.achieved }))
                      }
                    />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Life Points (number, e.g. 10)"
                    value={form.lifePoints?.toString() || ""}
                    onChangeText={(v) =>
                      setForm((f) => ({
                        ...f,
                        lifePoints:
                          v && !isNaN(Number(v)) ? Number(v) : undefined,
                      }))
                    }
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Priority (number, e.g. 1)"
                    value={form.priority?.toString() || ""}
                    onChangeText={(v) =>
                      setForm((f) => ({
                        ...f,
                        priority:
                          v && !isNaN(Number(v)) ? Number(v) : undefined,
                      }))
                    }
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 16,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(false);
                        Keyboard.dismiss();
                      }}
                      style={{ marginRight: 16 }}
                    >
                      <Text style={{ color: "#888", fontSize: 16 }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                      <Text
                        style={{
                          color: saving ? "#aaa" : "#007bff",
                          fontSize: 16,
                        }}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "#f7f9fc",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  goalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  goalDesc: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  goalDetailsBox: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  goalField: {
    fontSize: 14,
    color: "#333",
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
    backgroundColor: "#007bff",
    zIndex: 1,
  },
  taskCardTree: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginLeft: 18,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  taskField: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
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
    backgroundColor: "#007bff",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  fabTextSmall: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 8,
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
    backgroundColor: "#007bff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addDetailButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
