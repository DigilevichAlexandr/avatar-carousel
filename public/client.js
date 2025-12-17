const socket = io();
const canvas = document.getElementById("carousel");
const ctx = canvas.getContext("2d");

let tickets = [];
let images = [];
let scrollOffset = 0;
let scrollTween = null;

// Загружаем аватарки
function loadImages(arr) {
  images = arr.map(t => {
    const img = new Image();
    img.src = t.avatar;
    return { ...t, img };
  });

  Promise.all(images.map(i => new Promise(res => {
    i.img.onload = res;
    i.img.onerror = res;
  }))).then(() => draw(scrollOffset));
}

// Отрисовка ленты
function draw(offset = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const count = images.length;
  if (count === 0) return;

  const spacing = canvas.width / count;
  const size = Math.min(spacing * 0.8, 100);

  for (let i = 0; i < count; i++) {
    const x = i * spacing + (spacing - size) / 2 + offset;
    const y = 50;

    ctx.drawImage(images[i].img, x, y, size, size);
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(images[i].name, x + size / 2, y + size + 20);
  }
}

// Запуск движения
function startScrolling() {
  if (scrollTween) scrollTween.kill();
  scrollOffset = 0;

  scrollTween = gsap.to({}, {
    duration: 10,
    repeat: -1,
    onUpdate: () => {
      scrollOffset -= 2;
      if (scrollOffset < -canvas.width) scrollOffset = 0;
      draw(scrollOffset);
    }
  });
}

// Остановка на победителе
function stopOnWinner(winnerIndex) {
  if (scrollTween) scrollTween.kill();

  const count = images.length;
  const spacing = canvas.width / count;
  const targetOffset = canvas.width / 2 - (winnerIndex * spacing + spacing / 2);

  gsap.to({}, {
    duration: 3,
    ease: "power4.out",
    onUpdate: function() {
      scrollOffset += (targetOffset - scrollOffset) * this.progress();
      draw(scrollOffset);
    }
  });
}

// --- Socket events ---
socket.on("players", (players) => {
  document.getElementById("players").innerHTML =
    players.map(p => `<li>${p.name} — ${p.bet}</li>`).join("");
});

socket.on("carousel", ({ tickets: t, winnerIndex }) => {
  tickets = t;
  loadImages(tickets);
  setTimeout(() => {
    startScrolling();
    setTimeout(() => stopOnWinner(winnerIndex), 3000);
  }, 500);
});

// --- UI ---
document.getElementById("joinBtn").onclick = () => {
  const name = document.getElementById("name").value || "Игрок";
  const avatar = document.getElementById("avatar").value || `https://api.dicebear.com/9.x/thumbs/svg?seed=${name}`;
  socket.emit("join", { name, avatar });
};

document.getElementById("betBtn").onclick = () => {
  const bet = document.getElementById("bet").value;
  socket.emit("bet", bet);
};

document.getElementById("startBtn").onclick = () => {
  socket.emit("start");
};
