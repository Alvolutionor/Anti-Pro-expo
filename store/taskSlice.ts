import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TaskOut } from '../utils/api';

interface TaskState {
  tasks: TaskOut[];
}

const initialState: TaskState = {
  tasks: [],
};

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    setTasks(state, action: PayloadAction<TaskOut[]>) {
      state.tasks = action.payload;
    },
    addTask(state, action: PayloadAction<TaskOut>) {
      state.tasks.push(action.payload);
    },
    updateTask(state, action: PayloadAction<TaskOut>) {
      const idx = state.tasks.findIndex(t => t.id === action.payload.id);
      if (idx !== -1) state.tasks[idx] = action.payload;
    },
    deleteTask(state, action: PayloadAction<number>) {
      state.tasks = state.tasks.filter(t => t.id !== action.payload);
    },
  },
});

export const { setTasks, addTask, updateTask, deleteTask } = taskSlice.actions;
export default taskSlice.reducer;
