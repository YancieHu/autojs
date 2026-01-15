/**
 * TikTok 发送私信脚本（英文/中文界面 best-effort）
 *
 * 参数来源：engines.myEngine().execArgv.template_params
 * 本地调试：默认使用脚本内置 JSON
 *
 * 支持字段：
 * - usernames: 目标用户名（逗号分隔字符串，或数组）
 * - message_content: 私信内容（逗号分隔字符串，或数组）
 */

// ==================== 全局变量 ====================
var globalTaskId = "50001";
var globalConfig = null;
var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";
var FORCE_STOP_TIKTOK_BEFORE_LAUNCH = true;

// ==================== 本地调试默认参数 ====================
var ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS = false;
var DEFAULT_TEMPLATE_PARAMS_UPDATE_JSON = JSON.stringify({
  usernames: "sam",
  message_content: "Hello good morning!"
});

// ==================== 结果上报（必须保留） ====================

function reportResult(isSuccess, message) {
  try {
    if (globalTaskId && typeof scriptUtils !== "undefined") {
      var resultMap = {
        status: isSuccess ? "success" : "failed",
        result: isSuccess ? String(message || "") : "私信发送失败: " + String(message || ""),
        task_id: globalTaskId
      };
      console.log("上报结果:", resultMap);
      if (scriptUtils.reportLog) {
        scriptUtils.reportLog(globalTaskId, JSON.stringify(resultMap));
      } else if (scriptUtils.sendTaskResult) {
        scriptUtils.sendTaskResult(resultMap);
      }
    }
  } catch (e) {
    console.error("上报结果时出错:", e.message);
  }
}

function failAndStop(message) {
  var reason = message || "未知错误";
  console.error(reason);
  reportResult(false, reason);
  exit();
}

// ==================== 工具函数 ====================

function randomSleep(minMs, maxMs) {
  if (typeof maxMs === "undefined") maxMs = minMs;
  var start = Math.min(minMs, maxMs);
  var end = Math.max(minMs, maxMs);
  var sleepTime = Math.floor(Math.random() * (end - start + 1)) + start;
  console.log("等待 " + sleepTime + "ms");
  sleep(sleepTime);
}

function safeClick(element, description) {
  if (!element) {
    console.warn(description + " 元素不存在");
    return false;
  }

  var t = "";
  var d = "";
  var cls = "";
  var clickable = null;
  var enabled = null;
  var b = null;
  try { t = element.text ? String(element.text() || "") : ""; } catch (e1) {}
  try { d = element.desc ? String(element.desc() || "") : ""; } catch (e2) {}
  try { cls = element.className ? String(element.className() || "") : ""; } catch (e3) {}
  try { clickable = element.clickable ? !!element.clickable() : null; } catch (e4) {}
  try { enabled = element.enabled ? !!element.enabled() : null; } catch (e5) {}
  try { b = element.bounds ? element.bounds() : null; } catch (e6) {}

  var bStr = "";
  try {
    if (b) bStr = " (" + b.left + "," + b.top + "," + b.right + "," + b.bottom + ")";
  } catch (e7) {}

  console.log(
    "点击: " +
      description +
      " [text=" +
      t +
      ", desc=" +
      d +
      ", class=" +
      cls +
      ", clickable=" +
      clickable +
      ", enabled=" +
      enabled +
      ", bounds=" +
      bStr +
      "]"
  );

  var ok = false;
  try {
    ok = !!element.click();
  } catch (err) {
    console.warn("click() 异常: " + description + " => " + err);
    ok = false;
  }
  console.log("点击结果: " + ok + " - " + description);

  if (!ok && b) {
    try {
      ok = click(b.centerX(), b.centerY());
    console.log("坐标点击兜底已执行 - " +b.centerX()+"-"+b.centerY()+ description+"-"+ok);
    } catch (e8) {
      console.warn("坐标点击兜底异常: " + description + " => " + e8);
    }
  }

  if (ok) randomSleep(350, 750);
  return ok;
}

function safeCurrentPackage() {
  try {
    if (typeof currentPackage === "function") return currentPackage();
  } catch (e) {}
  return "";
}

function safeCurrentActivity() {
  try {
    if (typeof currentActivity === "function") return currentActivity();
  } catch (e) {}
  return "";
}

function logCurrentAppContext(prefix) {
  try {
    var pkg = safeCurrentPackage();
    var act = safeCurrentActivity();
    console.log(
      (prefix ? String(prefix) + " " : "") +
        "当前前台: pkg=" +
        String(pkg || "") +
        (act ? ", act=" + String(act || "") : "")
    );
  } catch (e) {}
}

