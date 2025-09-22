import { useCallback, useEffect, useRef } from 'react';

const createBuffer = (ctx, duration, generator) => {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    const time = i / ctx.sampleRate;
    data[i] = generator(time);
  }
  return buffer;
};

const clamp = (value) => Math.max(-1, Math.min(1, value));

const createMeowBuffer = (ctx) => (
  createBuffer(ctx, 0.5, (time) => {
    const envelope = Math.exp(-3 * time) * (1 + 0.4 * Math.sin(2 * Math.PI * 5 * time));
    const pitch = 280 + 80 * Math.sin(2 * Math.PI * 3 * time);
    const vibrato = Math.sin(2 * Math.PI * pitch * time + Math.sin(2 * Math.PI * 12 * time));
    return clamp(envelope * vibrato * 0.7);
  })
);

const createPurrBuffer = (ctx) => (
  createBuffer(ctx, 1.1, (time) => {
    const envelope = Math.exp(-1.2 * time) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 8 * time));
    const rumble = Math.sin(2 * Math.PI * 38 * time);
    const overtones = 0.4 * Math.sin(2 * Math.PI * 76 * time + 0.5);
    return clamp((rumble + overtones) * envelope * 0.6);
  })
);

const resumeContext = async (ctx) => {
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      // ignore resume failure
    }
  }
};

const useCatAudio = (muted) => {
  const contextRef = useRef(null);
  const meowBufferRef = useRef(null);
  const purrBufferRef = useRef(null);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return undefined;
    }

    const context = new AudioContextClass();
    contextRef.current = context;
    meowBufferRef.current = createMeowBuffer(context);
    purrBufferRef.current = createPurrBuffer(context);

    return () => {
      if (context && typeof context.close === 'function') {
        context.close();
      }
    };
  }, []);

  const playBuffer = useCallback((bufferRef) => {
    const context = contextRef.current;
    const buffer = bufferRef.current;
    if (!context || !buffer || muted) {
      return;
    }
    resumeContext(context).then(() => {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
    });
  }, [muted]);

  const playMeow = useCallback(() => {
    playBuffer(meowBufferRef);
  }, [playBuffer]);

  const playPurr = useCallback(() => {
    playBuffer(purrBufferRef);
  }, [playBuffer]);

  return { playMeow, playPurr };
};

export default useCatAudio;
