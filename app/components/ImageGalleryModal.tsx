'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Maximize, ImageOff, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface GalleryImage {
  url: string;
  title?: string;
  subtitle?: string;
}

interface ImageGalleryModalProps {
  images: GalleryImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({ images, initialIndex = 0, isOpen, onClose }: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialIndex, setPrevInitialIndex] = useState(initialIndex);

  // Sync state immediately during render to avoid flashes and out-of-bounds crashes
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setPrevInitialIndex(initialIndex);
    setCurrentIndex(initialIndex);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsLoading(true);
    setHasError(false);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  } else if (isOpen && initialIndex !== prevInitialIndex) {
    setPrevInitialIndex(initialIndex);
    setCurrentIndex(initialIndex);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsLoading(true);
    setHasError(false);
  }

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleChangeImage = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) handleChangeImage(currentIndex + 1);
  }, [currentIndex, images.length, handleChangeImage]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) handleChangeImage(currentIndex - 1);
  }, [currentIndex, handleChangeImage]);

  const handleClose = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    onClose();
  }, [onClose]);

  const handleRetry = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setRetryKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.min(Math.max(1, scale + zoomDelta), 3);
    setScale(newScale);
    if (newScale <= 1) setPan({ x: 0, y: 0 });
  };

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPan({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const zoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.5, 3));
  };

  const zoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(prev => {
      const n = Math.max(prev - 0.5, 1);
      if (n === 1) setPan({ x: 0, y: 0 });
      return n;
    });
  };

  const resetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  if (!isOpen || images.length === 0) return null;

  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const currentImage = images[safeIndex];

  if (!currentImage) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.82)] backdrop-blur-[10px]"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-white/20 transition-all z-50 backdrop-blur-sm pointer-events-auto"
            title="ປິດ (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image Viewer Area */}
          <div 
            ref={containerRef}
            className="relative flex-1 w-full flex items-center justify-center p-6 overflow-hidden touch-none select-none"
            onWheel={handleWheel}
          >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex + '-' + retryKey}
                  className="relative flex items-center justify-center w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Error State */}
                  {hasError && (
                    <div className="flex flex-col items-center justify-center text-white/50">
                      <ImageOff className="w-12 h-12 mb-4 text-white/40" />
                      <p className="text-sm font-medium mb-5 text-white/60">ບໍ່ສາມາດໂຫຼດຮູບພາບໄດ້</p>
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all backdrop-blur-md"
                      >
                        <RefreshCw className="w-4 h-4" />
                        ລອງໃໝ່
                      </button>
                    </div>
                  )}

                  {/* Loading State */}
                  {!hasError && isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                  )}

                  {/* Image */}
                  {!hasError && (
                    <motion.img
                      src={currentImage.url + (retryKey > 0 ? `?retry=${retryKey}` : '')}
                      alt={currentImage.title || 'Preview'}
                      onLoad={() => setIsLoading(false)}
                      onError={() => {
                        setIsLoading(false);
                        setHasError(true);
                      }}
                      animate={{ scale: scale, x: pan.x, y: pan.y }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      onDoubleClick={toggleZoom}
                      drag={scale > 1 ? true : 'y'}
                      dragConstraints={scale > 1 ? containerRef : { top: 0, bottom: 0 }}
                      dragElastic={0.5}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={(e, info) => {
                        setTimeout(() => setIsDragging(false), 50);
                        if (scale === 1 && Math.abs(info.offset.y) > 100) {
                          handleClose();
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`w-auto h-auto max-w-[92vw] sm:max-w-[88vw] max-h-[88vh] object-contain rounded-[18px] shadow-[0_8px_40px_rgba(0,0,0,0.4)] will-change-transform ${
                        scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
                      } ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}`}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Arrows (if multiple images) */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={safeIndex === 0}
                    className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-lg disabled:opacity-0 disabled:pointer-events-none z-20"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={safeIndex === images.length - 1}
                    className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-lg disabled:opacity-0 disabled:pointer-events-none z-20"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>


          {/* Thumbnails Footer (Optional, only if multiple) */}
          {images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center items-end pointer-events-none z-10 h-32">
              <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-2 px-4 max-w-full">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChangeImage(idx)}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden shrink-0 transition-all border-2 ${
                      idx === safeIndex 
                        ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.5)] opacity-100 scale-110 mx-1' 
                        : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img src={img.url} alt="Thumbnail" className="w-full h-full object-cover bg-black/20" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
