'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "../providers/SocketProvider.jsx";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import * as THREE from "three";

const USERNAME_STORAGE_KEY = "rt_username";
const ANON_PUBLIC_CHAT_ROOM = "anon-chat-public";

export default function LobbyScreen() {
  const socket = useSocket();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mainTab, setMainTab] = useState("chat");
  const [chatTab, setChatTab] = useState("active");
  const [videoTab, setVideoTab] = useState("users");
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("23");
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [activeChatPeer, setActiveChatPeer] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [anonChatSearching, setAnonChatSearching] = useState(false);
  const [anonChatCount, setAnonChatCount] = useState(0);
  const [anonVideoSearching, setAnonVideoSearching] = useState(false);
  const threeRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(USERNAME_STORAGE_KEY) ?? "";
    if (stored) setUsername(stored);
  }, []);

  const normalizedName = useMemo(() => (username ?? "").trim(), [username]);
  const normalizedRoom = useMemo(() => (room ?? "").trim(), [room]);

  const otherUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    if (!normalizedName) return users;
    return users.filter((u) => u !== normalizedName);
  }, [users, normalizedName]);

  const registerUser = useCallback(() => {
    if (!normalizedName) return;
    localStorage.setItem(USERNAME_STORAGE_KEY, normalizedName);
    socket.emit("user:register", { username: normalizedName });
    socket.emit("users:list");
  }, [normalizedName, socket]);

  const onUsernameSet = () => {
    if (!normalizedName) return;
    registerUser();
  };

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
    [router, normalizedName, normalizedRoom, registerUser]
  );

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

  const openDirectChat = useCallback(
    (peerName) => {
      if (!normalizedName) {
        toast.error("Enter username first");
        return;
      }
      registerUser();
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
    },
    [normalizedName, socket]);

  const leaveAnonChat = useCallback(() => {
    setAnonChatSearching(false);
    setActiveChatRoom(null);
    setActiveChatPeer(null);
    setChatMessages([]);
    setChatDraft("");
    setAnonChatCount(0);
    socket.emit("anon:chat:leave");
  }, [socket]);

  const startAnonVideo = useCallback(() => {
    if (!normalizedName) {
        toast.error("Enter username first");
        return;
      }
      setVideoTab("anon");
      socket.emit("anon:video:find");
    },
    [normalizedName, socket]);

  const leaveAnonVideo = useCallback(() => {
    setAnonVideoSearching(false);
    socket.emit("anon:video:leave");
  }, [socket]);

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

  useEffect(() => {
    const container = threeRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const isMobile = window.matchMedia?.("(max-width: 860px)")?.matches ?? false;
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(new THREE.Color("#050816"), 8, 32);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    camera.position.set(-2.4, 1.1, 7);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, isMobile ? 1.5 : 2));
    container.replaceChildren(renderer.domElement);
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0x93c5fd, 1.0);
    key.position.set(6, 6, 6);
    scene.add(key);
    const fill = new THREE.PointLight(0xa7f3d0, 0.7, 40);
    fill.position.set(-6, -2, 6);
    scene.add(fill);
    const group = new THREE.Group();
    scene.add(group);
    const mainMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.35,
      roughness: 0.25,
      emissive: 0x111827,
      emissiveIntensity: 0.5,
    });
    const knotGeo = new THREE.TorusKnotGeometry(1.1, 0.32, 160, 18);
    const knot = new THREE.Mesh(knotGeo, mainMat);
    knot.position.set(0.0, 0.0, 0.0);
    group.add(knot);
    const ringGeo = new THREE.TorusGeometry(2.2, 0.02, 18, 220);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      metalness: 0.0,
      roughness: 0.3,
      emissive: 0x0f766e,
      emissiveIntensity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI * 0.5;
    ring.rotation.y = Math.PI * 0.1;
    group.add(ring);
    let starsGeo;
    let starsMat;
    let stars;
    const starsCount = reduceMotion ? 0 : isMobile ? 520 : 1100;
    if (starsCount > 0) {
      starsGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(starsCount * 3);
      for (let i = 0; i < starsCount; i += 1) {
        const i3 = i * 3;
        const r = 6 + Math.random() * 20;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = r * Math.cos(phi);
        positions[i3 + 2] = -Math.abs(r * Math.sin(phi) * Math.sin(theta));
      }
      starsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      starsMat = new THREE.PointsMaterial({
        color: 0x93c5fd,
        size: isMobile ? 0.018 : 0.02,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
      });
      stars = new THREE.Points(starsGeo, starsMat);
      scene.add(stars);
    }
    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    setSize();
    const resizeObserver = new ResizeObserver(() => setSize());
    resizeObserver.observe(container);
    let rafId = 0;
    let running = true;
    const clock = new THREE.Clock();
    const animate = () => {
      if (!running) return;
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.22;
      group.rotation.x = Math.sin(t * 0.18) * 0.08;
      knot.rotation.z = t * 0.12;
      if (stars) stars.rotation.y = -t * 0.02;
      renderer.render(scene, camera);
    };
    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
        rafId = 0;
        return;
      }
      if (reduceMotion) return;
      if (!running) {
        running = true;
        clock.start();
        animate();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      container.replaceChildren();
      if (starsGeo) starsGeo.dispose();
      if (starsMat) starsMat.dispose();
      knotGeo.dispose();
      ringGeo.dispose();
      mainMat.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="lobbyPage">
      <div ref={threeRef} className="lobbyCanvas" />
      <div className="lobbyOverlay">
        <div className="shellLayout">
          <aside className="sideNav">
            <p className="navTitle">Menu</p>
            <div className="navButtons">
              <button className={`navButton ${mainTab === "chat" ? "navButtonActive" : ""}`} onClick={() => setMainTab("chat")} type="button">Chat</button>
              <button className={`navButton ${mainTab === "video" ? "navButtonActive" : ""}`} onClick={() => setMainTab("video")} type="button">Video</button>
            </div>
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="panelBody">
                <div className="field">
                  <label className="label" htmlFor="username">Username</label>
                  <input className="input" type="text" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="nickname" />
                </div>
                <div className="statusRow" style={{ marginTop: 10 }}>
                  <span className={`badge ${connected ? "badgeOk" : "badgeWarn"}`}>Connection: {connected ? "Online" : "Offline"}</span>
                </div>
              </div>
            </div>
          </aside>
          <main className="contentArea">
            {!normalizedName ? (
              <div className="panel">
                <div className="panelBody">
                  <header className="lobbyHeader">
                    <h1 className="lobbyTitle">Welcome</h1>
                    <p className="lobbySubtitle">Enter a username to continue.</p>
                  </header>
                  <div className="field">
                    <label className="label" htmlFor="username2">Username</label>
                    <input id="username2" className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" />
                  </div>
                  <div className="buttonRow">
                    <button className="buttonPrimary" type="button" onClick={onUsernameSet} disabled={!username.trim()}>Continue</button>
                  </div>
                </div>
              </div>
            ) : mainTab === "chat" ? (
              <>
                <header className="lobbyHeader">
                  <h1 className="lobbyTitle">Chat</h1>
                  <p className="lobbySubtitle">Active users or anonymous chat.</p>
                </header>
                <div className="segmentRow">
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
                <div className="panel">
                  {chatTab === "active" ? (
                    <div className="splitPane">
                      <div className="listPane">
                        <div className="listHeader">
                          <h3 className="listTitle">Active Users</h3>
                          <button className="buttonSecondary" type="button" onClick={() => socket.emit("users:list")}>Refresh</button>
                        </div>
                        <div className="userList">
                          {otherUsers.length ? otherUsers.map((u) => (
                            <button key={u} className={`userItem ${activeChatPeer === u ? "userItemActive" : ""}`} type="button" onClick={() => openDirectChat(u)}>{u}</button>
                          )) : <div className="smallText">No active users yet.</div>}
                        </div>
                      </div>
                      <div className="chatPane">
                        <div className="chatHeader">
                          <h3 className="chatTitle">{activeChatPeer ? `Chat with ${activeChatPeer}` : "Select a user"}</h3>
                          <span className="badge">{activeChatRoom ? "Ready" : "Idle"}</span>
                        </div>
                        <div className="chatMessages">
                          {activeChatRoom ? (chatMessages.length ? chatMessages.map((m, idx) => (
                            <div key={`${m.at ?? "x"}-${idx}`} className={`chatBubble ${m.fromId && m.fromId === myId ? "chatBubbleMe" : ""}`}>
                              <div className="chatMeta">{m.fromId && m.fromId === myId ? "Me" : m.from}</div>
                              <div>{m.message}</div>
                            </div>
                          )) : <div className="smallText">Say hi</div>) : <div className="smallText">Pick someone from the left.</div>}
                        </div>
                        <form className="chatInputRow" onSubmit={sendChatMessage}>
                          <input className="input" value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} placeholder={activeChatRoom ? "Type a message..." : "Select a user to start"} disabled={!activeChatRoom} />
                          <button className="buttonPrimary" type="submit" disabled={!activeChatRoom}>Send</button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="panelBody">
                      <div className="statusRow">
                        <span className="badge">{activeChatRoom ? "Live" : "Idle"}</span>
                        {activeChatRoom ? <span className="badge badgeOk">Users: {anonChatCount}</span> : null}
                      </div>
                      <div className="buttonRow">
                        {!activeChatRoom ? (
                          <button className="buttonPrimary" type="button" onClick={startAnonChat}>Join Anonymous Chat</button>
                        ) : (
                          <button className="buttonSecondary" type="button" onClick={leaveAnonChat}>Leave</button>
                        )}
                      </div>
                      {activeChatRoom ? (
                        <div className="panel" style={{ marginTop: 14 }}>
                          <div className="chatPane">
                            <div className="chatHeader">
                              <h3 className="chatTitle">Anonymous Chat</h3>
                              <span className="badge badgeOk">Live</span>
                            </div>
                            <div className="chatMessages">
                              {chatMessages.length ? chatMessages.map((m, idx) => (
                                <div key={`${m.at ?? "x"}-${idx}`} className={`chatBubble ${m.fromId && m.fromId === myId ? "chatBubbleMe" : ""}`}>
                                  <div className="chatMeta">{m.fromId && m.fromId === myId ? "Me" : m.from}</div>
                                  <div>{m.message}</div>
                                </div>
                              )) : <div className="smallText">Say hi</div>}
                            </div>
                            <form className="chatInputRow" onSubmit={sendChatMessage}>
                              <input className="input" value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} placeholder="Type a message..." />
                              <button className="buttonPrimary" type="submit">Send</button>
                            </form>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <header className="lobbyHeader">
                  <h1 className="lobbyTitle">Video</h1>
                  <p className="lobbySubtitle">Join a room or match anonymously.</p>
                </header>
                <div className="segmentRow">
                  <button className={`segmentButton ${videoTab === "users" ? "segmentButtonActive" : ""}`} type="button" onClick={() => setVideoTab("users")}>Active Users</button>
                  <button className={`segmentButton ${videoTab === "room" ? "segmentButtonActive" : ""}`} type="button" onClick={() => setVideoTab("room")}>Room</button>
                  <button className={`segmentButton ${videoTab === "anon" ? "segmentButtonActive" : ""}`} type="button" onClick={() => setVideoTab("anon")}>Anonymous</button>
                </div>
                <div className="panel">
                  {videoTab === "users" ? (
                    <div className="splitPane">
                      <div className="listPane">
                        <div className="listHeader">
                          <h3 className="listTitle">Active Users ({otherUsers.length})</h3>
                          <button className="buttonSecondary" type="button" onClick={() => socket.emit("users:list")}>Refresh</button>
                        </div>
                        <div className="userList">
                          {otherUsers.length ? otherUsers.map((u) => (
                            <button key={u} className="userItem" type="button" onClick={() => inviteToVideo(u)}>{u}</button>
                          )) : <div className="smallText">No active users yet.</div>}
                        </div>
                      </div>
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
                          <input className="input" disabled value="Invites create a unique room automatically." />
                          <button className="buttonSecondary" type="button" onClick={() => socket.emit("users:list")}>Refresh</button>
                        </div>
                      </div>
                    </div>
                  ) : videoTab === "room" ? (
                    <div className="panelBody">
                      <div className="listHeader">
                        <h3 className="listTitle">Available Rooms ({roomsList.length})</h3>
                        <button className="buttonSecondary" type="button" onClick={() => socket.emit("rooms:list")}>Refresh</button>
                      </div>
                      <div className="userList" style={{ marginBottom: 14 }}>
                        {roomsList.length ? roomsList.map((rid) => (
                          <button key={rid} className="userItem" type="button" onClick={() => router.push(`/room/${rid}`)}>{rid}</button>
                        )) : <div className="smallText">No rooms created yet.</div>}
                      </div>
                      <form className="form" onSubmit={joinVideoRoom}>
                        <div className="field">
                          <label className="label" htmlFor="room">Room ID</label>
                          <input className="input" type="text" id="room" name="room" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Enter room id" autoComplete="off" />
                        </div>
                        <button className="buttonPrimary" type="submit">Join Video Room</button>
                      </form>
                    </div>
                  ) : (
                    <div className="panelBody">
                      <div className="statusRow">
                        <span className="badge">{anonVideoSearching ? "Searching..." : "Idle"}</span>
                      </div>
                      <div className="buttonRow">
                        <button className="buttonPrimary" type="button" onClick={startAnonVideo} disabled={anonVideoSearching}>{anonVideoSearching ? "Searching..." : "Find Partner"}</button>
                        <button className="buttonSecondary" type="button" onClick={leaveAnonVideo} disabled={!anonVideoSearching}>Cancel</button>
                      </div>
                      <div className="smallText" style={{ marginTop: 10 }}>When matched, you will be redirected automatically.</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
