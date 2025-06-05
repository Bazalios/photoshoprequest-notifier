const posts = new Map();
const postContainer = document.getElementById("posts");
const paidSound = document.getElementById("paidSound");
const filterSelect = document.getElementById("filter");
let failCount = 0;

const notified = new Set(JSON.parse(localStorage.getItem("notifiedIds") || "[]"));

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('serviceWorker.js').catch(console.error);
}

if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute("data-theme", "dark");
}

document.getElementById("refreshBtn").addEventListener("click", fetchPosts);
document.getElementById("themeBtn").addEventListener("click", () => {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme") || "light";
  html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
});

filterSelect.addEventListener("change", renderPosts);

Notification.requestPermission();
setInterval(updateClock, 1000);
setInterval(fetchPosts, 10000);
fetchPosts();

function updateClock() {
  document.getElementById("clock").innerText = new Date().toLocaleTimeString();
}

async function fetchPosts() {
  try {
    const res = await fetch("https://www.reddit.com/r/PhotoshopRequest/new.json?limit=7");
    const data = await res.json();
    const now = Date.now();
    const timestamps = [];

    data.data.children.reverse().forEach(post => {
      const p = post.data;
      const createdTime = new Date(p.created_utc * 1000);

      if (!posts.has(p.id)) {
        const isPaid = (p.link_flair_text || '').toLowerCase().includes("paid") ||
                       p.title.toLowerCase().includes("paid");

        const isFree = (p.link_flair_text || '').toLowerCase().includes("free") ||
                       p.title.toLowerCase().includes("free");

        const flair = p.link_flair_text || (isPaid ? "Paid" : isFree ? "Free" : null);

        posts.set(p.id, {
          id: p.id,
          title: p.title,
          url: 'https://reddit.com' + p.permalink,
          time: createdTime.toLocaleTimeString(),
          timestamp: createdTime.getTime(),
          flair: flair,
          isNew: !notified.has(p.id)
        });

        if (!notified.has(p.id)) {
          notified.add(p.id);
          localStorage.setItem("notifiedIds", JSON.stringify([...notified]));

          if (Notification.permission === "granted") {
            const n = new Notification("📢 New post on r/PhotoshopRequest", {
              body: p.title,
              icon: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
              data: { url: 'https://reddit.com' + p.permalink }
            });
            n.onclick = e => {
              e.preventDefault();
              window.open(n.data.url, '_blank');
            };
          }

          if (isPaid) {
            paidSound.play().catch(() => {});
          }
        }
      }

      if (createdTime.getTime() >= now - 3600000) {
        timestamps.push(createdTime.getTime());
      }
    });

    while (posts.size > 7) posts.delete(posts.keys().next().value);

    renderPosts();
    updateStatus("✅ Última atualização: " + new Date().toLocaleTimeString());
    updateAverage(timestamps);
    failCount = 0;
  } catch (err) {
    console.error("❌ Erro ao buscar posts:", err);
    failCount++;
    if (failCount >= 3) {
      updateStatus("❌ Falha ao carregar posts: " + err.message);
    }
  }
}

function renderPosts() {
  postContainer.innerHTML = "";
  const filter = filterSelect.value;
  [...posts.values()].reverse().forEach(post => {
    const tag = detectTag(post.flair);
    if (filter === "paid" && (!tag || tag.class !== "paid")) return;
    if (filter === "free" && (!tag || tag.class !== "free")) return;

    const div = document.createElement("div");
    div.className = "post";
    if (post.isNew) {
      post.isNew = false;
    }
    div.innerHTML = `
      <a href="${post.url}" target="_blank">${post.title}</a>
      ${tag ? `<span class="tag ${tag.class}">${tag.text}</span>` : ""}
      <br><small>Posted at ${post.time}</small>
    `;
    postContainer.appendChild(div);
  });
}

function detectTag(flair) {
  if (!flair) return null;
  const text = flair.toLowerCase();
  if (text.includes("paid")) return { text: "💰 Paid", class: "paid" };
  if (text.includes("free")) return { text: "🆓 Free", class: "free" };
  return null;
}

function updateAverage(timestamps) {
  if (timestamps.length < 2) {
    document.getElementById("avgTime").innerText = "⏱ Average: --";
    return;
  }
  timestamps.sort((a, b) => a - b);
  let totalDiff = 0;
  for (let i = 1; i < timestamps.length; i++) {
    totalDiff += timestamps[i] - timestamps[i - 1];
  }
  const avgSec = Math.round((totalDiff / (timestamps.length - 1)) / 1000);
  const min = Math.floor(avgSec / 60);
  const sec = avgSec % 60;
  document.getElementById("avgTime").innerText = `⏱ Average: ${min} min ${sec} s between posts`;
}

function updateStatus(msg) {
  document.getElementById("status").innerText = msg;
}