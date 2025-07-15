import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiChat, generateSpeech } from './services/geminiService';
import { MicrophoneIcon, PhoneXMarkIcon } from './components/icons';

// (Keep existing type definitions)
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type Message = {
  role: 'user' | 'model';
  text: string;
};

type Status = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

export default function App() {
  const [status, setStatus] = useState<Status>('IDLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatRef = useRef<GeminiChat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    chatRef.current = new GeminiChat();
  }, []);

  const stopRecognition = useCallback(() => {
     if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    stopRecognition();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.onended = null;
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    window.speechSynthesis.cancel();
    setMessages([]);
    setStatus('IDLE');
  }, [stopRecognition]);

  const handleError = (message: string, errorObj?: any) => {
    console.error(message, errorObj);
    setError(message);
    setStatus('ERROR');
  };

  const speak = useCallback(async (text: string) => {
    stopRecognition();
    setStatus('SPEAKING');

    if (!text.trim() || !audioContextRef.current || !gainNodeRef.current) {
      if (statusRef.current === 'SPEAKING') {
        setStatus('CONNECTED');
      }
      if (!audioContextRef.current) {
        console.warn('AudioContext not initialized. Cannot play audio.');
      }
      return;
    }

    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;

    try {
      const audioBase64 = await generateSpeech(text);
      
      const binaryString = window.atob(audioBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      sourceNodeRef.current = source;
      
      gainNode.gain.value = 4.0; // 200% volume
      
      source.connect(gainNode);
      
      source.onended = () => {
        sourceNodeRef.current = null;
        if (statusRef.current === 'SPEAKING') {
          setStatus('CONNECTED');
        }
      };

      source.start(0);
    } catch (err) {
      handleError('음성 생성 또는 재생 오류', err);
      if (statusRef.current === 'SPEAKING') {
        setStatus('CONNECTED');
      }
    }
  }, [stopRecognition]);

  const processUserMessage = useCallback(async (text: string) => {
    if (!chatRef.current) return;

    setStatus('THINKING');
    const newMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(newMessages);

    let imageBase64: string | undefined;
    if (messages.length === 0 || text.includes('이거') || text.includes('음식')) {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];
        }
      }
    }
    
    try {
      const stream = await chatRef.current.sendMessageStream(text, imageBase64);
      let fullResponse = '';
      for await (const chunk of stream) {
        fullResponse += chunk;
      }
      setMessages(prev => [...prev, { role: 'model', text: fullResponse }]);
      await speak(fullResponse);
    } catch (err) {
      handleError('AI와 대화 중 오류가 발생했습니다.', err);
    }
  }, [messages, speak]);

  const startListening = useCallback(() => {
    if (!streamRef.current) return;
    
    stopRecognition();
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return handleError('이 브라우저에서는 음성 인식이 지원되지 않습니다.');
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        processUserMessage(transcript);
      }
    };
    
    recognition.onend = () => {
      if (statusRef.current === 'LISTENING') {
        setStatus('CONNECTED');
      }
    };
    
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        handleError(`음성 인식 오류: ${event.error}`, event);
      } else {
        setStatus('CONNECTED');
      }
    };

    recognition.start();
    setStatus('LISTENING');
  }, [stopRecognition, processUserMessage]);

  const startCall = useCallback(async () => {
    setStatus('CONNECTING');
    setError(null);

    if (!audioContextRef.current) {
      try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;
        const gainNode = context.createGain();
        gainNode.connect(context.destination);
        gainNodeRef.current = gainNode;
      } catch (e) {
        handleError('AudioContext를 초기화할 수 없습니다.', e);
        return;
      }
    }


    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: true 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('CONNECTED');
    } catch (err) {
      handleError('미디어 장치를 시작할 수 없습니다.', err);
    }
  }, []);

  const handleToggleCall = () => {
    if (status === 'IDLE' || status === 'ERROR') {
      startCall();
    } else if (status === 'CONNECTED') {
      startListening();
    } else {
      stopAll();
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'IDLE': return '통화 버튼을 눌러 시작하세요';
      case 'CONNECTING': return '연결 중...';
      case 'CONNECTED': return '탭하여 말하기';
      case 'LISTENING': return '듣고 있어요...';
      case 'THINKING': return '생각 중...';
      case 'SPEAKING': return '응답 중...';
      case 'ERROR': return `오류: ${error || '알 수 없는 문제'}`;
      default: return '';
    }
  }

  return (
    <div className="relative w-screen h-screen bg-black font-sans text-white overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50 z-10" />

        <main className="relative z-20 flex flex-col h-full p-6 justify-between">
            <header className="text-center">
                <h1 className="text-2xl font-bold text-white/90 drop-shadow-lg">{getStatusText()}</h1>
                {status === 'LISTENING' && <div className="w-3 h-3 mx-auto mt-2 bg-sky-500 rounded-full animate-pulse"></div>}
            </header>

            <footer className="flex flex-col items-center">
                <button
                    onClick={handleToggleCall}
                    className={`
                        w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-2xl transform active:scale-95 focus:outline-none focus:ring-4
                        ${status === 'IDLE' || status === 'ERROR'
                            ? 'bg-green-500 hover:bg-green-600 focus:ring-green-300/50' // Start Call
                            : (status === 'THINKING' || status === 'SPEAKING')
                            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300/50' // Inactive/End Call
                            : status === 'LISTENING'
                            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300/50' // Listening (show end call)
                            : 'bg-sky-500 hover:bg-sky-600 focus:ring-sky-300/50' // Tap to Speak
                        }
                    `}
                    aria-label={status === 'IDLE' || status === 'ERROR' ? 'Start call' : 'End call'}
                    disabled={status === 'CONNECTING' || status === 'THINKING' || status === 'SPEAKING'}
                >
                    {status === 'IDLE' || status === 'ERROR' || status === 'CONNECTED' ? (
                        <MicrophoneIcon className="w-10 h-10 text-white" />
                    ) : (
                        <PhoneXMarkIcon className="w-10 h-10 text-white" />
                    )}
                </button>
            </footer>
        </main>
    </div>
  );
}
