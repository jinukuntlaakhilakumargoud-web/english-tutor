import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptItem, ConnectionState } from '../types';
import { getAudioContexts, createPcmBlob, decodeAudioData, base64ToBytes } from '../utils/audio';

const SYSTEM_INSTRUCTION = `You are an expert English communication coach named "Lingua". 
Your goal is to have a natural, friendly conversation with the user to help them improve their English skills.
Key Responsibilities:
1. Engage in casual conversation (hobbies, work, life) to make the user comfortable.
2. Actively listen for grammatical errors, awkward phrasing, or vocabulary misuse.
3. When a mistake is made, gently interrupt or wait for a pause to provide a brief correction and explanation.
4. Suggest better idioms or vocabulary where appropriate.
5. Keep your responses concise and encouraging. 
6. Do not lecture; correct and continue.
7. Use a supportive and warm tone.`;

export function useLiveSession() {
  const [status, setStatus] = useState<ConnectionState>('disconnected');
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [volume, setVolume] = useState<number>(0); // 0-1 range for visualizer
  
  // Audio Context refs
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // Session refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentInputTransRef = useRef<string>('');
  const currentOutputTransRef = useRef<string>('');
  
  const disconnect = useCallback(() => {
    if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => {
             // Try to close if method exists, otherwise just nullify
             try { session.close(); } catch (e) { console.warn("Session close error", e) }
        });
    }
    sessionPromiseRef.current = null;
    
    // Stop audio
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    
    // Do NOT close AudioContexts as they can be reused
    setStatus('disconnected');
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.API_KEY) {
      console.error("API Key not found");
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { inputAudioContext, outputAudioContext } = getAudioContexts();
      
      if (!inputAudioContext || !outputAudioContext) throw new Error("Audio Context init failed");

      // Resume contexts if suspended (browser policy)
      if (inputAudioContext.state === 'suspended') await inputAudioContext.resume();
      if (outputAudioContext.state === 'suspended') await outputAudioContext.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Input Audio Pipeline
      const inputSource = inputAudioContext.createMediaStreamSource(stream);
      inputSourceRef.current = inputSource;
      
      const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        const rms = Math.sqrt(sum / inputData.length);
        setVolume(prev => Math.max(rms * 5, prev * 0.9)); // Smoothing

        const pcmBlob = createPcmBlob(inputData);
        
        // Send to model
        if (sessionPromiseRef.current) {
          sessionPromiseRef.current.then(session => {
            session.sendRealtimeInput({ media: pcmBlob });
          }).catch(err => console.error("Send Error:", err));
        }
      };

      inputSource.connect(processor);
      processor.connect(inputAudioContext.destination);

      // Connect to Gemini
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log("Session Opened");
            setStatus('connected');
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Text Transcription
             if (message.serverContent?.outputTranscription) {
               currentOutputTransRef.current += message.serverContent.outputTranscription.text;
               // Update live draft for model
               setTranscripts(prev => {
                   const newTrans = [...prev];
                   const last = newTrans[newTrans.length - 1];
                   if (last && last.sender === 'model' && !last.isComplete) {
                       last.text = currentOutputTransRef.current;
                       return newTrans;
                   } else {
                       return [...newTrans, {
                           id: Date.now().toString(),
                           sender: 'model',
                           text: currentOutputTransRef.current,
                           timestamp: new Date(),
                           isComplete: false
                       }];
                   }
               });
             }
             
             if (message.serverContent?.inputTranscription) {
                 currentInputTransRef.current += message.serverContent.inputTranscription.text;
                 // Update live draft for user
                 setTranscripts(prev => {
                   const newTrans = [...prev];
                   const last = newTrans[newTrans.length - 1];
                   if (last && last.sender === 'user' && !last.isComplete) {
                       last.text = currentInputTransRef.current;
                       return newTrans;
                   } else {
                       return [...newTrans, {
                           id: Date.now().toString(),
                           sender: 'user',
                           text: currentInputTransRef.current,
                           timestamp: new Date(),
                           isComplete: false
                       }];
                   }
               });
             }

             if (message.serverContent?.turnComplete) {
                 // Finalize turns
                 setTranscripts(prev => prev.map(t => 
                     !t.isComplete ? { ...t, isComplete: true } : t
                 ));
                 currentInputTransRef.current = '';
                 currentOutputTransRef.current = '';
             }

             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
                 const ctx = outputAudioContext;
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 
                 const audioBuffer = await decodeAudioData(
                     base64ToBytes(base64Audio),
                     ctx
                 );
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 const gainNode = ctx.createGain();
                 gainNode.gain.value = 1.0;
                 source.connect(gainNode);
                 gainNode.connect(ctx.destination);
                 
                 source.onended = () => {
                     sourcesRef.current.delete(source);
                 };
                 
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 sourcesRef.current.add(source);
             }
             
             // Handle Interruption
             if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
                 currentOutputTransRef.current = ''; // Clear pending text on interruption
             }
          },
          onclose: () => {
              console.log("Session Closed");
              setStatus('disconnected');
          },
          onerror: (err) => {
              console.error("Session Error", err);
              setStatus('error');
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: SYSTEM_INSTRUCTION,
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {}
        }
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus('error');
    }
  }, []);

  return {
    connect,
    disconnect,
    status,
    transcripts,
    volume
  };
}