import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type MiniTimerWindowProps = React.PropsWithChildren<{
  width?: number;
  height?: number;
  windowName?: string;
  features?: string;
  onClose?: () => void;
  onBlocked?: () => void;
}>;

const DEFAULT_WIDTH = 360;
const DEFAULT_HEIGHT = 520;
const DEFAULT_FEATURES =
  'toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=yes,noopener=yes';

const MiniTimerWindow: React.FC<MiniTimerWindowProps> = ({
  children,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  windowName = 'mini-timer',
  features,
  onClose,
  onBlocked
}) => {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const styleObserverRef = useRef<MutationObserver | null>(null);
  const onCloseRef = useRef(onClose);
  const onBlockedRef = useRef(onBlocked);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onBlockedRef.current = onBlocked;
  }, [onBlocked]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      onBlockedRef.current?.();
      setContainerEl(null);
      return () => undefined;
    }

    const screenLeft = window.screenLeft ?? window.screenX ?? 0;
    const screenTop = window.screenTop ?? window.screenY ?? 0;
    const viewportWidth =
      window.innerWidth ?? document.documentElement.clientWidth ?? window.screen.width;
    const viewportHeight =
      window.innerHeight ?? document.documentElement.clientHeight ?? window.screen.height;

    const left = Math.max(0, screenLeft + viewportWidth - width - 24);
    const top = Math.max(0, screenTop + Math.max(0, viewportHeight - height) / 2);

    const windowFeatures =
      features ||
      `${DEFAULT_FEATURES},width=${Math.round(width)},height=${Math.round(
        height
      )},left=${Math.round(left)},top=${Math.round(top)}`;

    const popup = window.open('', windowName, windowFeatures);

    if (!popup) {
      onBlockedRef.current?.();
      setContainerEl(null);
      return () => undefined;
    }

    let cancelled = false;
    const extDoc = popup.document;

    const cloneNodeIntoHead = (node: HTMLLinkElement | HTMLStyleElement) => {
      const clone = node.cloneNode(true) as HTMLLinkElement | HTMLStyleElement;
      extDoc.head?.appendChild(clone);
    };

    const syncStyleSheets = () => {
      if (!document.head || !extDoc.head) return;

      const styleNodes = document.head.querySelectorAll<
        HTMLLinkElement | HTMLStyleElement
      >('link[rel="stylesheet"], style');

      styleNodes.forEach((node) => cloneNodeIntoHead(node));

      if (styleObserverRef.current) {
        styleObserverRef.current.disconnect();
      }

      styleObserverRef.current = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((added) => {
            if (
              added instanceof HTMLLinkElement &&
              added.rel === 'stylesheet'
            ) {
              cloneNodeIntoHead(added);
            } else if (added instanceof HTMLStyleElement) {
              cloneNodeIntoHead(added);
            }
          });
        });
      });

      styleObserverRef.current.observe(document.head, {
        childList: true
      });
    };

    const mirrorBodyState = () => {
      if (extDoc.body && document.body) {
        extDoc.body.className = document.body.className;
        Object.keys(document.body.dataset).forEach((key) => {
          const value = document.body.dataset[key as keyof DOMStringMap];
          if (typeof value === 'string') {
            extDoc.body.dataset[key as keyof DOMStringMap] = value;
          }
        });
      }

      if (extDoc.documentElement && document.documentElement) {
        extDoc.documentElement.className = document.documentElement.className;
        Object.keys(document.documentElement.dataset).forEach((key) => {
          const value = document.documentElement.dataset[key as keyof DOMStringMap];
          if (typeof value === 'string') {
            extDoc.documentElement.dataset[key as keyof DOMStringMap] = value;
          }
        });
      }
    };

    const mountContainer = () => {
      if (cancelled) return;
      if (!extDoc.body) return;

      const portalHost = extDoc.createElement('div');
      portalHost.className = 'mini-timer-window-root';
      extDoc.body.innerHTML = '';
      extDoc.body.appendChild(portalHost);
      extDoc.body.style.margin = '0';
      extDoc.body.style.backgroundColor = 'transparent';

      extDoc.title = document.title;

      mirrorBodyState();
      syncStyleSheets();

      setContainerEl(portalHost);
      popup.focus();
    };

    const handleDomReady = () => {
      mountContainer();
    };

    if (extDoc.readyState === 'complete') {
      mountContainer();
    } else {
      extDoc.addEventListener('DOMContentLoaded', handleDomReady, { once: true });
    }

    const handleBeforeUnload = () => {
      if (styleObserverRef.current) {
        styleObserverRef.current.disconnect();
        styleObserverRef.current = null;
      }
      setContainerEl(null);
      onCloseRef.current?.();
    };

    const handleParentUnload = () => {
      if (!popup.closed) {
        popup.close();
      }
    };

    popup.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('beforeunload', handleParentUnload);

    return () => {
      cancelled = true;
      extDoc.removeEventListener('DOMContentLoaded', handleDomReady);
      popup.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('beforeunload', handleParentUnload);
      if (styleObserverRef.current) {
        styleObserverRef.current.disconnect();
        styleObserverRef.current = null;
      }
      setContainerEl(null);
      if (!popup.closed) {
        popup.close();
      }
    };
  }, [features, height, width, windowName]);

  if (!containerEl) {
    return null;
  }

  return createPortal(children, containerEl);
};

export type { MiniTimerWindowProps };
export default MiniTimerWindow;
