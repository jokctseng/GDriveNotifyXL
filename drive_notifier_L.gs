// === 使用者設定區 ===
const FOLDER_IDS = [
  "資料夾ID1", // ← 輸入你要監控的資料夾
  "資料夾ID2", // ← 輸入你要監控的資料夾
  "資料夾ID3" // ← 輸入你要監控的資料夾
];

const TELEGRAM_BOT_TOKEN = "";    ← 輸入你的Telegram Bot Token
const TELEGRAM_CHAT_ID = "";       ← 輸入你的Telegram Chat ID
const EMAIL_ADDRESS = "";         ← 輸入你的電郵地址

// 預留Messenger欄位（目前未啟用）
const MESSENGER_PAGE_TOKEN = "";
const MESSENGER_USER_ID = "";

// 測試模式（true=每次都有假資料送出）
const TEST_MODE = false;
// ===================

// 程式核心
function checkFolderChanges() {
  let updatedMessages = [];

  const lastChecked = PropertiesService.getScriptProperties().getProperty('lastChecked') || new Date(0).toISOString();
  const lastCheckedDate = new Date(lastChecked);

  if (TEST_MODE) {
    updatedMessages = [{
      folderName: "測試資料夾",
      updates: [{
        name: "測試檔案.txt",
        url: "https://example.com",
        updatedTime: (new Date()).toLocaleString()
      }]
    }];
  } else {
    FOLDER_IDS.forEach(folderId => {
      try {
        const folder = DriveApp.getFolderById(folderId);
        const folderUpdates = scanFolderRecursive(folder, lastCheckedDate);

        if (folderUpdates.length > 0) {
          updatedMessages.push({
            folderName: folder.getName(),
            updates: folderUpdates
          });
        }
      } catch (e) {
        Logger.log("⚠️ 無法讀取 Folder ID：" + folderId + "，錯誤：" + e.toString());
      }
    });

    PropertiesService.getScriptProperties().setProperty('lastChecked', new Date().toISOString());
  }

  if (updatedMessages.length > 0) {
    const telegramMessage = formatTelegramMessage(updatedMessages);
    const emailMessage = formatEmailMessage(updatedMessages);

    let sent = false;

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      try {
        sendTelegram(telegramMessage);
        Logger.log("✅ Telegram訊息發送成功");
        sent = true;
      } catch (e) {
        Logger.log("❌ Telegram發送失敗: " + e.toString());
      }
    }

    if (EMAIL_ADDRESS) {
      try {
        sendEmail(emailMessage);
        Logger.log("✅ Email訊息發送成功");
        sent = true;
      } catch (e) {
        Logger.log("❌ Email發送失敗: " + e.toString());
      }
    }

    if (!sent) {
      Logger.log("⚠️ 僅記錄變更。");
    }
  } else {
    Logger.log("ℹ️ 沒有偵測到任何資料夾或子資料夾更新。");
  }
}

// 🧩 遞迴掃描整個資料夾樹
function scanFolderRecursive(folder, lastCheckedDate) {
  let updates = [];

  // 掃描當前資料夾檔案
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getLastUpdated() > lastCheckedDate) {
      updates.push({
        name: file.getName(),
        url: file.getUrl(),
        updatedTime: file.getLastUpdated().toLocaleString()
      });
    }
  }

  // 遞迴掃描子資料夾
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    updates = updates.concat(scanFolderRecursive(subfolder, lastCheckedDate));
  }

  return updates;
}

// 🖋️ 格式化Telegram訊息（Markdown）
function formatTelegramMessage(folders) {
  let message = "*📂 ＯＯＯ相關資料夾更新通知*\n\n";
  folders.forEach(folder => {
    message += `*📁 資料夾名稱：* ${escapeMarkdown(folder.folderName)}\n`;
    folder.updates.forEach(update => {
      message += `🔹 [${escapeMarkdown(update.name)}](${update.url})\n🕑 更新時間：${escapeMarkdown(update.updatedTime)}\n\n`;
    });
  });
  return message.trim();
}

// 🖋️ 格式化Email訊息（HTML）
function formatEmailMessage(folders) {
  let message = `<h2>📂 資料夾更新通知</h2>`;
  folders.forEach(folder => {
    message += `<h3>📁 資料夾名稱：${folder.folderName}</h3>`;
    folder.updates.forEach(update => {
      message += `🔹 <a href="${update.url}" target="_blank">${update.name}</a><br>🕑 更新時間：${update.updatedTime}<br><br>`;
    });
  });
  return message;
}

// 📩 發送Telegram訊息
function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "Markdown"
  };
  UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}

// 📧 發送Email通知
function sendEmail(htmlMessage) {
  MailApp.sendEmail({
    to: EMAIL_ADDRESS,
    subject: "雲端助手｜ＯＯＯ相關雲端資料夾更新通知",
    htmlBody: htmlMessage
  });
}

// 📎 防止Telegram Markdown格式出錯
function escapeMarkdown(text) {
  return text.replace(/([\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!])/g, "\\$1");
}

