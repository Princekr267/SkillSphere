import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { BACKEND_URL } from "../utils/api";

const SOCKET_URL = BACKEND_URL;

interface SocketContextType {
  socket: Socket | null;
  connectionError: string | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setConnectionError(null);
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      setConnectionError(null);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err);
      setConnectionError("Unable to connect to live services. Please refresh the page.");
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnectionError(null);
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): { socket: Socket | null; connectionError: string | null } => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return { socket: context.socket, connectionError: context.connectionError };
};
