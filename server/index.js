import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "../public")));

let players = new Map(); // socketId -> {name, avatar, bet}
let tickets = [];
let winnerIndex = null;

function buildTickets() {
  tickets = [];
  for (const p of players.values()) {
    for (let i = 0; i < p.bet; i++) {
      tickets.push({ name: p.name, avatar: p.avatar });
    }
  }
}

io.on("connection", (socket) => {
  socket.on("join", ({ name, avatar }) => {
    players.set(socket.id, { name, avatar, bet: 0 });
    io.emit("players", Array.from(players.values()));
  });

  socket.on("bet", (amount) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.bet = Math.max(0, Number(amount));
    buildTickets();
    io.emit("players", Array.from(players.values()));
  });

  // ручной запуск (если нужно)
  socket.on("start", () => {
    if (tickets.length === 0) return;
    winnerIndex = Math.floor(Math.random() * tickets.length);
    io.emit("carousel", { tickets, winnerIndex });
  });

  socket.on("disconnect", () => {
    players.delete(socket.id);
    buildTickets();
    io.emit("players", Array.from(players.values()));
  });
});

// --- Автоматический таймер ---
let roundInterval = 30000; // каждые 30 секунд
setInterval(() => {
  if (tickets.length === 0) return;
  winnerIndex = Math.floor(Math.random() * tickets.length);
  io.emit("carousel", { tickets, winnerIndex });
}, roundInterval);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
