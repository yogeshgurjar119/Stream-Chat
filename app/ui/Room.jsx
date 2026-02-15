'use client'
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../providers/SocketProvider.jsx";
import toast from "react-hot-toast";

class PeerService{
  constructor() {
    this.peer = null;
  }
  
  ensurePeer() {
    if (this.peer) return this.peer;
    if (typeof RTCPeerConnection === "undefined") return null;
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
    return this.peer;
  }
  
  recreatePeer() {
    if (typeof RTCPeerConnection === "undefined") return null;
    const previousPeer = this.peer;
    try {
      if (previousPeer) previousPeer.close();
    } catch {}
    this.peer = null;
    return this.ensurePeer();
  }
  
  async getOffer(){
    const currentPeer = this.ensurePeer();
    if (!currentPeer) throw new Error("WebRTC is not available");
    const offer = await currentPeer.createOffer();
    await currentPeer.setLocalDescription(offer);
    return offer;
  }
  
  async getAnswer(offer) {
    const currentPeer = this.ensurePeer();
    if (!currentPeer) throw new Error("WebRTC is not available");
    await currentPeer.setRemoteDescription(offer);
    const ans = await currentPeer.createAnswer();
    await currentPeer.setLocalDescription(ans);
    return ans;
  }
  
  async setRemoteDescription(ans) {
    const currentPeer = this.ensurePeer();
    if (!currentPeer) throw new Error("WebRTC is not available");
    await currentPeer.setRemoteDescription(ans);
  }
  
  getPeer() {
    return this.ensurePeer();
  }
}
const peer = new PeerService();

