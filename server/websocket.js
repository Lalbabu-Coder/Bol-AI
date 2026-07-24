import { WebSocketServer } from 'ws';
import { handleVoiceCall } from './services/voice/realtimeVoiceService.js';

/**
 * Initializes raw WebSocket Server mapping to the primary Node HTTP server upgrading requests at /media-stream
 */
export const initWebSocketServer = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    let voiceRelay = null;

    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message.toString());

        switch (msg.event) {
          case 'start':
            const startPayload = msg.start;
            const params = startPayload.customParameters || {};
            
            const companyId = params.companyId;
            const callSid = params.callSid || startPayload.callSid;
            const fromPhoneNumber = params.fromPhoneNumber;

            if (!companyId) {
              process.stderr.write('Voice WebSocket Error: missing companyId in stream params.\n');
              ws.close();
              return;
            }

            // Fire up OpenAI bidirectional socket relay
            voiceRelay = handleVoiceCall(ws, companyId, callSid, fromPhoneNumber);
            
            if (voiceRelay && voiceRelay.handleTwilioStart) {
              voiceRelay.handleTwilioStart(msg.streamSid);
            }
            break;

          case 'media':
            if (msg.media && msg.media.payload) {
              if (voiceRelay && voiceRelay.handleTwilioAudio) {
                voiceRelay.handleTwilioAudio(msg.media.payload);
              }
            }
            break;

          case 'stop':
            if (voiceRelay && voiceRelay.handleTwilioStop) {
              voiceRelay.handleTwilioStop();
            }
            break;

          default:
            break;
        }
      } catch (err) {
        process.stderr.write(`WebSocket media relay message warning: ${err.message}\n`);
      }
    });

    ws.on('close', () => {
      if (voiceRelay && voiceRelay.handleTwilioClose) {
        voiceRelay.handleTwilioClose();
      }
    });

    ws.on('error', (err) => {
      process.stderr.write(`WebSocket twilio stream connection error: ${err.message}\n`);
      if (voiceRelay && voiceRelay.handleTwilioClose) {
        voiceRelay.handleTwilioClose();
      }
    });
  });

  // Attach upgrade trigger onto main Express HTTP server Upgrade events
  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      
      if (url.pathname === '/media-stream') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      } else {
        // Ignore upgrades on other routes
        socket.destroy();
      }
    } catch (err) {
      socket.destroy();
    }
  });

  process.stdout.write('Media Stream WebSocket relay server attached to Express.\n');
};

export default initWebSocketServer;
