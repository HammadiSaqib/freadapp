import React, { useEffect, useRef } from 'react';

interface Dollar {
  x: number;
  y: number;
  z: number; // Depth for parallax/scale effect
  width: number;
  height: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  rotationAxis: 'x' | 'y' | 'z';
  opacity: number;
  flipSpeed: number;
  flip: number;
}

const FallingMoney: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const dollarsRef = useRef<Dollar[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initDollars = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      canvas.width = width;
      canvas.height = height;

      // Adjust count based on screen size
      const count = width < 768 ? 15 : 40; // Reduced count for mobile (was 40-60% less)

      dollarsRef.current = Array.from({ length: count }).map(() => createDollar(width, height));
    };

    const createDollar = (w: number, h: number, startTop = false): Dollar => {
      const sizeScale = 0.6 + Math.random() * 0.6; // Random size scale
      return {
        x: Math.random() * w,
        y: startTop ? -50 : Math.random() * h, // Distribute initially, then spawn at top
        z: Math.random(), // 0 to 1 depth
        width: 80 * sizeScale,
        height: 32 * sizeScale,
        speed: 1 + Math.random() * 2.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        rotationAxis: Math.random() > 0.5 ? 'x' : 'y', // Simple 3D-like rotation simulation
        opacity: 0.165 + Math.random() * 0.165, // 16.5-33% opacity
        flip: Math.random() * Math.PI * 2,
        flipSpeed: 0.02 + Math.random() * 0.05
      };
    };

    const update = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      dollarsRef.current.forEach((d) => {
        // Update Position
        d.y += d.speed;
        d.rotation += d.rotationSpeed;
        d.flip += d.flipSpeed;

        // Reset if out of view
        if (d.y > h + 50) {
          Object.assign(d, createDollar(w, h, true));
        }

        // Draw
        drawDollar(ctx, d);
      });

      requestRef.current = requestAnimationFrame(update);
    };

    const drawDollar = (ctx: CanvasRenderingContext2D, d: Dollar) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      
      // Simulate 3D flip using scale transformation
      const flipScale = Math.cos(d.flip);
      ctx.scale(1, flipScale); // Flip vertically to simulate falling paper rotation
      ctx.rotate(d.rotation);

      ctx.globalAlpha = d.opacity;

      // Dollar Bill Style
      // Base
      ctx.fillStyle = '#f0fdf4'; // Very light green/white
      ctx.strokeStyle = '#86efac'; // Light green border
      ctx.lineWidth = 2;
      
      // Draw rounded rect
      const r = 4; // corner radius
      ctx.beginPath();
      ctx.moveTo(-d.width/2 + r, -d.height/2);
      ctx.lineTo(d.width/2 - r, -d.height/2);
      ctx.quadraticCurveTo(d.width/2, -d.height/2, d.width/2, -d.height/2 + r);
      ctx.lineTo(d.width/2, d.height/2 - r);
      ctx.quadraticCurveTo(d.width/2, d.height/2, d.width/2 - r, d.height/2);
      ctx.lineTo(-d.width/2 + r, d.height/2);
      ctx.quadraticCurveTo(-d.width/2, d.height/2, -d.width/2, d.height/2 - r);
      ctx.lineTo(-d.width/2, -d.height/2 + r);
      ctx.quadraticCurveTo(-d.width/2, -d.height/2, -d.width/2 + r, -d.height/2);
      ctx.closePath();
      
      ctx.fill();
      ctx.stroke();

      // Inner border/detail
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#bbf7d0';
      const pad = 4;
      ctx.strokeRect(-d.width/2 + pad, -d.height/2 + pad, d.width - pad*2, d.height - pad*2);

      // Center Oval
      ctx.beginPath();
      ctx.ellipse(0, 0, d.height/2 - 2, d.height/2 - 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#dcfce7';
      ctx.fill();

      // Dollar Sign
      ctx.fillStyle = '#16a34a'; // Green text
      ctx.font = `bold ${d.height * 0.6}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);

      // Corners numbers
      ctx.font = `bold ${d.height * 0.25}px sans-serif`;
      const cornerPad = d.width * 0.4;
      const cornerY = d.height * 0.3;
      ctx.fillStyle = '#86efac';
      // Only draw if large enough to not look messy
      if (d.width > 40) {
        ctx.fillText('100', -cornerPad, -cornerY);
        ctx.fillText('100', cornerPad, cornerY);
      }

      ctx.restore();
    };

    // Init
    initDollars();
    requestRef.current = requestAnimationFrame(update);

    // Resize handler
    const handleResize = () => {
      initDollars();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.88 }} // Global slight fade
    />
  );
};

export default FallingMoney;
