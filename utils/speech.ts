import * as Speech from 'expo-speech';

// 朗读文本
export function speak(text: string, options?: Speech.SpeechOptions) {
  if (!text) return;
  Speech.speak(text, options);
}

// 停止朗读
export function stop() {
  Speech.stop();
}

// 判断是否正在朗读（expo-speech 没有直接API，需自行管理状态）
// 可扩展：用 useState/useRef 在组件层追踪
