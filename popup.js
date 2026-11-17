const fields = ["affId", "subId", "currentAffLink", "minLikes", "minDelay", "maxDelay", "captionList"];

const default10Captions = [
  "Bí kíp tặng quà vừa tâm lý vừa thiết thực đây mấy bà ơi, người yêu dùng là mê luôn: {link}",
  "Mình mới săn được deal chính hãng giá hời quá trời, để lại link cho ai cần nha: {link}",
  "Đồ chuẩn xịn mà đang có mã giảm sâu, mọi người bấm vào đây tham khảo nè: {link}",
  "Ai đang tìm mua món này thì chốt lẹ nha, mình mua rồi ưng cực kỳ luôn: {link}",
  "Khuyên thật mọi người nên thử dòng này một lần, chất lượng vượt tầm giá: {link}",
  "Hôm trước thấy nhiều bạn hỏi chỗ mua uy tín, mình hay đặt ở gian hàng chính hãng này nè: {link}",
  "Đang có chương trình sale lớn, tranh thủ áp voucher chốt đơn kẻo hết cả nhà ơi: {link}",
  "Review chân thực 10/10 điểm không có nhưng, link mua chuẩn Mall cho mọi người đây: {link}",
  "Đặt ở shop này giao nhanh mà đóng gói kỹ lắm nha, mình để link ở đây cho tiện tìm: {link}",
  "Chân ái là đây chứ đâu, vừa rẻ vừa chất lượng, bấm vào xem thử ngay nhé: {link}"
].join("\n");

document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("statusMsg");

  chrome.storage.local.get(fields, (data) => {
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) el.value = data[id];
    });
    if (!document.getElementById("affId").value) document.getElementById("affId").value = "17365120686";
    if (!document.getElementById("subId").value) document.getElementById("subId").value = "Threads_Auto";
    if (!document.getElementById("minLikes").value) document.getElementById("minLikes").value = "15";
    if (!document.getElementById("minDelay").value) document.getElementById("minDelay").value = "30";
    if (!document.getElementById("maxDelay").value) document.getElementById("maxDelay").value = "60";
    if (!document.getElementById("captionList").value) document.getElementById("captionList").value = default10Captions;
  });

  // Tự động lưu ngay khi sửa
  fields.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        chrome.storage.local.set({ [id]: el.value });
      });
    }
  });

  // Lấy link từ tab Shopee
  document.getElementById("btnGrabCurrent").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const affId = document.getElementById("affId").value.trim() || "17365120686";
    const subId = document.getElementById("subId").value.trim() || "Threads_Auto";

    let cleanUrl = tab.url.split("?")[0];
    const match = tab.url.match(/i\.(\d+)\.(\d+)/);
    if (match) cleanUrl = `https://shopee.vn/product/${match[1]}/${match[2]}`;

    const finalLink = `${cleanUrl}?mmp_pid=an_${affId}&utm_source=an_${affId}&utm_medium=affiliates&utm_content=${encodeURIComponent(subId)}`;
    document.getElementById("currentAffLink").value = finalLink;
    chrome.storage.local.set({ currentAffLink: finalLink, affId, subId });

    statusEl.innerText = "✔ Đã lấy và lưu link Shopee Affiliate!";
  });

  // Lưu cấu hình
  document.getElementById("btnSave").addEventListener("click", () => {
    const payload = {};
    fields.forEach((id) => {
      payload[id] = document.getElementById(id).value;
    });
    chrome.storage.local.set(payload, () => {
      statusEl.innerText = "✔ Đã lưu 10 kịch bản! Hãy sang Threads bật Auto Bot.";
    });
  });
});