export default function RoomPage({ roomId }) {
  const socket = useSocket();
  const [mounted, setMounted] = useState(false);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const [connected, setConnected] = useState(Boolean(socket?.connected));
  const [incomingCall, setIncomingCall] = useState(null);
  const [peerVersion, setPeerVersion] = useState(0);
  const didJoinRoomRef = useRef(false);
  const myName = useMemo(() => (typeof localStorage !== "undefined" ? (localStorage.getItem("rt_username") ?? "Anonymous").trim() : "Anonymous"), []);

  const handleUserJoined = useCallback(({ username, id }) => {
    setRemoteSocketId(id);
  }, []);

  const addTracksToPeer = useCallback((stream) => {
    const currentPeer = peer.getPeer();
    if (!currentPeer) {
      toast.error("WebRTC is not available");
      return;
    }
    const existingTrackIds = new Set(
      currentPeer.getSenders().map(sender => sender.track?.id)
    );
    const tracks = Array.from(stream.getTracks()).sort((a, b) => {
      if (a.kind === 'audio' && b.kind === 'video') return -1;
      if (a.kind === 'video' && b.kind === 'audio') return 1;
      return 0;
    });
    for (const track of tracks) {
      if (!existingTrackIds.has(track.id)) {
        currentPeer.addTrack(track, stream);
      }
    }
  }, []);

  const recreatePeer = useCallback(() => {
    peer.recreatePeer();
    setPeerVersion((v) => v + 1);
  }, []);

  const handleCallUser = useCallback(async () => {
    if (!peer.getPeer()) {
      toast.error("WebRTC is not available");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
      addTracksToPeer(stream);
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
    } catch (error) {
      console.error("Error initiating call:", error);
      if (stream && (error.name === 'InvalidModificationError' || error.name === 'InvalidStateError')) {
        try {
          recreatePeer();
          addTracksToPeer(stream);
          const offer = await peer.getOffer();
          socket.emit("user:call", { to: remoteSocketId, offer });
          return;
        } catch (retryError) {
          console.error("Retry failed:", retryError);
        }
      }
      toast.error("Failed to start call. Please check permissions.");
    }
  }, [remoteSocketId, socket, addTracksToPeer, recreatePeer]);

  const handleIncommingCall = useCallback(async ({ from, offer }) => {
    setRemoteSocketId(from);
    setIncomingCall({ from, offer });
  }, []);

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall) return;
    if (!peer.getPeer()) {
      toast.error("WebRTC is not available");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMyStream(stream);
      addTracksToPeer(stream);
      const ans = await peer.getAnswer(incomingCall.offer);
      socket.emit("call:accepted", { to: incomingCall.from, ans });
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
      if (stream && (error.name === 'InvalidModificationError' || error.name === 'InvalidStateError')) {
        try {
          recreatePeer();
          addTracksToPeer(stream);
          const ans = await peer.getAnswer(incomingCall.offer);
          socket.emit("call:accepted", { to: incomingCall.from, ans });
          setIncomingCall(null);
          return;
        } catch (retryError) {
          console.error("Retry failed:", retryError);
        }
      }
      toast.error("Failed to accept call. Please check permissions.");
    }
  }, [incomingCall, addTracksToPeer, socket, recreatePeer]);

  const declineIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Send Streams function - explicitly triggers renegotiation when tracks are added
  const sendStreams = useCallback(async () => {
    if (myStream) {
      if (!peer.getPeer()) {
        toast.error("WebRTC is not available");
        return;
      }
      try {
        addTracksToPeer(myStream);
        
        if (remoteSocketId) {
          const offer = await peer.getOffer();
          socket.emit("peer:nego:needed", { to: remoteSocketId, offer });
          toast.success('Stream sent successfully');
        }
      } catch (error) {
        console.error('Error initiating renegotiation:', error);
        if (error.name === 'InvalidModificationError' || error.name === 'InvalidStateError') {
          try {
            recreatePeer();
            addTracksToPeer(myStream);
            if (remoteSocketId) {
              const offer = await peer.getOffer();
              socket.emit("peer:nego:needed", { to: remoteSocketId, offer });
              toast.success('Stream sent successfully (after retry)');
            }
            return;
          } catch (retryError) {
             console.error("Retry failed:", retryError);
          }
        }
        toast.error('Failed to send stream');
      }
    }
  }, [myStream, addTracksToPeer, remoteSocketId, socket, recreatePeer]);

  const handleCallAccepted = useCallback(
    async ({ ans }) => {
      try {
        await peer.setRemoteDescription(ans);
      } catch (error) {
         console.error("Error setting remote description:", error);
         toast.error("Failed to establish connection");
      }
    },
    []
  );

  const handleNegoNeeded = useCallback(async () => {
    try {
      const offer = await peer.getOffer();
      socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    } catch (e) {
      toast.error("Failed to negotiate");
    }
  }, [remoteSocketId, socket]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      try {
        const ans = await peer.getAnswer(offer);
        socket.emit("peer:nego:done", { to: from, ans });
      } catch (e) {
        toast.error("Failed to negotiate");
      }
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    try {
      await peer.setRemoteDescription(ans);
    } catch (e) {
      toast.error("Failed to negotiate");
    }
  }, []);

  useEffect(() => {
    const trackHandler = async (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    };
    const currentPeer = peer.getPeer();
    if (!currentPeer) return;
    currentPeer.addEventListener("track", trackHandler);
    return () => { currentPeer.removeEventListener("track", trackHandler); };
  }, [peerVersion]);

  // Handle ICE candidates
  useEffect(() => {
    const currentPeer = peer.getPeer();
    if (!currentPeer) return;
    
    const handleIceCandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice:candidate", { 
          to: remoteSocketId, 
          candidate: event.candidate 
        });
      }
    };
    
    currentPeer.addEventListener("icecandidate", handleIceCandidate);
    
    return () => {
      currentPeer.removeEventListener("icecandidate", handleIceCandidate);
    };
  }, [remoteSocketId, socket, peerVersion]);

  const handleIceCandidate = useCallback(async ({ candidate }) => {
    try {
      const currentPeer = peer.getPeer();
      if (!currentPeer) return;
      await currentPeer.addIceCandidate(candidate);
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }, []);

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
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!roomId) return;
    if (!myName) return;
    if (didJoinRoomRef.current) return;
    didJoinRoomRef.current = true;
    socket.emit("user:register", { username: myName });
    socket.emit("room:join", { username: myName, room: roomId });
  }, [myName, roomId, socket]);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);
    socket.on("ice:candidate", handleIceCandidate);
    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
      socket.off("ice:candidate", handleIceCandidate);
    };
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted, handleNegoNeedIncomming, handleNegoNeedFinal, handleIceCandidate]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen w-full px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-wide text-white">Room {roomId}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${connected ? "border-emerald-400/40 text-emerald-200" : "border-amber-400/40 text-amber-200"}`}>Connection: {connected ? "Online" : "Offline"}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${remoteSocketId ? "border-emerald-400/40 text-emerald-200" : "border-amber-400/40 text-amber-200"}`}>Peer: {remoteSocketId ? "Connected" : "Waiting"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {incomingCall ? (
            <>
              <button className="rounded-xl border border-indigo-400/40 bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={acceptIncomingCall}>Accept</button>
              <button className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2 text-sm text-slate-200" onClick={declineIncomingCall}>Decline</button>
            </>
          ) : null}
          {remoteSocketId && !incomingCall ? <button className="rounded-xl border border-indigo-400/40 bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white" onClick={handleCallUser}>Call</button> : null}
          {myStream && <button className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2 text-sm text-slate-200" onClick={sendStreams}>Send Stream</button>}
          <button className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-2 text-sm text-slate-200" onClick={() => toast("Copy the room URL to invite someone")}>Invite</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-700/30 bg-slate-900/40 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-700/30 px-4 py-3">
            <div className="text-xs text-slate-200/80">My Video</div>
            <div className="rounded-full border border-slate-700/40 px-3 py-1 text-xs text-slate-200/80">{myStream ? "Ready" : "Not started"}</div>
          </div>
          <div className="aspect-video w-full bg-black/35">
            {myStream ? <ReactPlayer className="h-full w-full" playing muted url={myStream} /> : null}
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-700/30 bg-slate-900/40 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-700/30 px-4 py-3">
            <div className="text-xs text-slate-200/80">Remote Video</div>
            <div className="rounded-full border border-slate-700/40 px-3 py-1 text-xs text-slate-200/80">{remoteStream ? "Live" : "Waiting"}</div>
          </div>
          <div className="aspect-video w-full bg-black/35">
            {remoteStream ? <ReactPlayer className="h-full w-full" playing muted url={remoteStream} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
