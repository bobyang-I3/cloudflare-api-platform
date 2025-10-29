import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, X } from 'lucide-react';

interface AudioRecorderProps {
  onAudioCapture: (audioBase64: string, filename: string) => void;
  onCancel?: () => void;
}

export function AudioRecorder({ onAudioCapture, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onAudioCapture(base64Audio, `recording-${Date.now()}.wav`);
        };
        
        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Failed to access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      onAudioCapture(base64Audio, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '16px',
      padding: '24px',
      color: 'white',
      boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic size={20} />
          Audio Input
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: 'white'
            }}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Recording Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Record Button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          {isRecording ? (
            <>
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                fontFamily: 'monospace',
                letterSpacing: '2px'
              }}>
                {formatTime(recordingTime)}
              </div>
              <button
                onClick={stopRecording}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 32px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Square size={20} fill="white" />
                Stop Recording
              </button>
              <div style={{
                fontSize: '12px',
                opacity: 0.9,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                Recording in progress...
              </div>
            </>
          ) : (
            <button
              onClick={startRecording}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                color: '#667eea',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Mic size={20} />
              Start Recording
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.3)' }} />
          <span style={{ fontSize: '12px', opacity: 0.8 }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.3)' }} />
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            background: isDragging ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)',
            border: '2px dashed rgba(255, 255, 255, 0.5)',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => document.getElementById('audio-file-input')?.click()}
        >
          <Upload size={32} style={{ margin: '0 auto 12px', opacity: 0.9 }} />
          <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
            Upload Audio File
          </div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>
            Drag & drop or click to browse
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '8px' }}>
            Supports MP3, WAV, M4A, etc.
          </div>
          <input
            id="audio-file-input"
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>
      </div>

      {/* Add pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}

