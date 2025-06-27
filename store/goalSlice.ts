import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GoalOut } from '../utils/api';

interface GoalState {
  goals: GoalOut[];
}

const initialState: GoalState = {
  goals: [],
};

const goalSlice = createSlice({
  name: 'goal',
  initialState,
  reducers: {
    setGoals(state, action: PayloadAction<GoalOut[]>) {
      state.goals = action.payload;
    },
    addGoal(state, action: PayloadAction<GoalOut>) {
      state.goals.push(action.payload);
    },
    updateGoal(state, action: PayloadAction<GoalOut>) {
      const idx = state.goals.findIndex(g => g.id === action.payload.id);
      if (idx !== -1) state.goals[idx] = action.payload;
    },
    deleteGoal(state, action: PayloadAction<number>) {
      state.goals = state.goals.filter(g => g.id !== action.payload);
    },
  },
});

export const { setGoals, addGoal, updateGoal, deleteGoal } = goalSlice.actions;
export default goalSlice.reducer;
