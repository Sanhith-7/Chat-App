import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

const { width } = Dimensions.get('window');

export default function ChatScreen({ route, navigation }) {
  const { otherUser } = route.params;
  const { user, onlineUserIds } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [theirTyping, setTheirTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeout = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Set navigation title
    navigation.setOptions({
      title: otherUser.username,
      headerStyle: {
        backgroundColor: '#667eea',
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
    });

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/conversations/${otherUser.id}/messages`);
        if (active) {
          setMessages(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        Alert.alert('Error', 'Failed to load messages');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    const s = getSocket();
    const onNew = ({ message }) => {
      const belongs =
        (message.senderId === user.id && message.receiverId === otherUser.id) ||
        (message.senderId === otherUser.id && message.receiverId === user.id);
      if (belongs) {
        setMessages((prev) => [...prev, message]);
        // Mark as read if message is from other user
        if (message.senderId === otherUser.id) {
          s.emit('message:read', { fromUserId: otherUser.id });
        }
      }
    };
    const onTypingStart = ({ fromUserId }) => {
      if (fromUserId === otherUser.id) setTheirTyping(true);
    };
    const onTypingStop = ({ fromUserId }) => {
      if (fromUserId === otherUser.id) setTheirTyping(false);
    };
    const onRead = ({ byUserId }) => {
      if (byUserId === otherUser.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === user.id && m.receiverId === otherUser.id
              ? { ...m, status: 'read' }
              : m
          )
        );
      }
    };

    s.on('message:new', onNew);
    s.on('typing:start', onTypingStart);
    s.on('typing:stop', onTypingStop);
    s.on('message:read', onRead);
    s.emit('presence:get');

    // Mark existing messages as read
    s.emit('message:read', { fromUserId: otherUser.id });

    return () => {
      s.off('message:new', onNew);
      s.off('typing:start', onTypingStart);
      s.off('typing:stop', onTypingStop);
      s.off('message:read', onRead);
      active = false;
    };
  }, [otherUser.id, user.id, navigation, otherUser.username, fadeAnim, slideAnim]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    try {
      setSending(true);
      const s = getSocket();
      s.emit('message:send', { receiverId: otherUser.id, content: input.trim() }, (ack) => {
        if (!ack.ok) {
          Alert.alert('Error', 'Failed to send message');
        }
      });
      setInput('');
      stopTyping();
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
      sendMessage();
    }
  };

  const startTyping = () => {
    if (!typing) {
      setTyping(true);
      getSocket().emit('typing:start', { receiverId: otherUser.id });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, 1200);
  };

  const stopTyping = () => {
    if (typing) {
      setTyping(false);
      getSocket().emit('typing:stop', { receiverId: otherUser.id });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessage = ({ item, index }) => {
    const mine = item.senderId === user.id;
    const showDate = index === 0 ||
      formatDate(messages[index - 1]?.createdAt) !== formatDate(item.createdAt);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, mine ? styles.myMessage : styles.theirMessage]}>
          <View style={[styles.messageBubble, mine ? styles.myBubble : styles.theirBubble]}>
            <Text style={[styles.messageText, mine ? styles.myMessageText : styles.theirMessageText]}>
              {item.content}
            </Text>
            <View style={styles.messageMeta}>
              <Text style={[styles.messageTime, mine ? styles.myMessageTime : styles.theirMessageTime]}>
                {formatTime(item.createdAt)}
              </Text>
              {mine && (
                <Text style={[
                  styles.statusIcon,
                  item.status === 'read' ? styles.readStatus : 
                  item.status === 'delivered' ? styles.deliveredStatus : 
                  styles.sentStatus
                ]}>
                  {item.status === 'read' || item.status === 'delivered' ? '✓✓' : '✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderTypingIndicator = () => {
    if (!theirTyping) return null;
    return (
      <Animated.View style={[styles.typingContainer, { opacity: fadeAnim }]}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.userInfo}>
            <View style={[styles.statusDot, onlineUserIds.includes(otherUser.id) ? styles.onlineDot : styles.offlineDot]} />
            <Text style={styles.headerName}>{otherUser.username}</Text>
          </View>
          <Text style={[
            styles.headerStatus,
            onlineUserIds.includes(otherUser.id) ? styles.onlineStatus : styles.offlineStatus
          ]}>
            {onlineUserIds.includes(otherUser.id) ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {renderTypingIndicator()}

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (text.trim()) startTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            style={styles.textInput}
            multiline
            maxLength={1000}
            onBlur={stopTyping}
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDot: {
    backgroundColor: '#10b981',
  },
  offlineDot: {
    backgroundColor: '#6b7280',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937'
  },
  headerStatus: {
    fontSize: 14,
    fontWeight: '500'
  },
  onlineStatus: {
    color: '#10b981'
  },
  offlineStatus: {
    color: '#6b7280'
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 16
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontWeight: '500'
  },
  messageContainer: {
    marginBottom: 12
  },
  myMessage: {
    alignItems: 'flex-end'
  },
  theirMessage: {
    alignItems: 'flex-start'
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  myBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 6
  },
  theirBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22
  },
  myMessageText: {
    color: '#fff'
  },
  theirMessageText: {
    color: '#1f2937'
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 4
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500'
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  theirMessageTime: {
    color: '#9ca3af'
  },
  statusIcon: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  readStatus: {
    color: '#10b981'
  },
  deliveredStatus: {
    color: 'rgba(255, 255, 255, 0.85)'
  },
  sentStatus: {
    color: 'rgba(255, 255, 255, 0.7)'
  },
  typingContainer: {
    paddingHorizontal: 16,
    marginBottom: 8
  },
  typingBubble: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    alignSelf: 'flex-start',
    maxWidth: width * 0.4,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    color: '#1f2937',
    textAlignVertical: 'top'
  },
  sendButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});


