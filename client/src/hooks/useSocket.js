import { useEffect, useState, useRef } from 'react';
import { getSocket } from '../socket';

export function useSocket() {
  const [socket] = useState(() => getSocket());
  return socket;
}

export function useSocketEvent(eventName, handler) {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  const [isReady, setIsReady] = useState(socket.connected);

  // Update ref when handler changes (without re-registering listener)
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  // Track socket connection state
  useEffect(() => {
    const onConnect = () => {
      console.log(`[useSocketEvent] Socket connected`);
      setIsReady(true);
    };
    const onDisconnect = () => {
      console.log(`[useSocketEvent] Socket disconnected`);
      setIsReady(false);
    };

    // Set initial state
    if (socket.connected) {
      console.log(`[useSocketEvent] Socket already connected on mount`);
      setIsReady(true);
    }

    // Always listen for future connect/disconnect events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // Register listener only when socket is connected
  useEffect(() => {
    if (!isReady) {
      console.log(`[useSocketEvent] Waiting for socket to connect before registering: ${eventName}`);
      return;
    }

    const listener = (...args) => {
      console.log(`[useSocketEvent] Listener called for: ${eventName}`, args);
      handlerRef.current(...args);
    };

    console.log(`[useSocketEvent] Registering listener for: ${eventName} (socket: ${socket.id})`);
    socket.on(eventName, listener);

    return () => {
      console.log(`[useSocketEvent] Unregistering listener for: ${eventName}`);
      socket.off(eventName, listener);
    };
  }, [socket, eventName, isReady]);
}
