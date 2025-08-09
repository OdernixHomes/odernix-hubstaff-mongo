import { useEffect, useRef, useState } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const useWebSocket = (user) => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('hubstaff_token');
    if (!token) return;

    // Connect to WebSocket - use ws:// protocol
    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/${token}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    socketRef.current.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connection_established':
            setOnlineUsers(data.online_users || []);
            break;
          case 'user_status_update':
            setOnlineUsers(prev => {
              if (data.status === 'online') {
                return [...prev.filter(id => id !== data.user_id), data.user_id];
              } else {
                return prev.filter(id => id !== data.user_id);
              }
            });
            break;
          case 'time_entry_update':
            setNotifications(prev => [...prev, {
              id: Date.now(),
              type: 'time_entry',
              message: `${data.user_id} updated time tracking`,
              timestamp: new Date(),
              data: data.time_entry
            }]);
            break;
          case 'project_update':
            setNotifications(prev => [...prev, {
              id: Date.now(),
              type: 'project',
              message: `Project "${data.project.name}" was updated`,
              timestamp: new Date(),
              data: data.project
            }]);
            break;
          case 'team_activity':
            console.log('Team activity update:', data);
            break;
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [user]);

  const sendMessage = (type, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify({ type, data }));
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return {
    isConnected,
    onlineUsers,
    notifications,
    sendMessage,
    markNotificationAsRead
  };
};