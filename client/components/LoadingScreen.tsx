import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message = "Loading Score Machine..." }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) return 100;
        const diff = Math.random() * 15;
        return Math.min(oldProgress + diff, 100);
      });
    }, 200);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center space-y-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="relative flex items-center justify-center"
        >
          {/* Glow effect behind logo */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-primary/20 blur-3xl rounded-full w-40 h-40"
          />
          
          <img
            src="/image.png"
            alt="Score Machine Logo"
            className="w-32 h-32 md:w-40 md:h-40 object-contain relative z-10"
          />
        </motion.div>

        <div className="flex flex-col items-center space-y-4">
          <div className="w-64 h-2 bg-secondary/50 overflow-hidden rounded-full backdrop-blur-sm">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-medium text-muted-foreground animate-pulse"
          >
            {message}
          </motion.p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
