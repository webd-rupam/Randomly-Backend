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

let activeUser = null; // Keep track of the first connected user
const users = {};

app.use(cors());
app.get('/', (req, res) => {
  res.send('Hello World!');
});

io.on("connection", (socket) => {
  console.log("New Connection");

  socket.on('joined', () => {
    users[socket.id] = "Stranger";

    // Notify the first user when the second one joins
    if (activeUser === null) {
      activeUser = socket.id;
      socket.emit('waiting', { message: "Finding stranger to talk..." });
    } else {
      // Notify both users that they can start chatting
      socket.emit('strangerJoined', { message: "Stranger has joined. Say Hi!" });
      io.to(activeUser).emit('strangerJoined', { message: "Stranger has joined. Say Hi!" });
      activeUser = null; // Reset after a pair is made
    }
  });

  socket.on('message', ({ message, id }) => {
    io.emit("sendMessage", { message, id });
  });

  // When a user disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);

    // Notify others that a stranger has left
    socket.broadcast.emit('leave', { message: "Stranger has left the chat." });

    // Remove user from users list
    delete users[socket.id];
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
