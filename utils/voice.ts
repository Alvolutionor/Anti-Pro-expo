import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import api from './api';
import { RECORDING_OPTIONS_PRESET_HIGH_QUALITY } from './recordingOptions';

// 选择音频文件并上传到后端，后端用 whisper 识别
export async function pickAndTranscribeAudio(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
  if (result.type !== 'success' || !result.uri) return null;

  // 读取文件为 base64
  const base64 = await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });

  // 上传到后端（通过api.ts封装）
  const response = await api.post('/whisper/transcribe', {
    filename: result.name,
    data: base64,
  });
  return response.data.text || null;
}

let recording: Audio.Recording | null = null;

export async function startRecording() {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
    await recording.startAsync();
  } catch (err) {
    throw new Error('Failed to start recording: ' + err);
  }
}

export async function stopAndTranscribe(): Promise<string | null> {
  if (!recording) return null;
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (!uri) return null;

    // 上传到后端（通过api.ts封装）
    const formData = new FormData();
    formData.append('file', {
      uri,
      name: 'audio.wav',
      type: 'audio/wav',
    } as any);

    const response = await api.post('/whisper/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    recording = null;
    return response.data.text || null;
  } catch (err) {
    recording = null;
    throw new Error('Failed to stop or transcribe: ' + err);
  }
}
