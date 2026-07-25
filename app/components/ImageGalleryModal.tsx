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

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPan({ x: 0, y: 0 });
      setIsLoading(true);
      setHasError(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialIndex]);

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

  const currentImage = images[currentIndex];

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4 sm:p-6"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-[1000px] max-h-[90vh] bg-white rounded-[20px] shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <h2 className="text-[15px] font-bold text-slate-800">
              {currentImage.title || 'ເບິ່ງຮູບພາບ'}
            </h2>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="ປິດ (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="relative flex-1 flex flex-col bg-white overflow-hidden min-h-[300px]">
            {/* Image Viewer Area */}
            <div 
              ref={containerRef}
              className="relative flex-1 flex items-center justify-center p-6 overflow-hidden touch-none select-none"
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
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ImageOff className="w-10 h-10 mb-3 text-slate-300" />
                      <p className="text-sm font-medium mb-4 text-slate-500">ບໍ່ສາມາດໂຫຼດຮູບພາບໄດ້</p>
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        ລອງໃໝ່
                      </button>
                    </div>
                  )}

                  {/* Loading State */}
                  {!hasError && isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                      <div className="w-8 h-8 border-3 border-slate-200 border-t-teal-500 rounded-full animate-spin"></div>
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
                      drag={scale > 1}
                      dragConstraints={containerRef}
                      dragElastic={0.1}
                      onDragStart={() => setIsDragging(true)}
                      onDragEnd={() => setTimeout(() => setIsDragging(false), 50)}
                      className={`max-w-full max-h-full object-contain will-change-transform ${
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
                    disabled={currentIndex === 0}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-full flex items-center justify-center transition-all shadow-sm disabled:opacity-0 disabled:pointer-events-none z-20"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === images.length - 1}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 rounded-full flex items-center justify-center transition-all shadow-sm disabled:opacity-0 disabled:pointer-events-none z-20"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Subtle Zoom Controls Toolbar (Only visible when image is loaded and not error) */}
            {!hasError && !isLoading && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur border border-slate-200 shadow-sm rounded-full p-1 z-20 pointer-events-auto">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  title="ຫຍໍ້ເຂົ້າ"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-semibold text-slate-500 w-10 text-center select-none pointer-events-none">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  title="ຂະຫຍາຍອອກ"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                <button
                  onClick={resetZoom}
                  disabled={scale === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  title="ຂະໜາດເດີມ"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Thumbnails Footer (Optional, only if multiple) */}
          {images.length > 1 && (
            <div className="border-t border-slate-100 bg-slate-50/50 p-3 shrink-0">
              <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChangeImage(idx)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all border-2 ${
                      idx === currentIndex 
                        ? 'border-teal-500 shadow-sm opacity-100' 
                        : 'border-transparent opacity-60 hover:opacity-100 hover:border-slate-300'
                    }`}
                  >
                    <img src={img.url} alt="Thumbnail" className="w-full h-full object-cover bg-white" />
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
