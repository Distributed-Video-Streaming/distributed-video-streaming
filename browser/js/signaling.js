/* Signaling client: talks to the Video Proxy over a WebSocket.
   It only carries small JSON messages used to set up the WebRTC
   connection (see "Signaling messages" in README.md). It never carries video. */

class SignalingClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.onMessage = () => {};   // called with each message from the proxy
    this.onClose = () => {};     // called when the socket closes
  }

  /* Resolves when the socket is open, rejects if the proxy is unreachable. */
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('Could not reach the streaming server.'));
      this.ws.onclose = () => this.onClose();
      this.ws.onmessage = (event) => {
        try {
          this.onMessage(JSON.parse(event.data));
        } catch (err) {
          console.warn('Ignored invalid signaling message', err);
        }
      };
    });
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.ws) this.ws.close();
    this.ws = null;
  }
}
