// expo-av 官方高质量录音参数（数字常量写法，兼容 Android/iOS/Web）
// 参考 expo-av 源码和文档：https://docs.expo.dev/versions/latest/sdk/av/#recordingoptions

import { Audio } from 'expo-av';

export const RECORDING_OPTIONS_PRESET_HIGH_QUALITY = {
  android: {
    extension: '.m4a',
    outputFormat: 2, // MPEG_4 = 2
    audioEncoder: 3, // AAC = 3
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.caf',
    audioQuality: 2, // Max = 2
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// 说明：
// Android outputFormat: 2 (MPEG_4), audioEncoder: 3 (AAC)
// iOS audioQuality: 2 (Max)
// 详见 expo-av 源码和类型定义
