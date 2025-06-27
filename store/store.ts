import { configureStore } from '@reduxjs/toolkit';
import goalReducer from './goalSlice';
import taskReducer from './taskSlice';

const store = configureStore({
  reducer: {
    goal: goalReducer,
    task: taskReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;

// 让 react-redux 的 useSelector 自动推断 RootState
import type {} from 'react-redux';
declare module 'react-redux' {
  interface DefaultRootState extends RootState {}
}
