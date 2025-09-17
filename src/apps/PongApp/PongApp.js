import React, { useMemo } from 'react';
import './PongApp.css';

const PongApp = () => {
  const src = useMemo(() => {
    const base = process.env.PUBLIC_URL || '';
    return `${base}/html/pong.html`;
  }, []);

  return (
    <div className="pong-app-shell">
      <iframe
        className="pong-iframe"
        title="Neon Pong"
        src={src}
        loading="lazy"
        allow="gamepad"
      />
      <p className="pong-note">
        Tip: Use the keyboard controls listed inside the game window. Toggle between solo and versus modes with the
        number keys.
      </p>
    </div>
  );
};

export default PongApp;
