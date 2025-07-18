import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import VoiceInputButton from '../components/VoiceInputButton';
import { VoiceRecognitionPanel } from '../components/VoiceRecognitionPanel';

export default function VoiceDemo() {
  const [transcribedText, setTranscribedText] = useState('');
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);

  const handleVoiceText = (text: string) => {
    setTranscribedText(text);
    Alert.alert('语音识别成功', `识别到: ${text}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>语音识别功能演示</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 简单语音输入按钮</Text>
          <Text style={styles.description}>
            点击按钮开始录音，支持语音转文字和文件上传识别
          </Text>
          
          <VoiceInputButton
            onTextReceived={handleVoiceText}
            placeholder="点击开始录音"
            style={styles.voiceButton}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 高级语音识别面板</Text>
          <Text style={styles.description}>
            更完整的语音识别界面，包含实时可视化和详细控制
          </Text>
          
          <TouchableOpacity
            style={styles.panelButton}
            onPress={() => setShowAdvancedPanel(true)}
          >
            <Ionicons name="mic" size={24} color="white" />
            <Text style={styles.panelButtonText}>打开高级语音面板</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 识别结果</Text>
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>最后识别的文本:</Text>
            <Text style={styles.resultText}>
              {transcribedText || '暂无识别结果'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. 功能特点</Text>
          <View style={styles.featureList}>
            {[
              '🎤 实时语音录制 (最长30秒)',
              '🔊 录音状态音效反馈',
              '📄 支持音频文件上传识别',
              '⚡ 集成 Whisper AI 转录',
              '🔒 自动权限检查和请求',
              '💬 语音合成结果播报',
              '❌ 完善的错误处理机制',
              '📱 适配不同屏幕尺寸'
            ].map((feature, index) => (
              <Text key={index} style={styles.featureItem}>
                {feature}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 使用说明</Text>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>点击录音按钮</Text>: 开始/停止语音录制
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>文件选择按钮</Text>: 上传音频文件进行识别
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>最短录音时长</Text>: 1秒钟
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>最长录音时长</Text>: 30秒钟
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>支持格式</Text>: m4a, wav, mp3 等音频格式
            </Text>
          </View>
        </View>
      </ScrollView>

      <VoiceRecognitionPanel
        visible={showAdvancedPanel}
        onClose={() => setShowAdvancedPanel(false)}
        onTextReceived={handleVoiceText}
        title="高级语音识别"
        placeholder="请清楚地说出您想要识别的内容..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    lineHeight: 22,
  },
  voiceButton: {
    alignSelf: 'stretch',
  },
  panelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  panelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  instructionList: {
    gap: 12,
  },
  instructionItem: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
});
