chrome.runtime.onInstalled.addListener(() => {
  // Chỉ khởi tạo giá trị mặc định nếu trong bộ nhớ chưa từng lưu
  chrome.storage.local.get(["affId", "subId", "spintaxTemplate"], (data) => {
    const defaults = {};
    if (!data.affId) defaults.affId = "17365120686";
    if (!data.subId) defaults.subId = "FB_Comment";
    if (!data.spintaxTemplate) {
      defaults.spintaxTemplate = "Mọi người tham khảo chỗ mình mua chính hãng giá hời nha: {link} 🔥";
    }
    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });

  chrome.contextMenus.create({
    id: "convert-aff-link",
    title: "⚡ Chuyển thành Link Affiliate & Lưu vào bộ nhớ",
    contexts: ["link", "page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "convert-aff-link") {
    const rawUrl = info.linkUrl || info.pageUrl;
    chrome.storage.local.get(["affId", "subId"], (data) => {
      const cleanAffLink = convertUrlToAffiliate(rawUrl, data.affId, data.subId);
      chrome.storage.local.set({ currentAffLink: cleanAffLink });
    });
  }
});

function convertUrlToAffiliate(url, affId = "17365120686", subId = "FB_Comment") {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/i\.(\d+)\.(\d+)/);
    let baseCleanUrl = url.split("?")[0];
    if (match) {
      baseCleanUrl = `https://shopee.vn/product/${match[1]}/${match[2]}`;
    }
    return `${baseCleanUrl}?mmp_pid=an_${affId}&utm_source=an_${affId}&utm_medium=affiliates&utm_content=${encodeURIComponent(subId)}`;
  } catch (e) {
    return url;
  }
}