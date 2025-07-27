import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const Icon = type === 'success' ? CheckCircle : XCircle;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-right duration-300">
      <div className={`${bgColor} text-white px-6 py-4 rounded-2xl shadow-lg flex items-center max-w-md`}>
        <Icon className="w-6 h-6 mr-3 flex-shrink-0" />
        <span className="text-lg font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-3 p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};