const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 9090});

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    ws.send(message);
  });
});
