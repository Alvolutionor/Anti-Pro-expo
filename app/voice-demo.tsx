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
    Alert.alert('Voice Recognition Success', `Recognized: ${text}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Voice Recognition Feature Demo</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Simple Voice Input Button</Text>
          <Text style={styles.description}>
            Click button to start recording, supports voice-to-text and file upload recognition
          </Text>
          
          <VoiceInputButton
            onTextReceived={handleVoiceText}
            placeholder="Click to start recording"
            style={styles.voiceButton}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Advanced Voice Recognition Panel</Text>
          <Text style={styles.description}>
            More comprehensive voice recognition interface with real-time visualization and detailed controls
          </Text>
          
          <TouchableOpacity
            style={styles.panelButton}
            onPress={() => setShowAdvancedPanel(true)}
          >
            <Ionicons name="mic" size={24} color="white" />
            <Text style={styles.panelButtonText}>Open Advanced Voice Panel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Recognition Results</Text>
          <View style={styles.resultContainer}>
            <Text style={styles.resultLabel}>Last recognized text:</Text>
            <Text style={styles.resultText}>
              {transcribedText || 'No recognition results yet'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Features</Text>
          <View style={styles.featureList}>
            {[
              '🎤 Real-time voice recording (max 30 seconds)',
              '🔊 Recording status audio feedback',
              '📄 Support audio file upload recognition',
              '⚡ Integrated Whisper AI transcription',
              '🔒 Automatic permission check and request',
              '💬 Voice synthesis result playback',
              '❌ Comprehensive error handling mechanism',
              '📱 Adapted to different screen sizes'
            ].map((feature, index) => (
              <Text key={index} style={styles.featureItem}>
                {feature}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Instructions</Text>
          <View style={styles.instructionList}>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>Click Record Button</Text>: Start/stop voice recording
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>File Select Button</Text>: Upload audio file for recognition
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>Minimum Recording Duration</Text>: 1 second
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>Maximum Recording Duration</Text>: 30 seconds
            </Text>
            <Text style={styles.instructionItem}>
              • <Text style={styles.bold}>Supported Formats</Text>: m4a, wav, mp3 and other audio formats
            </Text>
          </View>
        </View>
      </ScrollView>

      <VoiceRecognitionPanel
        visible={showAdvancedPanel}
        onClose={() => setShowAdvancedPanel(false)}
        onTextReceived={handleVoiceText}
        title="Advanced Voice Recognition"
        placeholder="Please speak clearly what you want to recognize..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 20,
  },
  voiceButton: {
    alignSelf: 'stretch',
  },
  panelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 4,
    padding: 12,
    gap: 8,
  },
  panelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  resultContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#000000',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  featureList: {
    gap: 6,
  },
  featureItem: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  instructionList: {
    gap: 8,
  },
  instructionItem: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#000000',
  },
});
