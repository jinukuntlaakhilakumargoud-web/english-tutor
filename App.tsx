import React, { useEffect, useRef, useState } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';

const App: React.FC = () => {
  const { connect, disconnect, status, transcripts, volume } = useLiveSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleToggle = () => {
    if (status === 'connected' || status === 'connecting') {
      disconnect();
      setHasStarted(false);
    } else {
      connect();
      setHasStarted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col md:flex-row overflow-hidden">
      {/* Left Panel - Interaction Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        <header className="absolute top-6 left-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
             </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">LinguaFlow</h1>
            <p className="text-xs text-slate-400">AI English Coach</p>
          </div>
        </header>

        <div className="flex flex-col items-center gap-8 w-full max-w-md">
           {/* Visualizer Container */}
           <div className={`relative transition-all duration-700 ease-out ${hasStarted ? 'scale-100 opacity-100' : 'scale-95 opacity-50 grayscale'}`}>
              <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] rounded-full animate-pulse"></div>
              <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl shadow-black/50">
                 <Visualizer volume={volume} isActive={status === 'connected'} />
                 <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      status === 'connected' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                      status === 'connecting' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {status === 'connected' ? 'Listening' : status === 'connecting' ? 'Connecting...' : 'Ready'}
                    </span>
                 </div>
              </div>
           </div>

           {/* Controls */}
           <div className="flex flex-col items-center gap-4 w-full">
              <button
                onClick={handleToggle}
                className={`group relative flex items-center justify-center gap-3 px-8 py-4 w-full max-w-[280px] rounded-2xl font-semibold transition-all duration-300 transform active:scale-95 shadow-xl ${
                  status === 'connected' 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/50 hover:bg-rose-500/20' 
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/25 hover:brightness-110 border border-transparent'
                }`}
              >
                 {status === 'connected' ? (
                   <>
                     <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                     End Session
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:animate-bounce">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                     </svg>
                     Start Conversation
                   </>
                 )}
              </button>
              
              {status === 'error' && (
                <p className="text-rose-400 text-sm animate-pulse">
                  Connection failed. Please check your API Key.
                </p>
              )}
           </div>
        </div>

        <div className="absolute bottom-6 text-center w-full px-6">
           <p className="text-slate-500 text-sm max-w-lg mx-auto">
             "Start Conversation" to begin your English coaching session. Lingua will listen, correct, and chat with you.
           </p>
        </div>
      </div>

      {/* Right Panel - Transcript & Feedback */}
      <div className={`md:w-96 border-l border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col transition-all duration-500 ${hasStarted ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} absolute md:relative inset-y-0 right-0 z-20 w-full`}> 
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-400">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
            Live Transcript
          </h2>
          {transcripts.length > 0 && (
             <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
               {transcripts.length} turns
             </span>
          )}
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
        >
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-60">
               <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                 </svg>
               </div>
               <p className="text-sm">No conversation yet.</p>
            </div>
          ) : (
            transcripts.map((item) => (
              <div 
                key={item.id} 
                className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <span className="text-[10px] text-slate-500 mb-1 px-1">
                  {item.sender === 'user' ? 'You' : 'Lingua'}
                </span>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                    item.sender === 'user' 
                      ? 'bg-slate-800 text-slate-200 border border-slate-700' 
                      : 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30'
                  }`}
                >
                  {item.text || <span className="italic opacity-50">Listening...</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