function findElementByTextAny(targets, timeout, debugDesc) {
  timeout = timeout || 800;
  var startTs = Date.now();
  var lastTried = "";

  if (!targets || !targets.length) {
    if (debugDesc) console.warn("findElementByTextAny targets 为空: " + String(debugDesc));
    return null;
  }

  for (var round = 0; round < 3; round++) {
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t) continue;
      lastTried = String(t);

      var el = null;
      try { el = text(t).findOne(timeout); } catch (e0) { el = null; }
      if (!el) { try { el = textContains(t).findOne(250); } catch (e2) { el = null; } }
      if (!el) { try { el = desc(t).findOne(250); } catch (e1) { el = null; } }
      if (!el) { try { el = descContains(t).findOne(250); } catch (e3) { el = null; } }
      if (el) return el;
    }
    if (round < 2) sleep(220);
  }

  if (debugDesc) {
    console.warn(
      "findElementByTextAny 未找到: " +
        String(debugDesc) +
        ", targets=" +
        JSON.stringify(targets) +
        ", timeout=" +
        String(timeout) +
        ", lastTried=" +
        String(lastTried) +
        ", costMs=" +
        String(Date.now() - startTs)
    );
    logCurrentAppContext("findElementByTextAny失败");
  }
  return null;
}

function clickAnyText(targets, description, timeout) {
  var el = findElementByTextAny(targets, timeout, description);
  if (!el) return false;
  return safeClick(el, description + " - " + (el.text() || el.desc() || ""));
}

function clickClickableParent(el, description) {
  if (!el) return false;
  var cur = el;
  for (var i = 0; i < 6 && cur; i++) {
    try {
      if (cur.clickable && cur.clickable()) return safeClick(cur, description);
    } catch (e) {}
    try {
      cur = cur.parent ? cur.parent() : null;
    } catch (e2) {
      cur = null;
    }
  }
  return safeClick(el, description);
}

function shellBestEffort(cmd) {
  try {
    var r = shell(cmd, true);
    if (r && typeof r.code === "number" && r.code === 0) return true;
  } catch (e) {}
  try {
    var r2 = shell(cmd, false);
    if (r2 && typeof r2.code === "number" && r2.code === 0) return true;
  } catch (e2) {}
  return false;
}

function forceStopTikTok() {
  console.log("强制关闭 TikTok...");
  var ok = shellBestEffort("am force-stop " + TIKTOK_PACKAGE);
  console.log("force-stop 结果: " + ok);
  sleep(800);
}

function handleCommonDialogsOnce() {
  // 不要点 Cancel，避免把关键弹窗取消掉
  var buttons = [
    "Allow",
    "OK",
    "Skip",
    "Later",
    "Agree",
    "Accept",
    "I agree"
  ];
  return clickAnyText(buttons, "通用弹窗按钮", 300);
}

function isOnTikTokMainTab() {
  var tabs = ["Home", "Friends", "Inbox", "Profile", "Me", "首页", "朋友", "收件箱", "消息", "我", "个人资料"];
  for (var i = 0; i < tabs.length; i++) {
    if (textContains(tabs[i]).exists() || descContains(tabs[i]).exists()) return true;
  }
  return false;
}

function waitForPackage(pkg, timeoutMs) {
  timeoutMs = timeoutMs || 20000;
  var start = Date.now();
  while (Date.now() - start < timeoutMs) {
    var curPkg = safeCurrentPackage();
    if (curPkg === pkg) return true;
    try {
      if (isOnTikTokMainTab()) return true;
    } catch (e0) {}
    try { handleCommonDialogsOnce(); } catch (e1) {}
    sleep(300);
  }
  return false;
}

function backToMainTab(maxBack) {
  maxBack = maxBack || 8;
  for (var i = 0; i < maxBack; i++) {
    if (isOnTikTokMainTab()) return true;
    // try { handleCommonDialogsOnce(); } catch (e0) {}
    try { back(); } catch (e1) {}
    randomSleep(500, 900);
  }
  return isOnTikTokMainTab();
}

// ==================== 配置加载（必须保留） ====================

function normalizeTemplateParams(templateParams) {
  try {
    if (!templateParams) return null;
    if (typeof templateParams === "string") return JSON.parse(templateParams);
    if (typeof templateParams.toString === "function") {
      var str = String(templateParams);
      if (str && (str.indexOf("{") === 0 || str.indexOf("[") === 0)) {
        try { return JSON.parse(str); } catch (e0) {}
      }
    }
    if (typeof templateParams === "object") return templateParams;
    return null;
  } catch (e) {
    console.error("normalizeTemplateParams 失败:", e);
    return null;
  }
}

