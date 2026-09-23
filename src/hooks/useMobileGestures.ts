import { useRef, useCallback, useState } from 'react';

interface GestureHandlers {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export function useMobileGestures(handlers: GestureHandlers) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const longPressTimerRef = useRef<any>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);
  const [gestureNotice, setGestureNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<any>(null);

  const showNotice = useCallback((text: string) => {
    setGestureNotice(text);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => {
      setGestureNotice(null);
    }, 1400);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
      touchStartRef.current = {
        x: point.clientX,
        y: point.clientY,
        time: Date.now(),
      };
      isLongPressTriggeredRef.current = false;

      // Start long-press timer (600ms)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (handlers.onLongPress) {
          handlers.onLongPress();
          showNotice('Tahan: Mode Tekan-untuk-Bicara');
        }
      }, 600);
    },
    [handlers, showNotice]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartRef.current) return;
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    const dx = point.clientX - touchStartRef.current.x;
    const dy = point.clientY - touchStartRef.current.y;

    // If moved more than 15px, cancel long-press
    if (Math.hypot(dx, dy) > 15) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isLongPressTriggeredRef.current) {
        touchStartRef.current = null;
        return;
      }

      if (!touchStartRef.current) return;

      const point =
        'changedTouches' in e
          ? (e as React.TouchEvent).changedTouches[0]
          : (e as React.MouseEvent);
      const dx = point.clientX - touchStartRef.current.x;
      const dy = point.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      const distance = Math.hypot(dx, dy);

      touchStartRef.current = null;

      // Minimum swipe threshold: 45px in < 500ms
      if (distance > 45 && dt < 600) {
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absY > absX) {
          // Vertical swipe
          if (dy < 0) {
            handlers.onSwipeUp?.();
            showNotice('Geser Atas: Tambah Kecepatan Suara');
          } else {
            handlers.onSwipeDown?.();
            showNotice('Geser Bawah: Kurangi Kecepatan Suara');
          }
        } else {
          // Horizontal swipe
          if (dx < 0) {
            handlers.onSwipeLeft?.();
            showNotice('Geser Kiri: Ganti Format Audio');
          } else {
            handlers.onSwipeRight?.();
            showNotice('Geser Kanan: Ganti Format Audio');
          }
        }
        return;
      }

      // Tap / Double Tap detection
      if (distance < 15 && dt < 400) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 320) {
          // Double Tap
          lastTapTimeRef.current = 0;
          handlers.onDoubleTap?.();
          showNotice('Ketuk 2x: Ulangi Jawaban Suara');
        } else {
          // Single Tap
          lastTapTimeRef.current = now;
          handlers.onTap?.();
        }
      }
    },
    [handlers, showNotice]
  );

  return {
    gestureProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleTouchStart,
      onMouseMove: handleTouchMove,
      onMouseUp: handleTouchEnd,
    },
    gestureNotice,
  };
}
