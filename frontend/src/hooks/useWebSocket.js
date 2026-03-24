import { useState, useEffect, useCallback } from 'react';
import { fetchVariables } from '../services/api';

const WS_URL = 'ws://localhost:3001';

export function useWebSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [variables, setVariables] = useState({});

  useEffect(() => {
    fetchVariables().then(setVariables).catch(console.error);

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('[WS] Connected to backend');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'VARIABLES_UPDATE') {
          setVariables(data.data);
        } else {
          console.log('[WS] Received:', data);
        }
      } catch (err) {
        console.error('Error parsing WS message', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setConnected(false);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = useCallback((type, payload) => {
    if (socket && connected) {
      socket.send(JSON.stringify({ type, payload }));
    }
  }, [socket, connected]);

  return { connected, variables, sendMessage };
}
