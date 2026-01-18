'use client'
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../providers/SocketProvider.jsx";
import toast from "react-hot-toast";

class PeerService{
  constructor() {
    this.peer = null;
    this.initPeer();
  }
  
  initPeer() {
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
  }
  
  recreatePeer() {
    const previousPeer = this.peer;
    try {
      if (previousPeer) previousPeer.close();
    } catch {}
    this.initPeer();
    return this.peer;
  }
  
  async getOffer(){
    if (!this.peer) {
      this.initPeer();
    }
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }
  
  async getAnswer(offer) {
    if (!this.peer) {
      this.initPeer();
    }
    await this.peer.setRemoteDescription(offer);
    const ans = await this.peer.createAnswer();
    await this.peer.setLocalDescription(new RTCSessionDescription(ans));
    return ans;
  }
  
  async setRemoteDescription(ans) {
    if (!this.peer) {
      this.initPeer();
    }
    await this.peer.setRemoteDescription(new RTCSessionDescription(ans));
  }
  
  getPeer() {
    if (!this.peer) {
      this.initPeer();
    }
    return this.peer;
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
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setRemoteDescription(ans);
  }, []);

  useEffect(() => {
    const trackHandler = async (ev) => {
      const remoteStream = ev.streams;
      setRemoteStream(remoteStream[0]);
    };
    const currentPeer = peer.getPeer();
    currentPeer.addEventListener("track", trackHandler);
    return () => { currentPeer.removeEventListener("track", trackHandler); };
  }, [peerVersion]);

  // Handle ICE candidates
  useEffect(() => {
    const currentPeer = peer.getPeer();
    
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
      await currentPeer.addIceCandidate(new RTCIceCandidate(candidate));
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
    <div className="roomPage">
      <div className="roomTopBar">
        <div>
          <h1 className="roomTitle">Room {roomId}</h1>
          <div className="statusRow">
            <span className={`badge ${connected ? "badgeOk" : "badgeWarn"}`}>Connection: {connected ? "Online" : "Offline"}</span>
            <span className={`badge ${remoteSocketId ? "badgeOk" : "badgeWarn"}`}>Peer: {remoteSocketId ? "Connected" : "Waiting"}</span>
          </div>
        </div>
        <div className="buttonRow">
          {incomingCall ? (
            <>
              <button className="buttonPrimary" onClick={acceptIncomingCall}>Accept</button>
              <button className="buttonSecondary" onClick={declineIncomingCall}>Decline</button>
            </>
          ) : null}
          {remoteSocketId && !incomingCall ? <button className="buttonPrimary" onClick={handleCallUser}>Call</button> : null}
          {myStream && <button className="buttonSecondary" onClick={sendStreams}>Send Stream</button>}
          <button className="buttonSecondary" onClick={() => toast("Copy the room URL to invite someone")}>Invite</button>
        </div>
      </div>
      <div className="videoGrid">
        <div className="videoCard">
          <div className="videoHeader">
            <div className="videoLabel">My Video</div>
            <div className="badge">{myStream ? "Ready" : "Not started"}</div>
          </div>
          <div className="videoFrame">
            {myStream ? <ReactPlayer className="playerFill" playing muted url={myStream} /> : null}
          </div>
        </div>
        <div className="videoCard">
          <div className="videoHeader">
            <div className="videoLabel">Remote Video</div>
            <div className="badge">{remoteStream ? "Live" : "Waiting"}</div>
          </div>
          <div className="videoFrame">
            {remoteStream ? <ReactPlayer className="playerFill" playing muted url={remoteStream} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
