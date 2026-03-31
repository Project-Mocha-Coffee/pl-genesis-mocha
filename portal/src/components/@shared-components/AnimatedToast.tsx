import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface AnimatedToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  title?: string;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-gradient-to-r from-emerald-500 to-green-600',
    textColor: 'text-white',
    borderColor: 'border-emerald-400',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-gradient-to-r from-red-500 to-rose-600',
    textColor: 'text-white',
    borderColor: 'border-red-400',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-gradient-to-r from-amber-500 to-orange-600',
    textColor: 'text-white',
    borderColor: 'border-amber-400',
  },
  info: {
    icon: Info,
    bgColor: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    textColor: 'text-white',
    borderColor: 'border-blue-400',
  },
};

export function AnimatedToast({ message, type, duration = 5000, onClose, title }: AnimatedToastProps) {
  const [progress, setProgress] = useState(100);
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (100 / (duration / 100));
        if (next <= 0) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`
        fixed top-20 right-4 z-[9999] max-w-md min-w-[320px]
        ${config.bgColor} ${config.textColor}
        rounded-xl shadow-2xl border-2 ${config.borderColor}
        backdrop-blur-sm overflow-hidden
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 2 }}
          >
            <Icon className="w-6 h-6 flex-shrink-0" />
          </motion.div>
          <div className="flex-1">
            {title && (
              <motion.h4 
                className="font-bold mb-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h4>
            )}
            <motion.p 
              className="text-sm"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              {message}
            </motion.p>
          </div>
          <motion.button
            onClick={onClose}
            className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-white/20">
        <motion.div
          className="h-full bg-white/80"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}

// Toast Manager Hook
export function useAnimatedToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: ToastType; title?: string }>>([]);

  const showToast = (message: string, type: ToastType, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, title }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <AnimatePresence>
      {toasts.map((toast, index) => (
        <motion.div
          key={toast.id}
          style={{ top: `${80 + index * 100}px` }}
          className="fixed right-4 z-[9999]"
        >
          <AnimatedToast
            message={toast.message}
            type={toast.type}
            title={toast.title}
            onClose={() => removeToast(toast.id)}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );

  return { showToast, ToastContainer };
}

