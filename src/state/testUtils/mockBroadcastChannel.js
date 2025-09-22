class MockBroadcastChannel {
  static channels = new Map();

  constructor(name) {
    this.name = name;
    this.listeners = new Set();
    this.onmessage = null;
    this.closed = false;

    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }

    MockBroadcastChannel.channels.get(name).add(this);
  }

  postMessage(data) {
    if (this.closed) {
      throw new Error('Cannot post message on a closed BroadcastChannel');
    }

    const peers = MockBroadcastChannel.channels.get(this.name);
    if (!peers) {
      return;
    }

    peers.forEach((channel) => {
      channel.dispatchMessage(data);
    });
  }

  dispatchMessage(data) {
    const event = { data };
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('MockBroadcastChannel listener failed', error);
      }
    });

    if (typeof this.onmessage === 'function') {
      try {
        this.onmessage(event);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('MockBroadcastChannel onmessage handler failed', error);
      }
    }
  }

  addEventListener(type, handler) {
    if (type === 'message' && typeof handler === 'function') {
      this.listeners.add(handler);
    }
  }

  removeEventListener(type, handler) {
    if (type === 'message' && typeof handler === 'function') {
      this.listeners.delete(handler);
    }
  }

  close() {
    if (this.closed) {
      return;
    }

    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
      if (!peers.size) {
        MockBroadcastChannel.channels.delete(this.name);
      }
    }

    this.listeners.clear();
    this.onmessage = null;
    this.closed = true;
  }

  static reset() {
    MockBroadcastChannel.channels.forEach((peers) => {
      peers.forEach((channel) => {
        channel.listeners.clear();
        channel.onmessage = null;
        channel.closed = true;
      });
    });
    MockBroadcastChannel.channels.clear();
  }
}

export default MockBroadcastChannel;
