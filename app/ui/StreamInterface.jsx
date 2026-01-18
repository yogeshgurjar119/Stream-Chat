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
    <div className="streamInterface">
      {/* Username setup */}
      {!normalizedName ? (
        <div className="panel">
          <div className="panelBody">
            <header className="lobbyHeader">
              <h1 className="lobbyTitle">Welcome</h1>
              <p className="lobbySubtitle">Enter a username to access chat and video features.</p>
            </header>
            <form className="form" onSubmit={onUsernameSubmit}>
              <div className="field">
                <label className="label" htmlFor="username">Username</label>
                <input 
                  id="username" 
                  className="input" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Enter your username" 
                />
              </div>
              <div className="buttonRow">
                <button 
                  className="buttonPrimary" 
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
        <div className="streamContent">
          {/* Main tabs: Chat / Video */}
          <div className="segmentRow" style={{ marginBottom: 16 }}>
            <button 
              className={`segmentButton ${mainTab === "chat" ? "segmentButtonActive" : ""}`} 
              type="button" 
              onClick={() => setMainTab("chat")}
            >
              Chat
            </button>
            <button 
              className={`segmentButton ${mainTab === "video" ? "segmentButtonActive" : ""}`} 
              type="button" 
              onClick={() => setMainTab("video")}
            >
              Video
            </button>
          </div>
          
          {/* Chat Section */}
          {mainTab === "chat" && (
            <div className="panel">
              {/* Chat tabs: Active Users / Anonymous */}
              <div className="panelBody" style={{ paddingBottom: 8 }}>
                <div className="segmentRow" style={{ margin: 0 }}>
                  <button 
                    className={`segmentButton ${chatTab === "active" ? "segmentButtonActive" : ""}`} 
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
                    className={`segmentButton ${chatTab === "anon" ? "segmentButtonActive" : ""}`} 
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
                <div className="splitPane" style={{ minHeight: 400 }}>
                  {/* User list */}
                  <div className="listPane">
                    <div className="listHeader">
                      <h3 className="listTitle">Active Users</h3>
                      <button 
                        className="buttonSecondary" 
                        type="button" 
                        onClick={() => socket.emit("users:list")}
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="userList">
                      {otherUsers.length ? otherUsers.map((u) => (
                        <button 
                          key={u} 
                          className={`userItem ${activeChatPeer === u ? "userItemActive" : ""}`} 
                          type="button" 
                          onClick={() => openDirectChat(u)}
                        >
                          {u}
                        </button>
                      )) : <div className="smallText">No active users yet.</div>}
                    </div>
                  </div>
                  
                  {/* Chat messages */}
                  <div className="chatPane">
                    <div className="chatHeader">
                      <h3 className="chatTitle">
                        {activeChatPeer ? `Chat with ${activeChatPeer}` : "Select a user"}
                      </h3>
                      <span className="badge">{activeChatRoom ? "Ready" : "Idle"}</span>
                    </div>
                    <div className="chatMessages">
                      {activeChatRoom ? (
                        chatMessages.length ? (
                          chatMessages.map((m, idx) => (
                            <div 
                              key={`${m.at ?? "x"}-${idx}`} 
                              className={`chatBubble ${m.fromId && m.fromId === myId ? "chatBubbleMe" : ""}`}
                            >
                              <div className="chatMeta">
                                {m.fromId && m.fromId === myId ? "Me" : m.from}
                              </div>
                              <div>{m.message}</div>
                            </div>
                          ))
                        ) : (
                          <div className="smallText">Say hi</div>
                        )
                      ) : (
                        <div className="smallText">Pick someone from the left.</div>
                      )}
                    </div>
                    <form className="chatInputRow" onSubmit={sendChatMessage}>
                      <input 
                        className="input" 
                        value={chatDraft} 
                        onChange={(e) => setChatDraft(e.target.value)} 
                        placeholder={activeChatRoom ? "Type a message..." : "Select a user to start"} 
                        disabled={!activeChatRoom} 
                      />
                      <button 
                        className="buttonPrimary" 
                        type="submit" 
                        disabled={!activeChatRoom}
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="panelBody">
                  <div className="statusRow">
                    <span className="badge">
                      {activeChatRoom ? "Live" : "Idle"}
                    </span>
                    {activeChatRoom ? <span className="badge badgeOk">Users: {anonChatCount}</span> : null}
                  </div>
                  <div className="buttonRow">
                    {!activeChatRoom ? (
                      <button 
                        className="buttonPrimary" 
                        type="button" 
                        onClick={startAnonChat}
                      >
                        Join Anonymous Chat
                      </button>
                    ) : (
                      <button 
                        className="buttonSecondary" 
                        type="button" 
                        onClick={leaveAnonChat}
                      >
                        Leave
                      </button>
                    )}
                  </div>
                  {activeChatRoom && (
                    <div className="panel" style={{ marginTop: 14 }}>
                      <div className="chatPane">
                        <div className="chatHeader">
                          <h3 className="chatTitle">Anonymous Chat</h3>
                          <span className="badge badgeOk">Live</span>
                        </div>
                        <div className="chatMessages">
                          {chatMessages.length ? chatMessages.map((m, idx) => (
                            <div 
                              key={`${m.at ?? "x"}-${idx}`} 
                              className={`chatBubble ${m.fromId && m.fromId === myId ? "chatBubbleMe" : ""}`}
                            >
                              <div className="chatMeta">
                                {m.fromId && m.fromId === myId ? "Me" : m.from}
                              </div>
                              <div>{m.message}</div>
                            </div>
                          )) : <div className="smallText">Say hi</div>}
                        </div>
                        <form className="chatInputRow" onSubmit={sendChatMessage}>
                          <input 
                            className="input" 
                            value={chatDraft} 
                            onChange={(e) => setChatDraft(e.target.value)} 
                            placeholder="Type a message..." 
                          />
                          <button className="buttonPrimary" type="submit">Send</button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Video Section */}
          {mainTab === "video" && (
            <div className="panel">
              {/* Video tabs: Users / Room / Anonymous */}
              <div className="panelBody" style={{ paddingBottom: 8 }}>
                <div className="segmentRow" style={{ margin: 0 }}>
                  <button 
                    className={`segmentButton ${videoTab === "users" ? "segmentButtonActive" : ""}`} 
                    type="button" 
                    onClick={() => setVideoTab("users")}
                  >
                    Active Users
                  </button>
                  <button 
                    className={`segmentButton ${videoTab === "room" ? "segmentButtonActive" : ""}`} 
                    type="button" 
                    onClick={() => setVideoTab("room")}
                  >
                    Join Room
                  </button>
                  <button 
                    className={`segmentButton ${videoTab === "anon" ? "segmentButtonActive" : ""}`} 
                    type="button" 
                    onClick={() => setVideoTab("anon")}
                  >
                    Anonymous
                  </button>
                </div>
              </div>
              
              {/* Video content */}
              {videoTab === "users" ? (
                <div className="splitPane" style={{ minHeight: 400 }}>
                  {/* User list */}
                  <div className="listPane">
                    <div className="listHeader">
                      <h3 className="listTitle">Active Users ({otherUsers.length})</h3>
                      <button 
                        className="buttonSecondary" 
                        type="button" 
                        onClick={() => socket.emit("users:list")}
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="userList">
                      {otherUsers.length ? otherUsers.map((u) => (
                        <button 
                          key={u} 
                          className="userItem" 
                          type="button" 
                          onClick={() => inviteToVideo(u)}
                        >
                          {u}
                        </button>
                      )) : <div className="smallText">No active users yet.</div>}
                    </div>
                  </div>
                  
                  {/* Video info */}
                  <div className="chatPane">
                    <div className="chatHeader">
                      <h3 className="chatTitle">Start a call</h3>
                      <span className="badge">{connected ? "Online" : "Offline"}</span>
                    </div>
                    <div className="chatMessages">
                      <div className="smallText">Click a user on the left to send an invite and create a private video room.</div>
                      <div className="smallText" style={{ marginTop: 10 }}>If you receive an invite, use the Join button in the popup.</div>
                    </div>
                    <div className="chatInputRow">
                      <input 
                        className="input" 
                        disabled 
                        value="Invites create a unique room automatically."
                      />
                      <button 
                        className="buttonSecondary" 
                        type="button" 
                        onClick={() => socket.emit("users:list")}
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
              ) : videoTab === "room" ? (
                <div className="panelBody">
                  <form className="form" onSubmit={joinVideoRoom}>
                    <div className="field">
                      <label className="label" htmlFor="room">Room ID</label>
                      <input 
                        id="room" 
                        className="input" 
                        value={room} 
                        onChange={(e) => setRoom(e.target.value)} 
                        placeholder="Enter room ID" 
                      />
                    </div>
                    <div className="buttonRow">
                      <button className="buttonPrimary" type="submit">Join Video Room</button>
                    </div>
                  </form>
                  <div style={{ marginTop: 16 }}>
                    <h3 className="listTitle" style={{ marginBottom: 8 }}>Available Rooms</h3>
                    <div className="userList">
                      {roomsList.length ? roomsList.map((roomId) => (
                        <button 
                          key={roomId} 
                          className="userItem" 
                          type="button" 
                          onClick={() => {
                            setRoom(roomId);
                            router.push(`/room/${roomId}`);
                          }}
                        >
                          {roomId}
                        </button>
                      )) : <div className="smallText">No active rooms yet.</div>}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="panelBody">
                  <div className="statusRow">
                    <span className="badge">
                      {anonVideoSearching ? "Searching..." : "Idle"}
                    </span>
                  </div>
                  <div className="buttonRow">
                    {!anonVideoSearching ? (
                      <button 
                        className="buttonPrimary" 
                        type="button" 
                        onClick={startAnonVideo}
                      >
                        Start Anonymous Video Call
                      </button>
                    ) : (
                      <button 
                        className="buttonSecondary" 
                        type="button" 
                        onClick={leaveAnonVideo}
                      >
                        Cancel Search
                      </button>
                    )}
                  </div>
                  <div className="chatMessages" style={{ marginTop: 16 }}>
                    <div className="smallText">Click the button above to start searching for an anonymous video chat partner.</div>
                    <div className="smallText" style={{ marginTop: 10 }}>Once matched, you&apos;ll be redirected to a private video room.</div>
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
