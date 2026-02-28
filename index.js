const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();
const getUsers = (room) => Array.from(rooms.get(room) || []);

io.on("connection", (socket) => {
  socket.on("join", ({ room, nick }) => {
    room = (room || "genel").toLowerCase();
    nick = (nick || "").slice(0, 20);
    if (!nick) return;

    socket.data.room = room;
    socket.data.nick = nick;
    socket.join(room);

    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(nick);

    io.to(room).emit("system", `-!- ${nick} has joined #${room}`);
    io.to(room).emit("users", getUsers(room));
  });

  socket.on("message", ({ text }) => {
    const room = socket.data.room;
    const nick = socket.data.nick;
    if (!room || !nick) return;

    io.to(room).emit("message", { nick, text: text.slice(0, 300) });
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nick = socket.data.nick;
    if (!room || !nick) return;

    const set = rooms.get(room);
    if (set) {
      set.delete(nick);
      if (set.size === 0) rooms.delete(room);
    }

    io.to(room).emit("system", `-!- ${nick} has left #${room}`);
    io.to(room).emit("users", getUsers(room));
  });
});

server.listen(process.env.PORT || 3000);
