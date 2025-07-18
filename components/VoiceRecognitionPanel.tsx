import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface VoiceRecognitionPanelProps {
  visible: boolean;
  onClose: () => void;
  onTextReceived: (text: string) => void;
  title?: string;
  placeholder?: string;
}

export const VoiceRecognitionPanel: React.FC<VoiceRecognitionPanelProps> = ({
  visible,
  onClose,
  onTextReceived,
  title = '语音识别',
  placeholder = '请说出您要添加的任务内容...',
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));

  const {
    isRecording,
    isProcessing,
    hasPermission,
    recordingDuration,
    formattedDuration,
    lastTranscription,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    transcribeFromFile,
    reset,
  } = useVoiceRecognition({
    enableFeedback: true,
    maxDuration: 60000, // 60秒
    minDuration: 1000,  // 1秒
    onTranscriptionComplete: (text) => {
      onTextReceived(text);
      handleClose();
    },
    onTranscriptionError: (error) => {
      console.error('语音识别错误:', error);
    },
  });

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const getRecordingWaveAnimation = () => {
    if (!isRecording) return null;
    
    return (
      <View style={styles.waveContainer}>
        {[...Array(5)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBer,
              {
                height: isRecording ? Math.random() * 40 + 10 : 5,
                animationDelay: `${index * 0.1}s`,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const getStatusText = () => {
    if (hasPermission === false) {
      return '需要麦克风权限';
    }
    if (isProcessing) {
      return '正在识别语音...';
    }
    if (isRecording) {
      return `录音中... ${formattedDuration}`;
    }
    if (error) {
      return error;
    }
    if (lastTranscription) {
      return '识别完成！';
    }
    return placeholder;
  };

  const getStatusColor = () => {
    if (error) return '#ff4444';
    if (isRecording) return '#4CAF50';
    if (isProcessing) return '#ff8800';
    if (lastTranscription) return '#2196F3';
    return '#666';
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1}
          onPress={handleClose}
        >
          <Animated.View 
            style={[
              styles.panel,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {/* 标题栏 */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* 状态显示区域 */}
              <View style={styles.statusContainer}>
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
                
                {lastTranscription && (
                  <ScrollView style={styles.transcriptionContainer}>
                    <Text style={styles.transcriptionText}>
                      {lastTranscription}
                    </Text>
                  </ScrollView>
                )}
              </View>

              {/* 录音可视化 */}
              <View style={styles.visualContainer}>
                {isRecording ? (
                  <View style={styles.recordingVisual}>
                    {getRecordingWaveAnimation()}
                  </View>
                ) : (
                  <View style={styles.microphoneContainer}>
                    <Ionicons 
                      name="mic-outline" 
                      size={48} 
                      color={isProcessing ? '#ff8800' : '#2196F3'} 
                    />
                  </View>
                )}
              </View>

              {/* 控制按钮 */}
              <View style={styles.controlsContainer}>
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    isRecording && styles.recordButtonActive,
                    (isProcessing || hasPermission === false) && styles.recordButtonDisabled,
                  ]}
                  onPress={toggleRecording}
                  disabled={isProcessing || hasPermission === false}
                >
                  <View
                    style={[
                      styles.recordButtonGradient,
                      isRecording && styles.recordButtonActiveGrad,
                    ]}
                  >
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={32}
                      color="white"
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fileButton}
                  onPress={transcribeFromFile}
                  disabled={isProcessing || isRecording}
                >
                  <Ionicons name="document-outline" size={24} color="#2196F3" />
                  <Text style={styles.fileButtonText}>从文件选择</Text>
                </TouchableOpacity>
              </View>

              {/* 提示文本 */}
              <View style={styles.hintContainer}>
                <Text style={styles.hintText}>
                  {isRecording 
                    ? '再次点击停止录音' 
                    : '点击麦克风开始录音，或选择音频文件'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panel: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  statusContainer: {
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  transcriptionContainer: {
    maxHeight: 100,
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  visualContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  waveBer: {
    width: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    marginHorizontal: 1,
  },
  microphoneContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  recordButtonActive: {
    // Animation styles can be added here
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
  recordButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  recordButtonActiveGrad: {
    backgroundColor: '#ff4444',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  fileButtonText: {
    marginLeft: 8,
    color: '#2196F3',
    fontWeight: '500',
  },
  hintContainer: {
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default VoiceRecognitionPanel;
