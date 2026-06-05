import React, { useEffect, useRef } from 'react';

interface Shape {
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
  shapeType: number;
}

const FallingShapes: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const shapesRef = useRef<Shape[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initShapes = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      canvas.width = width;
      canvas.height = height;

      const count = width < 768 ? 20 : 50;

      shapesRef.current = Array.from({ length: count }).map(() => createShape(width, height));
    };

    const createShape = (w: number, h: number, startTop = false): Shape => {
      const sizeScale = 0.5 + Math.random() * 0.7;
      const shapeType = Math.floor(Math.random() * 3); // 0: rect, 1: circle, 2: rounded rect
      let width, height;

      if (shapeType === 1) { // Circle
        width = height = (15 + Math.random() * 20) * sizeScale;
      } else { // Rectangles
        width = (20 + Math.random() * 30) * sizeScale;
        height = (20 + Math.random() * 30) * sizeScale;
      }
      
      return {
        x: Math.random() * w,
        y: startTop ? -50 : Math.random() * h,
        z: Math.random(),
        width: width,
        height: height,
        speed: 0.5 + Math.random() * 1.5,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.015,
        rotationAxis: Math.random() > 0.5 ? 'x' : 'y',
        opacity: 0.1 + Math.random() * 0.4,
        flip: Math.random() * Math.PI * 2,
        flipSpeed: 0.01 + Math.random() * 0.03,
        shapeType: shapeType,
      };
    };

    const update = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      shapesRef.current.forEach((s) => {
        s.y += s.speed;
        s.rotation += s.rotationSpeed;
        s.flip += s.flipSpeed;

        if (s.y > h + 50) {
          Object.assign(s, createShape(w, h, true));
        }

        drawShape(ctx, s);
      });

      requestRef.current = requestAnimationFrame(update);
    };

    const drawShape = (ctx: CanvasRenderingContext2D, d: Shape) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      
      const flipScale = Math.cos(d.flip);
      ctx.scale(1, flipScale);
      ctx.rotate(d.rotation);

      ctx.globalAlpha = d.opacity;

      const gradients = [
        ['#14b8a6', '#0d9488'], // Teal
        ['#10b981', '#059669'], // Emerald
        ['#6366f1', '#4f46e5'], // Indigo
      ];
      const [color1, color2] = gradients[d.shapeType % gradients.length];
      
      const gradient = ctx.createLinearGradient(-d.width / 2, -d.height / 2, d.width / 2, d.height / 2);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);

      ctx.fillStyle = gradient;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      switch (d.shapeType) {
        case 0: // Rounded Rectangle
          const r = 4;
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
          break;
        case 1: // Circle
          ctx.beginPath();
          ctx.arc(0, 0, d.width / 2, 0, Math.PI * 2);
          break;
        case 2: // Simple Rectangle
        default:
          ctx.beginPath();
          ctx.rect(-d.width / 2, -d.height / 2, d.width, d.height);
          break;
      }
      
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    };

    initShapes();
    requestRef.current = requestAnimationFrame(update);

    const handleResize = () => {
      initShapes();
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
      style={{ opacity: 0.5 }}
    />
  );
};

export default FallingShapes;
