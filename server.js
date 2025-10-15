// server.js
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Serve static files (HTML)
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });

const rooms = {}; // { roomId: { players: [ws1, ws2], board, currentPlayer, gameActive } }

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      if (msg.type === 'createRoom') {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
          players: [ws],
          board: Array(9).fill(null),
          currentPlayer: 'X',
          gameActive: true
        };
        ws.roomId = roomId;
        ws.player = 'X';
        ws.send(JSON.stringify({ type: 'roomCreated', roomId }));
        console.log(`Room created: ${roomId}`);
      }

      else if (msg.type === 'joinRoom') {
        const { roomId } = msg;
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
          rooms[roomId].players.push(ws);
          ws.roomId = roomId;
          ws.player = 'O';
          // Notify both players
          rooms[roomId].players.forEach(p => {
            p.send(JSON.stringify({
              type: 'gameStart',
              yourTurn: p.player === 'X',
              opponent: p.player === 'X' ? 'O' : 'X'
            }));
          });
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Room full or invalid' }));
        }
      }

      else if (msg.type === 'move') {
        const { roomId, index } = msg;
        const room = rooms[roomId];
        if (!room || !room.gameActive || room.board[index] !== null) return;

        room.board[index] = room.currentPlayer;
        const winner = checkWinner(room.board);
        
        // Broadcast move to both players
        room.players.forEach(p => {
          p.send(JSON.stringify({
            type: 'update',
            board: room.board,
            currentPlayer: room.currentPlayer,
            winner: winner
          }));
        });

        if (winner) {
          room.gameActive = false;
        } else {
          room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
        }
      }

    } catch (e) {
      console.error('Invalid message', e);
    }
  });

  ws.on('close', () => {
    if (ws.roomId && rooms[ws.roomId]) {
      const room = rooms[ws.roomId];
      room.players = room.players.filter(p => p !== ws);
      if (room.players.length === 0) {
        delete rooms[ws.roomId];
      }
      console.log(`Client disconnected from room ${ws.roomId}`);
    }
  });
});

function checkWinner(board) {
  const lines = [
    [0,1,2], [3,4,5], [6,7,8], // rows
    [0,3,6], [1,4,7], [2,5,8], // cols
    [0,4,8], [2,4,6]           // diagonals
  ];
  for (let [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.includes(null) ? null : 'draw';
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`To play online: open http://localhost:${PORT} in two tabs or devices`);
});

powershell Compress-Archive -Path .\test_package.json -DestinationPath .\test_package.zip