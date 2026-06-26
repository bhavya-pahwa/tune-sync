import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from './hooks/useSocket';
import MusicPlayer from './components/MusicPlayer';
import { socket } from './socket';
import { Users, Send, Music2, Plus, LogIn, MessageSquare } from 'lucide-react';

const generateUserId = () => '_' + Math.random().toString(36).substr(2, 9);

function App() {
  const audioRef = useRef(null);
  const [userId] = useState(generateUserId());
  const [roomIdInput, setRoomIdInput] = useState('');
  const [joinedRoom, setJoinedRoom] = useState('');
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState('');
  const [songUrl] = useState('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');

  const [participants, setParticipants] = useState([userId]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useSocket(joinedRoom, audioRef);

  const isHost = sessionData?.host === userId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setError('');
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const response = await axios.post('http://localhost:8000/api/sessions/create', {
        sessionId: newRoomId,
        host: userId
      });
      setSessionData(response.data.data);
      setParticipants(response.data.data.participants || [userId]);
      setJoinedRoom(newRoomId);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create session');
    }
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    setError('');
    if (!roomIdInput) return;

    try {
      const { data: sessionRes } = await axios.get(`http://localhost:8000/api/sessions/${roomIdInput}`);
      const { data: updatedSessionRes } = await axios.post('http://localhost:8000/api/sessions/join', {
        sessionId: roomIdInput,
        participant: userId
      });

      setSessionData(updatedSessionRes.data);
      setParticipants(updatedSessionRes.data.participants || []);
      setJoinedRoom(roomIdInput);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to join session');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !joinedRoom || !socket) return;

    const msgData = {
      roomId: joinedRoom,
      userId,
      text: newMessage,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, msgData]);
    setNewMessage('');
    socket.emit('chat-message', msgData);
  };

  useEffect(() => {
    if (!socket) return;
    const onUserJoined = ({ userId: joinedUserId }) => {
      if (joinedUserId !== userId) {
        setParticipants((prev) => prev.includes(joinedUserId) ? prev : [...prev, joinedUserId]);
      }
    };
    const onUserLeft = ({ userId: leftUserId }) => {
      if (leftUserId !== userId) {
        setParticipants((prev) => prev.filter(p => p !== leftUserId));
      }
    };
    const onChatMessage = (msg) => setMessages((prev) => [...prev, msg]);

    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('chat-message', onChatMessage);

    return () => {
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('chat-message', onChatMessage);
    };
  }, [userId]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500/30">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col min-h-screen">
        <header className="flex items-center justify-between mb-12 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Tune Sync
            </h1>
          </div>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 flex justify-center backdrop-blur-sm transition-all">
            {error}
          </div>
        )}

        {!joinedRoom ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02] duration-300">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 text-indigo-400">
                  <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Start a New Session</h3>
                <p className="text-slate-400 mb-8 max-w-[250px]">Create an empty room and invite your friends to listen together.</p>
                <button
                  onClick={handleCreateSession}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  Create Room <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02] duration-300">
                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 text-blue-400">
                  <LogIn className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Join Session</h3>
                <p className="text-slate-400 mb-8 max-w-[250px]">Enter a room code below to jump right into the music.</p>
                <form onSubmit={handleJoinSession} className="w-full flex flex-col gap-4">
                  <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    placeholder="Enter 6-digit Code"
                    className="w-full py-4 px-6 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-center text-lg tracking-widest uppercase transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Join <LogIn className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="mb-8 flex items-center justify-between bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">Current Room Code</p>
                <h2 className="text-3xl font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-lg inline-block">{joinedRoom}</h2>
              </div>
              <div className="flex -space-x-3">
                {participants.slice(0, 5).map((p, i) => (
                  <div key={i} title={p} className={`w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs font-bold ${p === userId ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-200'} shadow-md z-${10 - i}`}>
                    {p === userId ? 'You' : p.substring(1, 3).toUpperCase()}
                  </div>
                ))}
                {participants.length > 5 && (
                  <div className="w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center text-xs font-bold bg-slate-700 text-slate-300 z-0">
                    +{participants.length - 5}
                  </div>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 items-start flex-1">
              <div className="lg:col-span-2">
                <MusicPlayer
                  sessionId={joinedRoom}
                  isHost={isHost}
                  socket={socket}
                  songUrl={songUrl}
                />
              </div>

              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl flex flex-col h-[600px] shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-700/50 bg-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <h3 className="font-semibold text-slate-100">Room Chat</h3>
                  </div>
                  <span className="text-xs font-medium bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {participants.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                      <MessageSquare className="w-10 h-10 opacity-20" />
                      <p className="text-sm">Say hi to start the conversation</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isMe = msg.userId === userId;
                      return (
                        <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                          <span className="text-[10px] text-slate-500 mb-1 ml-1 font-medium">{isMe ? 'You' : msg.userId}</span>
                          <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMe
                              ? 'bg-indigo-600 text-white rounded-br-sm'
                              : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                            }`}>
                            {msg.text}
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-slate-700/50 bg-slate-800/80">
                  <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-900 border border-slate-700/50 rounded-full px-5 py-3 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all text-slate-200 placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      className={`absolute right-2 top-1.5 p-2 rounded-full flex items-center justify-center transition-all ${newMessage.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
