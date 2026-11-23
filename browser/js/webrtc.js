/* WebRTC client: sets up the connection and receives the video stream.
   It uses a SignalingClient to exchange the setup messages. */

class WebRTCClient {
  /* handlers: { onStream(stream), onState(state), onError(message) } */
  constructor(signaling, handlers) {
    this.signaling = signaling;
    this.handlers = handlers;
    this.pc = null;
  }

  async start() {
    const pc = new RTCPeerConnection();   // no STUN/TURN: fine on a local network
    this.pc = pc;

    pc.addTransceiver('video', { direction: 'recvonly' });   // we only receive
    pc.ontrack = (event) => this.handlers.onStream(event.streams[0]);
    pc.onconnectionstatechange = () => this.handlers.onState(pc.connectionState);
    pc.onicecandidate = (event) => {
      if (event.candidate) this.signaling.send({ type: 'candidate', candidate: event.candidate });
    };

    this.signaling.onMessage = async (msg) => {
      try {
        if (msg.type === 'answer') await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
        else if (msg.type === 'candidate') await pc.addIceCandidate(msg.candidate);
        else if (msg.type === 'error') this.handlers.onError(msg.message || 'The server reported an error.');
      } catch (err) {
        this.handlers.onError('Could not set up the video connection.');
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.signaling.send({ type: 'offer', sdp: offer.sdp });
  }

  close() {
    if (this.pc) this.pc.close();
    this.pc = null;
  }
}
