'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "../providers/SocketProvider.jsx";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const USERNAME_STORAGE_KEY = "rt_username";
const ANON_PUBLIC_CHAT_ROOM = "anon-chat-public";

const ADJECTIVES = ["Swift", "Bright", "Cool", "Lucky", "Calm", "Brave", "Quick", "Kind", "Sharp", "Bold", "Happy", "Silent"];
const ANIMALS = ["Tiger", "Falcon", "Panda", "Otter", "Wolf", "Eagle", "Fox", "Dolphin", "Koala", "Lion", "Hawk", "Bear"];

function randomInt(maxExclusive) {
  if (maxExclusive <= 0) return 0;
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function generateRandomUsername() {
  const adj = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const animal = ANIMALS[randomInt(ANIMALS.length)];
  const num = (1000 + randomInt(9000)).toString();
  return `Guest-${adj}-${animal}-${num}`;
}

export default function StreamInterface() {
  const socket = useSocket();
  const router = useRouter();
  
  // Basic state
  const [mainTab, setMainTab] = useState("chat");
  const [chatTab, setChatTab] = useState("active");
  const [videoTab, setVideoTab] = useState("users");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("23");
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);
  
  // Users state
  const [users, setUsers] = useState([]);
  
  // Chat state
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [anonChatSearching, setAnonChatSearching] = useState(false);
  const [anonChatCount, setAnonChatCount] = useState(0);
  
  // Video state
  const [anonVideoSearching, setAnonVideoSearching] = useState(false);
  const lastRegisteredNameRef = useRef("");
  
  // Normalized values
  const normalizedName = useMemo(() => (username ?? "").trim(), [username]);
  const normalizedRoom = useMemo(() => (room ?? "").trim(), [room]);
  
  useEffect(() => {
    const stored = localStorage.getItem(USERNAME_STORAGE_KEY) ?? "";
    if (stored) {
      setUsername((prev) => (prev ? prev : stored));
      return;
    }
    const generated = generateRandomUsername();
    localStorage.setItem(USERNAME_STORAGE_KEY, generated);
    setUsername(generated);
  }, []);
  
  // Other users list (excluding current user)
  const otherUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    if (!normalizedName) return users;
    return users.filter((u) => u !== normalizedName);
  }, [users, normalizedName]);
  
  // Socket connection handlers
  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(Boolean(socket?.connected));
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);
  
  useEffect(() => {
    const onConnect = () => setMyId(socket.id ?? null);
    const onDisconnect = () => setMyId(null);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setMyId(socket.id ?? null);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);
  
  // User registration
  const registerUser = useCallback(() => {
    if (!normalizedName) return;
    localStorage.setItem(USERNAME_STORAGE_KEY, normalizedName);
    socket.emit("user:register", { username: normalizedName });
    socket.emit("users:list");
  }, [normalizedName, socket]);

  const onUsernameSubmit = useCallback(
    (e) => {
      e.preventDefault();
      registerUser();
    },
    [registerUser]
  );

  useEffect(() => {
    if (!connected) return;
    if (!normalizedName) return;
    if (lastRegisteredNameRef.current === normalizedName) return;
    lastRegisteredNameRef.current = normalizedName;
    registerUser();
  }, [connected, normalizedName, registerUser]);
  
  // Request users list when connected and have username
  useEffect(() => {
    if (connected && normalizedName) {
      socket.emit("users:list");
    }
  }, [connected, normalizedName, socket]);
  
  // Users list update
  useEffect(() => {
    const onUsersUpdate = (payload) => {
      const details = Array.isArray(payload?.details) ? payload.details : [];
      if (Array.isArray(payload?.users)) {
        setUsers(payload.users);
      } else if (details.length) {
        setUsers(details.map((d) => d.username).filter(Boolean));
      } else {
        setUsers([]);
      }
    };
    socket.on("users:update", onUsersUpdate);
    return () => {
      socket.off("users:update", onUsersUpdate);
    };
  }, [socket]);
  
  // Rooms list
  const [roomsList, setRoomsList] = useState([]);
  useEffect(() => {
    const onRoomsUpdate = (payload) => {
      const list = Array.isArray(payload?.rooms) ? payload.rooms : [];
      setRoomsList(list);
    };
    socket.on("rooms:update", onRoomsUpdate);
    socket.emit("rooms:list");
    return () => {
      socket.off("rooms:update", onRoomsUpdate);
    };
  }, [socket]);
  
  // Chat messages
  useEffect(() => {
    const onChatMessage = (payload) => {
      if (!payload?.room) return;
      if (payload.room !== activeChatRoom) return;
      setChatMessages((prev) => [...prev, payload]);
    };
    socket.on("chat:message", onChatMessage);
    return () => {
      socket.off("chat:message", onChatMessage);
    };
  }, [activeChatRoom, socket]);
  
  // Anonymous chat and video matching
  useEffect(() => {
    const onAnonChatMatched = ({ room }) => {
      setAnonChatSearching(false);
      if (!room) return;
      setMainTab("chat");
      setChatTab("anon");
      setActiveChatRoom(room);
      setActiveChatPeer("Anonymous");
      setChatMessages([]);
      setChatDraft("");
      socket.emit("chat:join", { room });
      toast.success("Anonymous chat matched");
    };
    const onAnonChatSearching = () => {
      setAnonChatSearching(true);
      toast("Searching partner...");
    };
    const onAnonVideoMatched = ({ room }) => {
      setAnonVideoSearching(false);
      if (!room) return;
      setMainTab("video");
      setVideoTab("anon");
      toast.success("Anonymous video matched");
      router.push(`/room/${room}`);
    };
    const onAnonVideoSearching = () => {
      setAnonVideoSearching(true);
      toast("Searching partner...");
    };
    const onAnonChatCount = ({ room, count }) => {
      if (room !== ANON_PUBLIC_CHAT_ROOM) return;
      setAnonChatCount(typeof count === "number" ? count : 0);
    };
    const onChatInvite = ({ from, room }) => {
      const roomId = (room ?? "").trim();
      if (!roomId) return;
      toast((t) => (
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            Chat invite from <strong>{from ?? "Someone"}</strong>
          </div>
          <div className="buttonRow" style={{ marginTop: 0 }}>
            <button
              className="buttonPrimary"
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                setMainTab("chat");
                setChatTab("active");
                setActiveChatRoom(roomId);
                setActiveChatPeer(from ?? "Chat");
                setChatMessages([]);
                socket.emit("chat:join", { room: roomId });
              }}
            >
              Join
            </button>
            <button className="buttonSecondary" type="button" onClick={() => toast.dismiss(t.id)}>
              Ignore
            </button>
          </div>
        </div>
      ));
    };
    const onVideoInvite = ({ from, room }) => {
      const roomId = (room ?? "").trim();
      if (!roomId) return;
      toast((t) => (
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontSize: 14, marginBottom: 10 }}>
            Video invite from <strong>{from ?? "Someone"}</strong>
          </div>
          <div className="buttonRow" style={{ marginTop: 0 }}>
            <button
              className="buttonPrimary"
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                router.push(`/room/${roomId}`);
              }}
            >
              Join
            </button>
            <button className="buttonSecondary" type="button" onClick={() => toast.dismiss(t.id)}>
              Ignore
            </button>
          </div>
        </div>
      ));
    };
    socket.on("anon:chat:matched", onAnonChatMatched);
    socket.on("anon:chat:searching", onAnonChatSearching);
    socket.on("anon:video:matched", onAnonVideoMatched);
    socket.on("anon:video:searching", onAnonVideoSearching);
    socket.on("anon:chat:count", onAnonChatCount);
    socket.on("chat:invite", onChatInvite);
    socket.on("video:invite", onVideoInvite);
    return () => {
      socket.off("anon:chat:matched", onAnonChatMatched);
      socket.off("anon:chat:searching", onAnonChatSearching);
      socket.off("anon:video:matched", onAnonVideoMatched);
      socket.off("anon:video:searching", onAnonVideoSearching);
      socket.off("anon:chat:count", onAnonChatCount);
      socket.off("chat:invite", onChatInvite);
      socket.off("video:invite", onVideoInvite);
    };
  }, [router, socket]);
  
  // Join video room
  const joinVideoRoom = useCallback(
    (e) => {
      e.preventDefault();
      if (!normalizedName) {
        toast.error("Enter username first");
        return;
      }
      if (!normalizedRoom) {
        toast.error("Enter room id");
        return;
      }
      router.push(`/room/${normalizedRoom}`);
    },
    [router, normalizedName, normalizedRoom]
  );
  
  // Open direct chat
  const openDirectChat = useCallback(
    (peerName) => {
      if (!normalizedName) {
        toast.error("Enter username first");
        return;
      }
      const other = (peerName ?? "").trim();
      if (!other) return;
      const roomId = `dm:${[normalizedName, other].sort().join("|")}`;
      setActiveChatRoom(roomId);
      setActiveChatPeer(other);
      setChatMessages([]);
      setChatTab("active");
      socket.emit("chat:invite", { toEmail: other, room: roomId });
      socket.emit("chat:join", { room: roomId });
    },
    [normalizedName, socket]
  );
  
  // Send chat message
  const sendChatMessage = useCallback(
    (e) => {
      e.preventDefault();
      if (!activeChatRoom) return;
      const text = (chatDraft ?? "").trim();
      if (!text) return;
      socket.emit("chat:message", { room: activeChatRoom, message: text });
      setChatDraft("");
    },
    [activeChatRoom, chatDraft, socket]
  );
  
  // Start anonymous chat
  const startAnonChat = useCallback(() => {
    if (!normalizedName) {
      toast.error("Enter username first");
      return;
    }
    setActiveChatRoom(null);
    setActiveChatPeer(null);
    setChatMessages([]);
    setChatDraft("");
    setChatTab("anon");
    setActiveChatRoom(ANON_PUBLIC_CHAT_ROOM);
    setActiveChatPeer("Anonymous");
    socket.emit("chat:join", { room: ANON_PUBLIC_CHAT_ROOM });
  }, [normalizedName, socket]);
  
  // Leave anonymous chat
  const leaveAnonChat = useCallback(() => {
    setAnonChatSearching(false);
    setActiveChatRoom(null);
    setActiveChatPeer(null);
    setChatMessages([]);
    setChatDraft("");
    setAnonChatCount(0);
    socket.emit("anon:chat:leave");
  }, [socket]);
  
  // Start anonymous video
  const startAnonVideo = useCallback(() => {
    if (!normalizedName) {
      toast.error("Enter username first");
      return;
    }
    setVideoTab("anon");
    socket.emit("anon:video:find");
  }, [normalizedName, socket]);
  
  // Leave anonymous video
  const leaveAnonVideo = useCallback(() => {
    setAnonVideoSearching(false);
    socket.emit("anon:video:leave");
  }, [socket]);
  
  // Invite to video call
  const inviteToVideo = useCallback(
    (toName) => {
      if (!normalizedName) {
        toast.error("Enter username first");
        return;
      }
      const to = (toName ?? "").trim();
      if (!to) return;
      const roomId = `call-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      socket.emit("video:invite", { toEmail: to, room: roomId });
      toast.success("Invite sent");
      router.push(`/room/${roomId}`);
    },
    [router, normalizedName, socket]
  );
  
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Username setup */}
      {!normalizedName ? (
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-8 backdrop-blur-lg">
          <div className="text-center">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
              <p className="text-slate-400">Enter a username to access chat and video features.</p>
            </header>
            <form className="space-y-6 max-w-md mx-auto" onSubmit={onUsernameSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300" htmlFor="username">Username</label>
                <input 
                  id="username" 
                  className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Enter your username" 
                />
              </div>
              <div className="flex justify-center">
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                  type="submit" 
                  disabled={!username.trim()}
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main tabs: Chat / Video */}
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700/30 mb-6">
            <button 
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${mainTab === "chat" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`} 
              type="button" 
              onClick={() => setMainTab("chat")}
            >
              Chat
            </button>
            <button 
              className={`px-6 py-3 rounded-lg text-sm font-medium transition-all ${mainTab === "video" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-slate-400 hover:text-white"}`} 
              type="button" 
              onClick={() => setMainTab("video")}
            >
              Video
            </button>
          </div>
          
          {/* Chat Section */}
          {mainTab === "chat" && (
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-6 backdrop-blur-lg">
              {/* Chat tabs: Active Users / Anonymous */}
              <div className="pb-4">
                <div className="flex gap-2 p-1 bg-slate-700/30 rounded-lg mb-4">
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${chatTab === "active" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-slate-400 hover:text-white"}`} 
                    type="button" 
                    onClick={() => {
                      setAnonChatSearching(false);
                      setChatTab("active");
                      if (activeChatRoom === ANON_PUBLIC_CHAT_ROOM) {
                        setActiveChatRoom(null);
                        setActiveChatPeer(null);
                        setChatMessages([]);
                        setChatDraft("");
                        socket.emit("anon:chat:leave");
                      }
                    }}
                  >
                    Active Users
                  </button>
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${chatTab === "anon" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-slate-400 hover:text-white"}`} 
                    type="button" 
                    onClick={() => {
                      setAnonChatSearching(false);
                      setChatTab("anon");
                      setActiveChatRoom(null);
                      setActiveChatPeer(null);
                      setChatMessages([]);
                      setChatDraft("");
                    }}
                  >
                    Anonymous
                  </button>
                </div>
              </div>
              
              {/* Chat content */}
              {chatTab === "active" ? (
                <div className="flex gap-6 min-h-[400px]">
                  {/* User list */}
                  <div className="w-1/3 bg-slate-700/30 rounded-xl p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Active Users</h3>
                      <button 
                        className="px-3 py-1 bg-slate-600/50 text-slate-300 text-sm rounded-lg hover:bg-slate-600/70 transition-all" 
                        type="button" 
                        onClick={() => socket.emit("users:list")}
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="space-y-2">
                      {otherUsers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm">No other users online</p>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {otherUsers.map((user) => (
                            <li key={user} className={`bg-slate-600/20 rounded-lg p-3 hover:bg-slate-600/40 transition-all ${activeChatPeer === user ? "ring-2 ring-indigo-500" : ""}`}>
                              <button
                                className="w-full flex items-center justify-between text-left"
                                type="button"
                                onClick={() => openDirectChat(user)}
                              >
                                <span className="text-sm text-white font-medium truncate">{user}</span>
                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">Chat</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {/* Chat messages */}
                  <div className="flex-1 bg-slate-800/30 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        {activeChatPeer ? `Chat with ${activeChatPeer}` : "Select a user to chat"}
                      </h3>
                      {activeChatPeer && (
                        <button
                          className="px-3 py-1 bg-slate-600/50 text-slate-300 text-sm rounded-lg hover:bg-slate-600/70 transition-all"
                          type="button"
                          onClick={() => {
                            setActiveChatRoom(null);
                            setActiveChatPeer(null);
                            setChatMessages([]);
                            setChatDraft("");
                          }}
                        >
                          Close
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto mb-4">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <p className="text-sm">
                            {activeChatPeer
                              ? "Send a message to start chatting"
                              : "Select a user from the list to start chatting"}
                          </p>
                        </div>
                      ) : (
                        <ul className="space-y-3">
                          {chatMessages.map((message, index) => (
                            <li
                              key={index}
                              className={`flex ${message.fromId && message.fromId === myId ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                message.fromId && message.fromId === myId 
                                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" 
                                  : "bg-slate-700/60 text-slate-200"
                              }`}>
                                <p className="text-sm mb-1">{message.message}</p>
                                <span className="text-xs opacity-70">
                                  {new Date(message.at).toLocaleTimeString()}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {activeChatPeer && (
                      <div className="mt-auto">
                        <form className="flex gap-2" onSubmit={sendChatMessage}>
                          <input
                            className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            type="text"
                            placeholder="Type a message..."
                            value={chatDraft}
                            onChange={(e) => setChatDraft(e.target.value)}
                          />
                          <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all" type="submit">
                            Send
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {anonChatSearching ? (
                    <div className="text-center py-12">
                      <div className="inline-flex h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-300 mb-4">Searching for anonymous chat partner...</p>
                      <button
                        className="px-4 py-2 bg-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-600/70 transition-all"
                        type="button"
                        onClick={() => {
                          setAnonChatSearching(false);
                          socket.emit("anon:chat:cancel");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : activeChatRoom === ANON_PUBLIC_CHAT_ROOM ? (
                    <div className="bg-slate-800/30 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">Anonymous Chat</h3>
                        <button
                          className="px-3 py-1 bg-slate-600/50 text-slate-300 text-sm rounded-lg hover:bg-slate-600/70 transition-all"
                          type="button"
                          onClick={() => {
                            setActiveChatRoom(null);
                            setActiveChatPeer(null);
                            setChatMessages([]);
                            setChatDraft("");
                            socket.emit("anon:chat:leave");
                          }}
                        >
                          Leave
                        </button>
                      </div>
                      <div className="mb-6 h-64 overflow-y-auto">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-12 text-slate-400">
                            <p className="text-sm">Connected to anonymous chat</p>
                          </div>
                        ) : (
                          <ul className="space-y-3">
                            {chatMessages.map((message, index) => (
                              <li
                                key={index}
                                className={`flex ${message.fromId && message.fromId === myId ? "justify-end" : "justify-start"}`}
                              >
                                <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                                  message.fromId && message.fromId === myId 
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" 
                                    : "bg-slate-700/60 text-slate-200"
                                }`}>
                                  <p className="text-sm mb-1">{message.message}</p>
                                  <span className="text-xs opacity-70">
                                    {new Date(message.at).toLocaleTimeString()}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <form className="flex gap-2" onSubmit={sendChatMessage}>
                        <input
                          className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          type="text"
                          placeholder="Type a message..."
                          value={chatDraft}
                          onChange={(e) => setChatDraft(e.target.value)}
                        />
                        <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all" type="submit">
                          Send
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-white mb-2">Anonymous Chat</h3>
                        <p className="text-slate-400">
                          Chat with random anonymous users. Your identity will be hidden.
                        </p>
                      </div>
                      <button
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all"
                        type="button"
                        onClick={() => {
                          setAnonChatSearching(true);
                          socket.emit("anon:chat:join");
                        }}
                      >
                        Start Anonymous Chat
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Video Section */}
          {mainTab === "video" && (
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-2xl p-6 backdrop-blur-lg">
              {/* Video tabs: Users / Room / Anonymous */}
              <div className="pb-4">
                <div className="flex gap-2 p-1 bg-slate-700/30 rounded-lg mb-4">
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${videoTab === "users" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-slate-400 hover:text-white"}`} 
                    type="button" 
                    onClick={() => setVideoTab("users")}
                  >
                    Active Users
                  </button>
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${videoTab === "room" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-slate-400 hover:text-white"}`} 
                    type="button" 
                    onClick={() => setVideoTab("room")}
                  >
                    Join Room
                  </button>
                  <button 
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${videoTab === "anon" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "text-slate-400 hover:text-white"}`} 
                    type="button" 
                    onClick={() => setVideoTab("anon")}
                  >
                    Anonymous
                  </button>
                </div>
              </div>
              
              {/* Video content */}
              {videoTab === "users" ? (
                <div className="flex gap-6 min-h-[400px]">
                  {/* User list */}
                  <div className="w-1/3 bg-slate-700/30 rounded-xl p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">Active Users ({otherUsers.length})</h3>
                      <button 
                        className="px-3 py-1 bg-slate-600/50 text-slate-300 text-sm rounded-lg hover:bg-slate-600/70 transition-all" 
                        type="button" 
                        onClick={() => socket.emit("users:list")}
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="space-y-2">
                      {otherUsers.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm">No active users yet</p>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {otherUsers.map((user) => (
                            <li key={user} className="bg-slate-600/20 rounded-lg p-3 hover:bg-slate-600/40 transition-all">
                              <button
                                className="w-full flex items-center justify-between text-left"
                                type="button"
                                onClick={() => inviteToVideo(user)}
                              >
                                <span className="text-sm text-white font-medium truncate">{user}</span>
                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">Call</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  
                  {/* Video info */}
                  <div className="flex-1 bg-slate-800/30 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Start a call</h3>
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">{connected ? "Online" : "Offline"}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto mb-4">
                      <div className="text-slate-400 text-sm">
                        <p className="mb-2">Click a user on the left to send an invite and create a private video room.</p>
                        <p>If you receive an invite, use the Join button in the popup.</p>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          type="text"
                          disabled
                          value="Invites create a unique room automatically."
                        />
                        <button className="px-4 py-2 bg-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-600/70 transition-all" type="button" onClick={() => socket.emit("users:list")}>
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : videoTab === "room" ? (
                <div className="space-y-6">
                  <form className="space-y-4" onSubmit={joinVideoRoom}>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300" htmlFor="room">Room ID</label>
                      <input 
                        id="room" 
                        className="w-full px-4 py-2 bg-slate-700/30 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        value={room} 
                        onChange={(e) => setRoom(e.target.value)} 
                        placeholder="Enter room ID" 
                      />
                    </div>
                    <div className="flex justify-center">
                      <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all" type="submit">Join Video Room</button>
                    </div>
                  </form>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Available Rooms</h3>
                    <div className="space-y-2">
                      {roomsList.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                          <p className="text-sm">No active rooms yet</p>
                        </div>
                      ) : (
                        <ul className="space-y-1">
                          {roomsList.map((roomId) => (
                            <li key={roomId} className="bg-slate-600/20 rounded-lg p-3 hover:bg-slate-600/40 transition-all">
                              <button
                                className="w-full flex items-center justify-between text-left"
                                type="button"
                                onClick={() => {
                                  setRoom(roomId);
                                  router.push(`/room/${roomId}`);
                                }}
                              >
                                <span className="text-sm text-white font-medium truncate">{roomId}</span>
                                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">Join</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-md">
                      {anonVideoSearching ? "Searching..." : "Idle"}
                    </span>
                  </div>
                  <div className="flex justify-center gap-3">
                    {!anonVideoSearching ? (
                      <button 
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all" 
                        type="button" 
                        onClick={startAnonVideo}
                      >
                        Start Anonymous Video Call
                      </button>
                    ) : (
                      <button 
                        className="px-6 py-3 bg-slate-600/50 text-slate-300 rounded-xl hover:bg-slate-600/70 transition-all" 
                        type="button" 
                        onClick={leaveAnonVideo}
                      >
                        Cancel Search
                      </button>
                    )}
                  </div>
                  <div className="text-center text-slate-400 text-sm">
                    <p className="mb-2">Click the button above to start searching for an anonymous video chat partner.</p>
                    <p>Once matched, you&apos;ll be redirected to a private video room.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
