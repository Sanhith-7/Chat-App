import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getSocket } from '../services/socket';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user, token, logout, onlineUserIds } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  const fetchConversations = useCallback(async () => {
    try {
      const response = await api.get('/users/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    
    (async () => {
      if (active) {
        await fetchConversations();
      }
    })();
    
    const s = getSocket();
    s.emit('presence:get');
    
    // Listen for new messages to refresh conversation list
    const onNewMessage = () => {
      if (active) {
        fetchConversations();
      }
    };
    
    s.on('message:new', onNewMessage);
    
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    
    return () => {
      active = false;
      s.off('message:new', onNewMessage);
    };
  }, [token, fetchConversations, fadeAnim, slideAnim]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getLastMessagePreview = (lastMessage, otherUserId) => {
    if (!lastMessage) return 'No messages yet';
    
    const isFromMe = lastMessage.senderId === user.id;
    const prefix = isFromMe ? 'You: ' : '';
    const content = lastMessage.content.length > 30 
      ? lastMessage.content.substring(0, 30) + '...' 
      : lastMessage.content;
    
    return prefix + content;
  };

  const renderItem = ({ item, index }) => {
    const online = onlineUserIds.includes(item.id);
    const lastMessage = item.lastMessage;
    
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity 
          style={styles.conversationItem} 
          onPress={() => navigation.navigate('Chat', { otherUser: item })}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, online && styles.avatarOnline]}>
              <Text style={styles.avatarText}>
                {item.username.charAt(0).toUpperCase()}
              </Text>
            </View>
            {online && <View style={styles.onlineIndicator} />}
          </View>
          
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.username}>{item.username}</Text>
              {lastMessage && (
                <Text style={styles.timestamp}>
                  {formatTime(lastMessage.timestamp)}
                </Text>
              )}
            </View>
            
            <Text style={styles.lastMessage} numberOfLines={1}>
              {getLastMessagePreview(lastMessage, item.id)}
            </Text>
            
            {lastMessage && lastMessage.senderId === user.id && (
              <View style={styles.statusContainer}>
                {lastMessage.status === 'read' && (
                  <Text style={styles.readStatus}>✓✓</Text>
                )}
                {lastMessage.status === 'delivered' && (
                  <Text style={styles.deliveredStatus}>✓✓</Text>
                )}
                {lastMessage.status === 'sent' && (
                  <Text style={styles.sentStatus}>✓</Text>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user?.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.username}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {conversations.length === 0 ? (
        <Animated.View 
          style={[
            styles.emptyState,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>💬</Text>
          </View>
          <Text style={styles.emptyStateText}>No conversations yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start chatting with other users to see your conversations here!
          </Text>
        </Animated.View>
      ) : (
        <FlatList 
          data={conversations} 
          keyExtractor={(item) => item.id} 
          renderItem={renderItem} 
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={fetchConversations}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    backgroundColor: '#667eea',
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  conversationItem: { 
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarOnline: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600'
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center'
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  username: { 
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937'
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500'
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    lineHeight: 18
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  readStatus: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: 'bold'
  },
  deliveredStatus: {
    fontSize: 12,
    color: '#9ca3af'
  },
  sentStatus: {
    fontSize: 12,
    color: '#9ca3af'
  },
  separator: { 
    height: 8,
    backgroundColor: 'transparent'
  },
  listContainer: {
    paddingVertical: 8,
    flexGrow: 1
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center'
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24
  }
});


