import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { startRecording, stopAndTranscribe } from '../utils/voice';

interface VoiceRecognitionButtonProps {
  onTranscriptionComplete: (text: string) => void;
  onError?: (error: string) => void;
  style?: any;
  size?: number;
  color?: string;
  disabled?: boolean;
}

export const VoiceRecognitionButton: React.FC<VoiceRecognitionButtonProps> = ({
  onTranscriptionComplete,
  onError,
  style,
  size = 24,
  color = '#007bff',
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // 检查音频权限
  useEffect(() => {
    checkAudioPermissions();
  }, []);

  const checkAudioPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          '需要麦克风权限',
          '为了使用语音识别功能，请允许访问麦克风',
          [
            { text: '取消', style: 'cancel' },
            { text: '设置', onPress: () => Alert.alert('提示', '请在系统设置中开启麦克风权限') }
          ]
        );
      }
    } catch (error) {
      console.error('权限检查失败:', error);
      setHasPermission(false);
    }
  };

  const handlePress = async () => {
    if (disabled || hasPermission === false) return;

    if (isRecording) {
      // 停止录音并转录
      await stopRecording();
    } else {
      // 开始录音
      await startRecordingProcess();
    }
  };

  const startRecordingProcess = async () => {
    try {
      setIsRecording(true);
      await startRecording();
      
      // 播放开始录音提示音
      Speech.speak('开始录音', { language: 'zh-CN', rate: 1.2 });
      
    } catch (error) {
      console.error('录音启动失败:', error);
      setIsRecording(false);
      const errorMsg = '录音启动失败，请重试';
      Alert.alert('错误', errorMsg);
      onError?.(errorMsg);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      setIsProcessing(true);
      
      // 播放结束录音提示音
      Speech.speak('录音结束，正在识别', { language: 'zh-CN', rate: 1.2 });
      
      const transcribedText = await stopAndTranscribe();
      
      if (transcribedText && transcribedText.trim()) {
        onTranscriptionComplete(transcribedText.trim());
        // 播放成功提示音
        Speech.speak('识别完成', { language: 'zh-CN', rate: 1.2 });
      } else {
        const errorMsg = '未识别到语音内容，请重新尝试';
        Alert.alert('提示', errorMsg);
        onError?.(errorMsg);
      }
    } catch (error) {
      console.error('语音识别失败:', error);
      const errorMsg = '语音识别失败，请重试';
      Alert.alert('错误', errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonStyle = () => {
    if (disabled || hasPermission === false) {
      return [styles.button, styles.buttonDisabled, style];
    }
    if (isRecording) {
      return [styles.button, styles.buttonRecording, style];
    }
    if (isProcessing) {
      return [styles.button, styles.buttonProcessing, style];
    }
    return [styles.button, style];
  };

  const getIconName = () => {
    if (isProcessing) return 'reload-outline';
    if (isRecording) return 'stop-circle-outline';
    return 'mic-outline';
  };

  const getIconColor = () => {
    if (disabled || hasPermission === false) return '#ccc';
    if (isRecording) return '#ff4444';
    if (isProcessing) return '#ff8800';
    return color;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || hasPermission === false || isProcessing}
      activeOpacity={0.7}
    >
      {isProcessing ? (
        <ActivityIndicator size="small" color={getIconColor()} />
      ) : (
        <Ionicons name={getIconName()} size={size} color={getIconColor()} />
      )}
      
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    position: 'relative',
  },
  buttonRecording: {
    backgroundColor: '#ffebee',
    borderColor: '#ff4444',
  },
  buttonProcessing: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff8800',
  },
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
});

export default VoiceRecognitionButton;