function normalizeUpdateConfig(obj) {
  try {
    obj = obj || {};
    var usernamesRaw = obj.usernames || obj.dm_username || obj.username || obj.to_username || obj.to || "";
    var messageRaw = obj.message_content || obj.dm_text || obj.text || obj.message || obj.content || "";

    var usernames = [];
    if (Array.isArray(usernamesRaw)) {
      usernames = usernamesRaw;
    } else {
      usernames = String(usernamesRaw || "").split(/[,，]/);
    }
    usernames = usernames
      .map(function(x) { return String(x || "").trim(); })
      .filter(function(x) { return !!x; });

    var messages = [];
    if (Array.isArray(messageRaw)) {
      messages = messageRaw;
    } else {
      messages = String(messageRaw || "").split(/[,，]/);
    }
    messages = messages
      .map(function(x) { return String(x || "").trim(); })
      .filter(function(x) { return !!x; });

    return {
      usernames: usernames,
      message_content: messages
    };
  } catch (e) {
    console.error("normalizeUpdateConfig 失败:", e);
    return null;
  }
}

function readLocalUpdateMd() {
  try {
    return DEFAULT_TEMPLATE_PARAMS_UPDATE_JSON;
  } catch (e) {
    console.warn("读取本地默认参数失败:", e);
    return null;
  }
}

function loadUpdateConfig() {
  try {
    var execArgv = null;
    if (typeof engines !== "undefined" && engines.myEngine && engines.myEngine().execArgv) {
      execArgv = engines.myEngine().execArgv;
    }

    if (execArgv && execArgv.task_id) globalTaskId = execArgv.task_id;
    else if (execArgv && execArgv.taskId) globalTaskId = execArgv.taskId;

    var rawParams = null;
    if (ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS) {
      rawParams = readLocalUpdateMd();
      console.log("使用本地默认私信参数跑通流程");
    } else if (execArgv && execArgv.template_params) {
      rawParams = execArgv.template_params;
    }

    if (!rawParams) {
      console.log("✗ template_params 不存在，且未启用本地默认参数");
      return false;
    }

    var paramsObj = normalizeTemplateParams(rawParams);
    if (!paramsObj) {
      console.log("✗ 参数解析失败");
      return false;
    }

    globalConfig = normalizeUpdateConfig(paramsObj);
    if (!globalConfig || !globalConfig.usernames || !globalConfig.usernames.length || !globalConfig.message_content || !globalConfig.message_content.length) {
      console.log("✗ 私信参数不完整:", globalConfig);
      return false;
    }

    console.log("✓ 配置加载成功:", globalConfig);
    return true;
  } catch (e) {
    console.error("加载配置失败:", e);
    return false;
  }
}

// ==================== 私信流程 ====================

function launchTikTok() {
  console.log("启动 TikTok...");
  if (FORCE_STOP_TIKTOK_BEFORE_LAUNCH) {
    forceStopTikTok();
  }
  logCurrentAppContext("启动前");
  app.launchPackage(TIKTOK_PACKAGE);
  logCurrentAppContext("launchPackage后");
  var ok = waitForPackage(TIKTOK_PACKAGE, 25000);
  logCurrentAppContext(ok ? "识别成功" : "识别失败");
  if (!ok) return false;
  randomSleep(10000, 15000);
  return true;
}

function openSearch() {
  console.log("点击搜索...");
  // 主页顶部/底部的 Search 入口各版本差异较大，这里 best-effort
  // if (clickAnyText(["Search", "搜索", "Discover", "发现"], "搜索入口", 900)) return true;

  // // 常见：放大镜图标 desc=Search
  // try {
    var el = descContains("Search").findOne(800);
    if (el) return clickClickableParent(el, "搜索入口(desc)");
  // } catch (e0) {}
  // try {
  //   var el2 = descContains("search").findOne(800);
  //   if (el2) return clickClickableParent(el2, "搜索入口(desc-lower)");
  // } catch (e1) {}

  // 坐标兜底：点击右上区域
  // try {
  //   // click(device.width * 0.92, device.height * 0.10);
  //   randomSleep(600, 900);
  //   return true;
  // } catch (e2) {}
  // return false;
  randomSleep(10000, 15000);
  return true;
}
function inputSearchKeyword(keyword) {
  console.log("输入搜索关键词:", keyword);
  var edit = null;
  var clear = id("c5m").findOne(5000);
  if(clear){
    clear.click();
    randomSleep(3000, 5000);
    console.log("已经有关键词, 清除关键词:");
  }
  try { edit = className("android.widget.EditText").findOne(5000); } catch (e0) { edit = null; }
  if (!edit) return false;
  try {
     edit.click();
     edit.setText(String(keyword)); 
    } catch (e1) { return false; }
    randomSleep(3000, 5000);
  // edit.imeEnter();
   // 触发搜索：优先点页面/键盘上的 Search 按钮，其次再回车兜底
   var searched= false;
    // 部分版本 Search 是文字按钮
  // searched =id("s30").click();
  // if (!searched) {
    click(957,150);
  //   console.log("点击坐标搜索");
  //   var dudu =id("s30").untilFindOne();
  //   console.log("点击---"+dudu);
  //   dudu.click();

  // }


  randomSleep(800, 1200);
  return true;
}

