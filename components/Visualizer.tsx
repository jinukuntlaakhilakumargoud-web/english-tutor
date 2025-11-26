import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const barsRef = useRef<number[]>([0, 0, 0, 0, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Update bars based on volume
      const targetHeight = isActive ? Math.max(10, volume * 100) : 5;
      
      barsRef.current = barsRef.current.map((current, i) => {
        // Create a wave effect by varying sensitivity
        const sensitivity = 1 + (Math.abs(2 - i) * 0.5); 
        const t = targetHeight * sensitivity * (0.8 + Math.random() * 0.4);
        return current + (t - current) * 0.2; // Smooth transition
      });

      ctx.fillStyle = isActive ? '#38bdf8' : '#475569'; // Sky 400 or Slate 600
      
      barsRef.current.forEach((h, i) => {
        const x = centerX - 40 + (i * 20);
        const radius = 6;
        
        ctx.beginPath();
        ctx.roundRect(x - 3, centerY - h / 2, 6, h, radius);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={200} 
      height={120} 
      className="w-full max-w-[200px] h-[120px]"
    />
  );
};

export default Visualizer;
