import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  headerBottom?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  width?: string;
  bodyClassName?: string;
  className?: string;
}

export function BaseModal({
  isOpen,
  onClose,
  title,
  icon,
  headerRight,
  headerBottom,
  footer,
  children,
  maxWidth = 'max-w-2xl',
  maxHeight = 'max-h-[85vh]',
  width = 'w-full',
  bodyClassName = 'p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/50',
  className = '',
}: BaseModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`bg-white dark:bg-slate-900 rounded-[24px] sm:rounded-[30px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 dark:border-white/10 flex flex-col overflow-hidden ${width} ${maxWidth} ${maxHeight} ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || icon || headerRight || headerBottom) && (
              <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 shrink-0">
                {(title || icon || headerRight) && (
                  <div className="flex items-center justify-between px-5 pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      {icon && (
                        <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-teal-500 dark:text-teal-400 shrink-0">
                          {icon}
                        </div>
                      )}
                      <div>
                        {typeof title === 'string' ? (
                          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                            {title}
                          </h3>
                        ) : (
                          title
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {headerRight}
                      <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
                {headerBottom && (
                  <div className="px-5 pb-4">
                    {headerBottom}
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Body */}
            <div className={`flex-1 overflow-auto ${bodyClassName}`}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