function isProbablySearchInputNode(node) {
  if (!node) return false;
  var cls = "";
  try { cls = node.className ? String(node.className() || "") : ""; } catch (e0) {}
  if (cls && cls.indexOf("EditText") >= 0) return true;
  try { if (node.editable && node.editable()) return true; } catch (e1) {}
  try {
    var b = node.bounds ? node.bounds() : null;
    if (b && typeof device !== "undefined" && device.height) {
      if (b.top < device.height * 0.18) return true;
    }
  } catch (e2) {}
  return false;
}

function openUserFromResults(username) {
  console.log("打开搜索结果用户:", username);
  // 尝试切到 Users
  clickAnyText(["Users", "User", "用户"], "Users Tab", 700);
  randomSleep(5600, 8000);
  // 兜底：点第一个头像/结果项
  try {
    var img = id("jxf").clickable(true).findOne(2500);
    if (img) return safeClick(img, "用户结果-头像(兜底)");
  } catch (e4) {}
  return false;
}

function openMessageEntryOnProfile() {
  console.log("进入 Message...");
  if (clickAnyText(["Message", "Messages", "消息", "发消息", "私信"], "Message 按钮", 2500)) return true;
  try {
    var el = textContains("Message").findOne(1500);
    if (el) return clickClickableParent(el, "Message 按钮(desc)");
  } catch (e0) {}
  return false;
}

function sendDmText(message) {
  console.log("输入私信内容，长度=" + String(message || "").length);
  var edit = null;
  try { edit = className("android.widget.EditText").findOne(5000); } catch (e0) { edit = null; }
  if (!edit) return false;
  try { edit.setText(String(message)); } catch (e1) { return false; }
  randomSleep(500, 900);

  // 发送
  // if (clickAnyText(["Send", "发送"], "发送按钮", 1200)) return true;
  try {
    var el = descContains("Send").findOne(1200);
    if (el) return clickClickableParent(el, "发送按钮(desc)");
  } catch (e2) {}
  try {
    var el2 = descContains("send").findOne(1200);
    if (el2) return clickClickableParent(el2, "发送按钮(desc-lower)");
  } catch (e3) {}
  // 坐标兜底：右下角
  try {
    click(device.width * 0.92, device.height * 0.90);
    randomSleep(500, 900);
    return true;
  } catch (e4) {}
  return false;
}

function sendPrivateMessage(cfg) {
  if (!launchTikTok()) return false;
  var usernames = cfg.usernames || [];
  var messages = cfg.message_content || [];
  var failed = [];

  for (var i = 0; i < usernames.length; i++) {
    var username = usernames[i];
    var msg = messages.length === 1 ? messages[0] : messages[i % messages.length];
    console.log("准备发送私信: to=" + username + ", msgIndex=" + (messages.length === 1 ? 0 : (i % messages.length)));

    randomSleep(800, 1200);
    if (!openSearch()) {
      failed.push(username + ":openSearch");
      backToMainTab(8);
      continue;
    }
    randomSleep(10000, 15000);

    if (!inputSearchKeyword(username)) {
      failed.push(username + ":inputSearch");
      backToMainTab(8);
      continue;
    }
    if (!openUserFromResults(username)) {
      failed.push(username + ":openUser");
      backToMainTab(8);
      continue;
    }
    randomSleep(10000, 15000);

    if (!openMessageEntryOnProfile()) {
      failed.push(username + ":openMessage");
      backToMainTab(8);
      continue;
    }
    randomSleep(10000, 15000);

    if (!sendDmText(msg)) {
      failed.push(username + ":send");
      backToMainTab(8);
      continue;
    }

    randomSleep(700, 1100);
    // backToMainTab(8);
  }

  // 回到 TikTok 主界面
  // backToMainTab(10);
  // forceStopTikTok();
  if (failed.length) {
    console.warn("部分发送失败:", failed);
    return false;
  }
  return true;
}

// ==================== 主流程 ====================

function main() {
  console.show();
  console.log("=== TikTok 私信脚本启动 ===");

  if (!loadUpdateConfig()) {
    failAndStop("加载私信参数失败");
  }

  var ok = sendPrivateMessage(globalConfig);
  if (!ok) {
    failAndStop("私信流程失败");
  }

  var summary =
    "私信发送成功" +
    (globalConfig.usernames && globalConfig.usernames.length ? ", users=" + String(globalConfig.usernames.length) : "") +
    (globalConfig.message_content && globalConfig.message_content.length ? ", msgs=" + String(globalConfig.message_content.length) : "");
  reportResult(true, summary);
  console.log(summary);
}

main();
