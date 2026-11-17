let isBotRunning = false;
let seededPostSet = new Set();
let totalSeededCount = 0;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 1. Tách chuẩn từng dòng kịch bản (xử lý cả dấu xuống dòng Windows \r\n) và chỉ lấy ĐÚNG 1 câu
function pickRandomCaption(captionListRaw, affLink) {
  const cleanLink = (affLink || "").trim();
  const lines = (captionListRaw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let chosen = lines.length > 0
    ? lines[Math.floor(Math.random() * lines.length)]
    : "Mọi người tham khảo sản phẩm chính hãng tại đây nha: {link}";

  // Chèn khoảng trắng trước/sau link để không bao giờ bị dính chữ vào link
  if (chosen.includes("{link}")) {
    chosen = chosen.replace(/\{link\}/gi, ` ${cleanLink} `).replace(/\s+/g, " ").trim();
  } else {
    chosen = `${chosen} ${cleanLink}`.trim();
  }

  // Giải mã cú pháp Spintax {A|B} nếu có
  const spintaxRegex = /\{([^{}]+)\}/g;
  while (spintaxRegex.test(chosen)) {
    chosen = chosen.replace(spintaxRegex, (m, opts) => {
      const choices = opts.split("|");
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }
  return chosen;
}

// 2. Đọc chuẩn số Tim trên Threads
function parseThreadsNumber(text) {
  if (!text) return 0;
  const normalized = text.replace(/\u00a0/g, " ").trim();
  const regex = /(\d+(?:[.,]\d+)?)\s*(K|N|M|TR|Nghìn|Triệu)?\b/gi;
  let maxVal = 0;
  let match;

  while ((match = regex.exec(normalized)) !== null) {
    let rawNum = match[1];
    const unit = (match[2] || "").trim().toUpperCase();
    let val = 0;
    if (unit) {
      val = parseFloat(rawNum.replace(",", "."));
      if (unit === "K" || unit === "N" || unit === "NGHÌN") val *= 1000;
      else if (unit === "M" || unit === "TR" || unit === "TRIỆU") val *= 1000000;
    } else {
      if (/^\d+[.,]\d{3}$/.test(rawNum)) {
        val = parseInt(rawNum.replace(/[.,]/g, ""), 10);
      } else {
        val = parseFloat(rawNum.replace(",", "."));
      }
    }
    if (val > maxVal) maxVal = Math.round(val);
  }
  return maxVal;
}

// 3. Click chuột thật (Pointer + Mouse)
function triggerRealClick(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  const opts = { bubbles: true, cancelable: true, view: window, clientX, clientY };

  el.dispatchEvent(new PointerEvent("pointerdown", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new PointerEvent("pointerup", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.click();
}

// 4. Quét các bài viết trên màn hình
function scanPostsOnScreen() {
  const results = [];
  const seenContainers = new Set();
  const postLinks = document.querySelectorAll('a[href*="/post/"]');

  for (const linkEl of postLinks) {
    const href = linkEl.getAttribute("href") || "";
    const match = href.match(/\/post\/([A-Za-z0-9_-]+)/);
    if (!match) continue;
    const postId = match[1];

    let card = linkEl;
    let actionButtons = [];

    for (let i = 0; i < 10; i++) {
      if (!card.parentElement) break;
      card = card.parentElement;

      const allBtns = Array.from(card.querySelectorAll('div[role="button"], button')).filter(
        (b) => b.querySelector("svg") && b.offsetWidth > 0 && b.offsetWidth < 160
      );

      for (const b of allBtns) {
        const bTop = b.getBoundingClientRect().top;
        if (bTop <= 0) continue;
        const sameRow = allBtns.filter((other) => Math.abs(other.getBoundingClientRect().top - bTop) < 12);

        if (sameRow.length >= 3 && sameRow.length <= 6) {
          sameRow.sort((a, b2) => a.getBoundingClientRect().left - b2.getBoundingClientRect().left);
          actionButtons = sameRow;
          break;
        }
      }
      if (actionButtons.length >= 2) break;
    }

    if (actionButtons.length >= 2 && !seenContainers.has(card)) {
      seenContainers.add(card);
      const likeBtn = actionButtons[0];
      const replyBtn = actionButtons[1];

      const likeAreaText = [
        likeBtn.innerText,
        likeBtn.textContent,
        likeBtn.parentElement?.innerText
      ].join(" ");

      const likes = parseThreadsNumber(likeAreaText);

      let debugTag = card.querySelector(".aff-bot-like-badge");
      if (!debugTag) {
        debugTag = document.createElement("div");
        debugTag.className = "aff-bot-like-badge";
        Object.assign(debugTag.style, {
          display: "inline-block",
          background: "#0f172a",
          color: "#38bdf8",
          fontSize: "11px",
          fontWeight: "bold",
          padding: "2px 8px",
          borderRadius: "6px",
          marginBottom: "4px"
        });
        card.prepend(debugTag);
      }
      debugTag.innerText = `🤖 Bot đọc được: ❤️ ${likes} tim`;

      results.push({ postId, container: card, replyBtn, likes });
    }
  }
  return results;
}

// 5. Điền ĐÚNG 1 LẦN duy nhất vào trình soạn thảo Lexical (Chống dính chùm/lặp câu)
async function typeIntoThreadsEditor(editorEl, text) {
  editorEl.focus();
  await sleep(300);

  // Nếu ô đang có sẵn chữ nháp từ trước -> Chọn toàn bộ bằng Selection Range và xóa sạch
  if ((editorEl.innerText || "").trim().length > 0) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorEl);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("delete", false, null);
    await sleep(200);
  }

  // CHỈ DÙNG 1 LỆNH INSERT DUY NHẤT (Không gọi thêm Paste hay InputEvent để tránh lặp x3)
  document.execCommand("insertText", false, text);
  await sleep(800);
}

// 6. Tìm và bấm nút Gửi bình luận (Hỗ trợ cả nút tròn mũi tên đen ↑ lẫn nút chữ "Đăng"/"Post")
function clickThreadsSubmitButton(editorEl) {
  // Cách 1: Tìm nút nằm ngay gần khung soạn thảo (Nút tròn màu đen có icon mũi tên ↑ ở góc phải dưới ô nhập)
  let wrapper = editorEl;
  for (let i = 0; i < 6; i++) {
    if (!wrapper.parentElement) break;
    wrapper = wrapper.parentElement;

    const nearbyBtns = Array.from(wrapper.querySelectorAll('div[role="button"], button')).filter(
      (b) => b.offsetWidth > 0 && b.getAttribute("aria-disabled") !== "true" && !b.disabled
    );

    if (nearbyBtns.length > 0) {
      // Ưu tiên nút có nhãn Đăng/Post/Trả lời/Reply
      for (const btn of nearbyBtns) {
        const label = (
          (btn.innerText || "") +
          " " +
          (btn.getAttribute("aria-label") || "") +
          " " +
          (btn.querySelector("svg")?.getAttribute("aria-label") || "")
        ).toLowerCase();

        if (label.includes("đăng") || label.includes("post") || label.includes("trả lời") || label.includes("reply") || label.includes("gửi") || label.includes("send")) {
          triggerRealClick(btn);
          return true;
        }
      }

      // Nếu là nút icon mũi tên tròn màu đen (thường nằm ở vị trí cuối cùng bên phải của khung comment)
      const editorRect = editorEl.getBoundingClientRect();
      const rightSideBtns = nearbyBtns.filter((b) => {
        const r = b.getBoundingClientRect();
        // Nút tròn gửi bài nằm bên phải vùng nhập chữ và có kích thước nhỏ gọn (24px - 60px)
        return r.left > editorRect.left + 100 && r.width >= 24 && r.width <= 75;
      });

      if (rightSideBtns.length > 0) {
        // Lấy nút nằm ngoài cùng bên phải (chính là nút tròn đen mũi tên lên ↑)
        rightSideBtns.sort((a, b) => b.getBoundingClientRect().left - a.getBoundingClientRect().left);
        triggerRealClick(rightSideBtns[0]);
        return true;
      }
    }
  }

  // Cách 2: Dự phòng tìm trên toàn trang hoặc Dialog
  const allBtns = document.querySelectorAll('div[role="button"], button');
  for (const btn of allBtns) {
    const t = (btn.innerText || "").trim().toLowerCase();
    if ((t === "đăng" || t === "post") && btn.getAttribute("aria-disabled") !== "true") {
      triggerRealClick(btn);
      return true;
    }
  }

  return false;
}

function setBotStatus(text, bg = "#1e293b") {
  const statusBox = document.getElementById("threads-bot-status");
  if (statusBox) {
    statusBox.innerText = text;
    statusBox.style.background = bg;
  }
}

// 7. Vòng lặp Auto-Pilot chính
async function runAutoPilotLoop() {
  while (isBotRunning) {
    // Nếu đang ở trong trang chi tiết bài viết (/post/xxx) từ lần trước, tự động quay lại bảng tin chính
    if (window.location.pathname.includes("/post/")) {
      window.history.back();
      await sleep(2200);
    }

    const config = await new Promise((res) =>
      chrome.storage.local.get(["currentAffLink", "captionList", "minLikes", "minDelay", "maxDelay"], res)
    );

    const minLikes = parseInt(config.minLikes, 10) || 0;
    const minDelay = parseInt(config.minDelay, 10) || 25;
    const maxDelay = parseInt(config.maxDelay, 10) || 50;
    const affLink = (config.currentAffLink || "").trim();

    if (!affLink) {
      setBotStatus("⚠️ Chưa có Link Affiliate! Hãy mở Popup lưu link trước.", "#dc2626");
      await sleep(3000);
      continue;
    }

    const posts = scanPostsOnScreen();
    let chosenPost = null;

    for (const item of posts) {
      if (seededPostSet.has(item.postId)) continue;

      const rect = item.container.getBoundingClientRect();
      if (rect.top < -200 || rect.top > window.innerHeight) continue;

      seededPostSet.add(item.postId);
      setBotStatus(`🔍 Quét bài #${item.postId.slice(0, 5)}: ❤️ ${item.likes} tim (Cần >= ${minLikes})`, "#2563eb");

      if (item.likes >= minLikes) {
        chosenPost = item;
        break;
      } else {
        item.container.style.outline = "1px dashed #cbd5e1";
      }
    }

    if (!chosenPost) {
      setBotStatus(`⏬ Chưa gặp bài >= ${minLikes} tim, đang cuộn xuống...`, "#475569");
      window.scrollBy({ top: 550, behavior: "smooth" });
      await sleep(2500);
      continue;
    }

    chosenPost.container.style.outline = "3px solid #ea580c";
    chosenPost.container.style.borderRadius = "12px";
    chosenPost.container.scrollIntoView({ behavior: "smooth", block: "center" });
    setBotStatus(`🎯 Chốt bài ❤️ ${chosenPost.likes} tim! Đang mở bình luận...`, "#ea580c");
    await sleep(1500);

    if (!isBotRunning) break;

    // Bấm nút mở khung trả lời
    triggerRealClick(chosenPost.replyBtn);
    await sleep(2500);

    // Tìm ô nhập chữ
    let editor = document.querySelector(
      'div[role="dialog"] div[contenteditable="true"], div[contenteditable="true"][role="textbox"]'
    );

    // Nếu Threads chuyển sang trang chi tiết bài viết mà chưa focus vào ô trả lời -> Bấm vào vùng trả lời để kích hoạt editor
    if (!editor) {
      const replyPlaceholders = document.querySelectorAll('div[role="button"], span');
      for (const el of replyPlaceholders) {
        const txt = (el.innerText || "").toLowerCase();
        if (txt.includes("trả lời") || txt.includes("reply to")) {
          triggerRealClick(el);
          await sleep(1200);
          break;
        }
      }
      editor = document.querySelector('div[contenteditable="true"][role="textbox"], div[contenteditable="true"]');
    }

    if (!editor) {
      setBotStatus("⚠️ Không tìm thấy ô chữ, đang quay lại tìm bài tiếp...", "#d97706");
      await sleep(1800);
      continue;
    }

    // Chọn ĐÚNG 1 câu từ 10 kịch bản và điền 1 lần duy nhất
    const finalComment = pickRandomCaption(config.captionList, affLink);
    setBotStatus("✍️ Đang điền 1 kịch bản ngẫu nhiên...", "#7c3aed");
    await typeIntoThreadsEditor(editor, finalComment);

    if (!isBotRunning) break;

    // Bấm nút gửi (hỗ trợ cả nút tròn màu đen mũi tên ↑)
    const submitted = clickThreadsSubmitButton(editor);
    if (submitted) {
      totalSeededCount++;
      chosenPost.container.style.outline = "3px solid #16a34a";
      setBotStatus(`✅ Đã gửi bình luận thành công (${totalSeededCount} bài)!`, "#16a34a");
    } else {
      setBotStatus("⚠️ Đã điền chữ nhưng chưa bấm được nút mũi tên gửi!", "#d97706");
    }

    await sleep(3500);

    // Nếu đang ở trang chi tiết bài viết (/post/xxx), tự động quay lại trang chủ để cuộn tiếp
    if (window.location.pathname.includes("/post/")) {
      window.history.back();
      await sleep(2000);
    }

    // Đếm ngược nghỉ chống spam
    const waitSec = Math.floor(Math.random() * (Math.max(maxDelay, minDelay) - minDelay + 1)) + minDelay;
    for (let rem = waitSec; rem > 0; rem--) {
      if (!isBotRunning) break;
      setBotStatus(`⏳ Đã rải ${totalSeededCount} bài | Nghỉ chống spam: ${rem}s...`, "#0f172a");
      await sleep(1000);
    }
  }
}

// 8. Bảng điều khiển nổi góc phải dưới
function injectThreadsBotPanel() {
  if (!document.body || document.getElementById("threads-auto-bot-panel")) return;

  const panel = document.createElement("div");
  panel.id = "threads-auto-bot-panel";
  Object.assign(panel.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "8px",
    fontFamily: "system-ui, sans-serif"
  });

  const statusBadge = document.createElement("div");
  statusBadge.id = "threads-bot-status";
  statusBadge.innerText = "🤖 Bot Threads: Sẵn sàng";
  Object.assign(statusBadge.style, {
    background: "#1e293b",
    color: "#f8fafc",
    padding: "7px 14px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
  });

  const btnToggle = document.createElement("button");
  btnToggle.innerHTML = "▶️ BẮT ĐẦU TỰ ĐỘNG RẢI";
  Object.assign(btnToggle.style, {
    background: "#ea580c",
    color: "#ffffff",
    border: "none",
    borderRadius: "999px",
    padding: "11px 20px",
    fontSize: "13px",
    fontWeight: "bold",
    boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
    cursor: "pointer"
  });

  btnToggle.addEventListener("click", () => {
    isBotRunning = !isBotRunning;
    if (isBotRunning) {
      btnToggle.innerHTML = "⏹️ DỪNG BOT NGAY";
      btnToggle.style.background = "#dc2626";
      runAutoPilotLoop();
    } else {
      btnToggle.innerHTML = "▶️ BẮT ĐẦU TỰ ĐỘNG RẢI";
      btnToggle.style.background = "#ea580c";
      setBotStatus(`⏸️ Đã tạm dừng (Đã rải ${totalSeededCount} bài)`, "#475569");
    }
  });

  panel.appendChild(statusBadge);
  panel.appendChild(btnToggle);
  document.body.appendChild(panel);
}

injectThreadsBotPanel();
setInterval(injectThreadsBotPanel, 1500);