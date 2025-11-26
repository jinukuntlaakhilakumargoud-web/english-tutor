export interface TranscriptItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: Date;
  isComplete: boolean;
}

export interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
