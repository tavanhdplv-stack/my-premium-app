'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
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
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset state when opening or changing images
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setPan({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, initialIndex]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [currentIndex, images.length]);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [currentIndex]);

  const handleClose = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    onClose();
  }, [onClose]);

  // Keyboard navigation
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

  // Wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(1, prev + zoomDelta), 4));
    if (scale + zoomDelta <= 1) {
      setPan({ x: 0, y: 0 });
    }
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

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md select-none"
        onClick={handleClose}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 md:top-8 md:right-8 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white transition-all shadow-lg z-50 group border border-white/10"
        >
          <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="absolute left-4 md:left-10 w-12 h-12 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-50 disabled:opacity-0 disabled:pointer-events-none group border border-white/10"
            >
              <ChevronLeft className="w-8 h-8 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === images.length - 1}
              className="absolute right-4 md:right-10 w-12 h-12 bg-black/20 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all z-50 disabled:opacity-0 disabled:pointer-events-none group border border-white/10"
            >
              <ChevronRight className="w-8 h-8 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </>
        )}

        {/* Main Image Container */}
        <motion.div
          className="relative w-full max-w-[1200px] h-full max-h-[100dvh] md:max-h-[90vh] flex flex-col items-center justify-center px-4 py-16 md:py-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            ref={containerRef}
            className="relative w-full flex-1 flex items-center justify-center overflow-hidden rounded-[20px] md:rounded-[32px] group touch-none"
            onWheel={handleWheel}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                ref={imageRef}
                src={currentImage.url}
                alt={currentImage.title || 'Gallery Image'}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: scale, x: pan.x, y: pan.y }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onDoubleClick={toggleZoom}
                drag={scale > 1}
                dragConstraints={containerRef}
                dragElastic={0.1}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setTimeout(() => setIsDragging(false), 50)}
                className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing will-change-transform"
                style={{ 
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))'
                }}
              />
            </AnimatePresence>

            {/* Bottom Info Overlay */}
            {(currentImage.title || images.length > 1) && (
              <div className="absolute bottom-0 inset-x-0 p-6 md:p-8 pt-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none transition-opacity duration-300">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
                  <div className="flex-1">
                    {currentImage.title && (
                      <h3 className="text-white text-lg md:text-xl font-bold line-clamp-2 leading-tight shadow-black/50 drop-shadow-md">
                        {currentImage.title}
                      </h3>
                    )}
                    {currentImage.subtitle && (
                      <p className="text-white/80 text-sm md:text-base mt-1 drop-shadow-md">
                        {currentImage.subtitle}
                      </p>
                    )}
                  </div>
                  {images.length > 1 && (
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs md:text-sm font-semibold shrink-0 shadow-lg border border-white/10">
                      {currentIndex + 1} / {images.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="mt-4 md:mt-6 max-w-full overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center justify-center gap-2 md:gap-3 px-2 min-w-min mx-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setScale(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-14 h-14 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 transition-all duration-200 border-2 ${
                      idx === currentIndex 
                        ? 'border-teal-400 scale-110 shadow-[0_0_15px_rgba(45,212,191,0.4)] z-10' 
                        : 'border-white/10 opacity-50 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img src={img.url} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // Avoid hydration issues by checking if document is defined
  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
