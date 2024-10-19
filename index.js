const http = require('http');
const express = require('express');
const cors = require('cors');
const socketIO = require('socket.io');
const app = express();
const port = process.env.PORT || 4500;

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "https://randomlychat.vercel.app",
    methods: ["GET", "POST"],
  },
});

let waitingUser = null; // Track a single waiting user
let userRooms = {}; // Track which room a user is in

app.use(cors());
app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on("connection", (socket) => {
  console.log("New Connection", socket.id);

  // When a user joins
  socket.on('joined', () => {
    if (waitingUser === null) {
      // No one is waiting, this user will wait for a partner
      waitingUser = socket.id;
      socket.emit('waiting', { message: "Finding stranger to talk..." });
    } else {
      // Pair the waiting user with the new one
      const room = `room-${waitingUser}-${socket.id}`;
      socket.join(room); // New user joins the room
      io.to(waitingUser).emit('strangerJoined', { message: "Stranger has joined. Say Hi!" });
      socket.emit('strangerJoined', { message: "Stranger has joined. Say Hi!" });

      // Make both users join the same room
      io.sockets.sockets.get(waitingUser).join(room);

      // Track which room users are in
      userRooms[socket.id] = room;
      userRooms[waitingUser] = room;

      waitingUser = null; // Reset waiting user
    }
  });

  // Send a message to the pair (within the same room)
  socket.on('message', ({ message, id }) => {
    const room = userRooms[socket.id]; // Get the room the user is in
    if (room) {
      io.to(room).emit("sendMessage", { message, id });
    }
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    // Find the room the user was in and notify the other user in the same room
    const room = userRooms[socket.id];
    if (room) {
      socket.to(room).emit('leave', { message: "Stranger has left the chat." });

      // Clean up the room
      delete userRooms[socket.id];
    }

    // If the user was the waiting user, reset the waiting user
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
