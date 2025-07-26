import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface VoiceInputButtonProps {
  onTextReceived: (text: string) => void;
  placeholder?: string;
  style?: any;
  disabled?: boolean;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTextReceived,
  placeholder = 'Click to record',
  style,
  disabled = false,
}) => {
  const {
    isRecording,
    isProcessing,
    hasPermission,
    recordingDuration,
    formattedDuration,
    error,
    toggleRecording,
    transcribeFromFile,
    reset,
  } = useVoiceRecognition({
    enableFeedback: true,
    maxDuration: 30000, // 30秒
    minDuration: 1000,  // 1秒
    onTranscriptionComplete: (text) => {
      onTextReceived(text);
      Alert.alert('Voice Recognition Success', `Recognition result: ${text}`);
    },
    onTranscriptionError: (error) => {
      Alert.alert('Voice Recognition Failed', error);
    },
  });

  const getButtonColor = () => {
    if (disabled) return '#e0e0e0';
    if (error) return '#666666';
    if (isRecording) return '#000000';
    if (isProcessing) return '#666666';
    return '#000000';
  };

  const getButtonText = () => {
    if (hasPermission === false) return '需要权限';
    if (isProcessing) return '识别中...';
    if (isRecording) return `录音中 ${formattedDuration}`;
    if (error) return '重试';
    return placeholder;
  };

  const handlePress = () => {
    if (disabled) return;
    
    if (hasPermission === false) {
      Alert.alert(
        'Microphone Permission Required',
        'Please allow this app to use microphone in settings',
        [{ text: 'OK' }]
      );
      return;
    }

    toggleRecording();
  };

  const handleFilePress = () => {
    if (disabled || isRecording || isProcessing) return;
    transcribeFromFile();
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: getButtonColor() },
          disabled && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons
            name={isRecording ? 'stop' : 'mic'}
            size={20}
            color="white"
          />
        )}
        <Text style={styles.buttonText}>
          {getButtonText()}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.fileButton,
          (disabled || isRecording || isProcessing) && styles.buttonDisabled,
        ]}
        onPress={handleFilePress}
        disabled={disabled || isRecording || isProcessing}
      >
        <Ionicons name="document-outline" size={16} color="#666666" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minHeight: 44,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fileButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dddddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default VoiceInputButton;
