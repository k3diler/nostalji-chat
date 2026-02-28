const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = new Map();
// --- TAG SYSTEM (v1: in-memory) ---
const userStats = new Map();
const userByNick = new Map();
const approvedTags = new Map();

const roomTagCatalog = {
  genel: [
    { key: "rank_new", label: "Yeni Üye", kind: "auto" },
    { key: "rank_active", label: "Aktif Üye", kind: "auto" },
    { key: "rank_senior", label: "Kıdemli", kind: "auto" },
    { key: "rank_legend", label: "Efsane", kind: "auto" },
  ]
};

function getAutoRank(msgCount) {
  if (msgCount >= 200) return { key: "rank_legend", label: "Efsane" };
  if (msgCount >= 50) return { key: "rank_senior", label: "Kıdemli" };
  if (msgCount >= 10) return { key: "rank_active", label: "Aktif Üye" };
  return { key: "rank_new", label: "Yeni Üye" };
}

function keyFor(room, nick) {
  return `${room}:${nick}`;
}const getUsers = (room) => Array.from(rooms.get(room) || []);

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
// stats init
userStats.set(socket.id, { msgCount: 0 });
userByNick.set(keyFor(room, nick), socket.id);

const roomTags = roomTagCatalog[room] || [];
const approved = Array.from(approvedTags.get(keyFor(room, nick)) || []);

socket.emit("tagCatalog", roomTags);
socket.emit("myApprovedTags", approved);
socket.emit("system", `-!- TAG INIT OK`);    io.to(room).emit("system", `-!- ${nick} has joined #${room}`);
   
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
