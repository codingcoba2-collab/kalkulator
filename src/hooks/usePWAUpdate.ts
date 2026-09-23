import { useState, useEffect, useCallback } from 'react';

export const APP_VERSION = 'v1.2.0';

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string>('');
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Monitor service worker registration & update events
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    // When service worker takes over, reload to apply new assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const checkRegistration = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              }
            });
          }
        });
      } catch (e) {
        console.warn('SW registration check note:', e);
      }
    };

    checkRegistration();

    // Periodic check every 2 minutes
    const interval = setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // Manual Check for Updates
  const checkForUpdate = useCallback(async () => {
    setIsChecking(true);
    setLastCheckMessage('Memeriksa versi terbaru...');

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setTimeout(() => {
        setIsChecking(false);
        setLastCheckMessage('Aplikasi sudah dalam versi terbaru.');
      }, 700);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
          setLastCheckMessage('Versi baru ditemukan! Siap diperbarui.');
        } else {
          setLastCheckMessage('Aplikasi sudah dalam versi terbaru.');
        }
      } else {
        setLastCheckMessage('Aplikasi sudah dalam versi terbaru.');
      }
    } catch {
      setLastCheckMessage('Pemeriksaan selesai. Versi saat ini aktif.');
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 600);
    }
  }, []);

  // Apply update seamlessly without needing to uninstall!
  const applyUpdateWithoutUninstall = useCallback(async () => {
    setIsChecking(true);
    setLastCheckMessage('Menerapkan pembaruan instan...');

    try {
      // 1. Tell waiting service worker to skip waiting
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Clear old caches safely
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((name) => {
            // Keep active precache, remove stale
            if (name.includes('old') || name.includes('temp')) {
              return caches.delete(name);
            }
            return Promise.resolve(true);
          })
        );
      }

      // 3. Update registrations
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          await reg.update().catch(() => {});
        }
      }

      // 4. Force reload cleanly without uninstalling
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (e) {
      console.warn('Update apply notice:', e);
      window.location.reload();
    }
  }, [waitingWorker]);

  return {
    updateAvailable,
    isChecking,
    lastCheckMessage,
    version: APP_VERSION,
    checkForUpdate,
    applyUpdateWithoutUninstall,
  };
}
