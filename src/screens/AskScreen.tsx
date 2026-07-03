import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listFragments, recall } from '@/services/cognee';

type MessageRole = 'user' | 'assistant' | 'error';

type Message = {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
};

const SUGGESTIONS = [
  { icon: 'people-outline' as const, text: 'Who was I with yesterday?' },
  { icon: 'location-outline' as const, text: 'Where did I meet Doug?' },
  { icon: 'time-outline' as const, text: 'What happened after 9 PM?' },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AskScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [memoryCount, setMemoryCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    listFragments().then(f => setMemoryCount(f.length)).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, loading]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  async function send(query: string) {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const answer = await recall(trimmed);
      const assistantMsg: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: answer || '(No answer returned)',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const errorMsg: Message = {
        id: `${Date.now()}-error`,
        role: 'error',
        text: e instanceof Error ? e.message : 'Something went wrong.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(text: string) {
    send(text);
  }

  const canSend = inputText.trim().length > 0 && !loading;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, keyboardHeight > 0 && { paddingBottom: keyboardHeight - 52 }]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={16} color="#fff" />
            <Text style={styles.pillText}>{memoryCount} Memories</Text>
          </View>
          <Text style={styles.heading}>ASK WOLFPACK</Text>
          <Text style={styles.subtext}>
            Ask anything. Wolfpack connects the dots for you.
          </Text>
        </View>

        {/* Chat area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Suggestion chips — only when no messages */}
          {messages.length === 0 && !loading && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>Try asking</Text>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s.text}
                  style={styles.chip}
                  onPress={() => handleSuggestion(s.text)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={s.icon} size={18} color="#888" />
                  <Text style={styles.chipText}>{s.text}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#555" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Messages */}
          {messages.map(msg => {
            if (msg.role === 'user') {
              return (
                <View key={msg.id} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userText}>{msg.text}</Text>
                    <Text style={styles.userTimestamp}>{formatTime(msg.timestamp)}</Text>
                  </View>
                </View>
              );
            }

            if (msg.role === 'error') {
              return (
                <View key={msg.id} style={styles.assistantRow}>
                  <View style={styles.errorBubble}>
                    <Text style={styles.errorText}>{msg.text}</Text>
                    <Text style={styles.assistantTimestamp}>{formatTime(msg.timestamp)}</Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={msg.id} style={styles.assistantRow}>
                <View style={styles.assistantBubble}>
                  <Text style={styles.assistantText}>{msg.text}</Text>
                  <Text style={styles.assistantTimestamp}>{formatTime(msg.timestamp)}</Text>
                  {/* TODO: Sources Used card — needs recall() to return source metadata */}
                </View>
              </View>
            );
          })}

          {/* Loading bubble */}
          {loading && (
            <View style={styles.assistantRow}>
              <View style={styles.assistantBubble}>
                <ActivityIndicator size="small" color="#888" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything..."
            placeholderTextColor="#555"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => send(inputText)}
            returnKeyType="send"
            editable={!loading}
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            onPress={() => send(inputText)}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="paper-plane" size={18} color={canSend ? '#fff' : '#444'} />
            )}
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  header: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  heading: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 8,
    gap: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  suggestions: {
    gap: 10,
    paddingBottom: 8,
  },
  suggestionsLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  chipText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    backgroundColor: '#2C2C2E',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    gap: 4,
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  userTimestamp: {
    color: '#888',
    fontSize: 11,
    textAlign: 'right',
  },
  assistantRow: {
    alignItems: 'flex-start',
  },
  assistantBubble: {
    backgroundColor: '#1C1C1E',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    gap: 4,
  },
  assistantText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  assistantTimestamp: {
    color: '#555',
    fontSize: 11,
  },
  errorBubble: {
    backgroundColor: '#2A1010',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    gap: 4,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1C1C1E',
  },
});
