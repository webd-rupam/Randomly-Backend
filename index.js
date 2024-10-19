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

      waitingUser = null; // Reset waiting user
    }
  });

  // Send a message to the pair (within the same room)
  socket.on('message', ({ message, id }) => {
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // Get the room the user is in (index 0 is the default room)
    if (room) {
      io.to(room).emit("sendMessage", { message, id });
    }
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    // If the disconnected user was waiting, reset the waiting user
    if (waitingUser === socket.id) {
      waitingUser = null;
    }

    // Notify the other user in the room that the stranger left
    const rooms = Array.from(socket.rooms);
    const room = rooms[1]; // Get the room the user was in
    socket.broadcast.to(room).emit('leave', { message: "Stranger has left the chat." });

    // Leave the room
    socket.leave(room);
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
