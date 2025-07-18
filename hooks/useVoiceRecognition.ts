import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { startRecording, stopAndTranscribe, pickAndTranscribeAudio } from '../utils/voice';

export interface UseVoiceRecognitionOptions {
  autoStart?: boolean;
  maxDuration?: number; // 最大录音时长（毫秒）
  minDuration?: number; // 最小录音时长（毫秒）
  enableFeedback?: boolean; // 是否启用语音反馈
  language?: string; // 语音反馈语言
  onTranscriptionStart?: () => void;
  onTranscriptionComplete?: (text: string) => void;
  onTranscriptionError?: (error: string) => void;
}

export interface VoiceRecognitionState {
  isRecording: boolean;
  isProcessing: boolean;
  hasPermission: boolean | null;
  recordingDuration: number;
  lastTranscription: string | null;
  error: string | null;
}

export const useVoiceRecognition = (options: UseVoiceRecognitionOptions = {}) => {
  const {
    maxDuration = 60000, // 默认60秒
    minDuration = 1000,  // 默认1秒
    enableFeedback = true,
    language = 'zh-CN',
    onTranscriptionStart,
    onTranscriptionComplete,
    onTranscriptionError,
  } = options;

  const [state, setState] = useState<VoiceRecognitionState>({
    isRecording: false,
    isProcessing: false,
    hasPermission: null,
    recordingDuration: 0,
    lastTranscription: null,
    error: null,
  });

  const recordingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<VoiceRecognitionState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // 检查权限
  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const hasPermission = status === 'granted';
      updateState({ hasPermission });
      
      if (!hasPermission) {
        Alert.alert(
          '需要麦克风权限',
          '为了使用语音识别功能，请允许访问麦克风',
          [
            { text: '取消', style: 'cancel' },
            { text: '设置', onPress: () => Alert.alert('提示', '请在系统设置中开启麦克风权限') }
          ]
        );
      }
      
      return hasPermission;
    } catch (error) {
      console.error('权限检查失败:', error);
      updateState({ hasPermission: false, error: '权限检查失败' });
      return false;
    }
  }, [updateState]);

  // 播放语音反馈
  const speakFeedback = useCallback((text: string) => {
    if (enableFeedback) {
      Speech.speak(text, { language, rate: 1.2 });
    }
  }, [enableFeedback, language]);

  // 清除定时器
  const clearTimers = useCallback(() => {
    if (recordingTimer.current) {
      clearTimeout(recordingTimer.current);
      recordingTimer.current = null;
    }
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
  }, []);

  // 开始录音
  const startVoiceRecording = useCallback(async () => {
    try {
      // 检查权限
      const hasPermission = await checkPermissions();
      if (!hasPermission) return false;

      // 检查当前状态
      if (state.isRecording || state.isProcessing) {
        console.warn('Already recording or processing');
        return false;
      }

      updateState({ 
        isRecording: true, 
        error: null, 
        recordingDuration: 0,
        lastTranscription: null 
      });

      await startRecording();
      speakFeedback('开始录音');
      onTranscriptionStart?.();

      // 开始计时器
      durationTimer.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 100
        }));
      }, 100);

      // 设置最大录音时长自动停止
      recordingTimer.current = setTimeout(() => {
        stopVoiceRecording();
      }, maxDuration);

      return true;
    } catch (error) {
      console.error('录音启动失败:', error);
      const errorMsg = '录音启动失败，请重试';
      updateState({ isRecording: false, error: errorMsg });
      onTranscriptionError?.(errorMsg);
      return false;
    }
  }, [checkPermissions, state.isRecording, state.isProcessing, updateState, speakFeedback, onTranscriptionStart, maxDuration]);

  // 停止录音并转录
  const stopVoiceRecording = useCallback(async () => {
    try {
      if (!state.isRecording) return null;

      // 检查最小录音时长
      if (state.recordingDuration < minDuration) {
        Alert.alert('提示', `录音时间太短，请至少录音 ${minDuration / 1000} 秒`);
        return null;
      }

      clearTimers();
      updateState({ isRecording: false, isProcessing: true });
      speakFeedback('录音结束，正在识别');

      const transcribedText = await stopAndTranscribe();

      if (transcribedText && transcribedText.trim()) {
        const cleanText = transcribedText.trim();
        updateState({ 
          isProcessing: false, 
          lastTranscription: cleanText,
          error: null 
        });
        speakFeedback('识别完成');
        onTranscriptionComplete?.(cleanText);
        return cleanText;
      } else {
        const errorMsg = '未识别到语音内容，请重新尝试';
        updateState({ isProcessing: false, error: errorMsg });
        onTranscriptionError?.(errorMsg);
        Alert.alert('提示', errorMsg);
        return null;
      }
    } catch (error) {
      console.error('语音识别失败:', error);
      const errorMsg = '语音识别失败，请重试';
      clearTimers();
      updateState({ 
        isRecording: false, 
        isProcessing: false, 
        error: errorMsg 
      });
      onTranscriptionError?.(errorMsg);
      Alert.alert('错误', errorMsg);
      return null;
    }
  }, [state.isRecording, state.recordingDuration, minDuration, clearTimers, updateState, speakFeedback, onTranscriptionComplete, onTranscriptionError]);

  // 切换录音状态
  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      return await stopVoiceRecording();
    } else {
      const success = await startVoiceRecording();
      return success ? 'started' : null;
    }
  }, [state.isRecording, stopVoiceRecording, startVoiceRecording]);

  // 从文件选择音频进行转录
  const transcribeFromFile = useCallback(async () => {
    try {
      updateState({ isProcessing: true, error: null });
      speakFeedback('正在处理音频文件');

      const transcribedText = await pickAndTranscribeAudio();

      if (transcribedText && transcribedText.trim()) {
        const cleanText = transcribedText.trim();
        updateState({ 
          isProcessing: false, 
          lastTranscription: cleanText,
          error: null 
        });
        speakFeedback('文件识别完成');
        onTranscriptionComplete?.(cleanText);
        return cleanText;
      } else {
        const errorMsg = '未能从文件中识别到语音内容';
        updateState({ isProcessing: false, error: errorMsg });
        onTranscriptionError?.(errorMsg);
        Alert.alert('提示', errorMsg);
        return null;
      }
    } catch (error) {
      console.error('文件转录失败:', error);
      const errorMsg = '文件转录失败，请重试';
      updateState({ isProcessing: false, error: errorMsg });
      onTranscriptionError?.(errorMsg);
      Alert.alert('错误', errorMsg);
      return null;
    }
  }, [updateState, speakFeedback, onTranscriptionComplete, onTranscriptionError]);

  // 重置状态
  const reset = useCallback(() => {
    clearTimers();
    Speech.stop();
    updateState({
      isRecording: false,
      isProcessing: false,
      recordingDuration: 0,
      lastTranscription: null,
      error: null,
    });
  }, [clearTimers, updateState]);

  // 格式化录音时长
  const formatDuration = useCallback((duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    // 状态
    ...state,
    formattedDuration: formatDuration(state.recordingDuration),
    
    // 操作方法
    startRecording: startVoiceRecording,
    stopRecording: stopVoiceRecording,
    toggleRecording,
    transcribeFromFile,
    checkPermissions,
    reset,
    
    // 工具方法
    formatDuration,
  };
};

export default useVoiceRecognition;
