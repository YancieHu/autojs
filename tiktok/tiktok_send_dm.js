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
  usernames: "chthyanh971,ngquchong4983,anthony.morgan582",
  message_content: "Hi 😊"
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

function hasSearchEntryOnCurrentPage() {
  try {
    if (descContains("Search").exists() || descContains("search").exists()) return true;
  } catch (e0) {}
  try {
    if (text("Search").exists() || text("搜索").exists()) return true;
  } catch (e1) {}
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
    if (isSearchPageReady()) {
      console.log("当前在搜索页，先返回上一层");
      try { back(); } catch (e0) {}
      randomSleep(500, 900);
      continue;
    }
    if (isOnTikTokMainTab() && hasSearchEntryOnCurrentPage()) return true;
    try { back(); } catch (e1) {}
    randomSleep(500, 900);
  }
  return isOnTikTokMainTab() && hasSearchEntryOnCurrentPage();
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

function logNodeSummary(node, prefix) {
  if (!node) return;
  try {
    var b = node.bounds ? node.bounds() : null;
    var t = node.text ? String(node.text() || "") : "";
    var d = node.desc ? String(node.desc() || "") : "";
    var cls = node.className ? String(node.className() || "") : "";
    var rid = node.id ? String(node.id() || "") : "";
    var clickable = node.clickable ? !!node.clickable() : null;
    console.log(
      prefix +
        " [text=" +
        t +
        ", desc=" +
        d +
        ", id=" +
        rid +
        ", class=" +
        cls +
        ", clickable=" +
        clickable +
        ", bounds=" +
        (b ? "(" + b.left + "," + b.top + "," + b.right + "," + b.bottom + ")" : "") +
        "]"
    );
  } catch (e) {}
}

function dumpSearchTriggerDebug(keyword) {
  console.log("===== 搜索触发诊断开始 ===== keyword=" + String(keyword || ""));
  try {
    var edit = className("android.widget.EditText").findOne(500);
    if (edit) logNodeSummary(edit, "搜索框");
    else console.log("搜索框 未找到");
  } catch (e0) {}

  try {
    var searchTexts = ["Search", "Users", "Top", "Videos"];
    for (var i = 0; i < searchTexts.length; i++) {
      var txt = searchTexts[i];
      var n = text(txt).findOne(300);
      if (n) logNodeSummary(n, "文本候选-" + txt);
    }
  } catch (e1) {}

  try {
    var descNode = descContains("Search").findOne(500) || descContains("search").findOne(500);
    if (descNode) logNodeSummary(descNode, "搜索按钮(desc候选)");
    else console.log("搜索按钮(desc候选) 未找到");
  } catch (e2) {}

  try {
    var clickableNodes = clickable(true).find();
    var count = 0;
    if (clickableNodes) {
      clickableNodes.forEach(function(n) {
        if (count >= 8) return;
        try {
          var b = n.bounds();
          if (!b) return;
          if (b.top > device.height * 0.22) return;
          logNodeSummary(n, "顶部可点击#" + count);
          count++;
        } catch (e) {}
      });
    }
    console.log("顶部可点击候选数量=" + count);
  } catch (e3) {}
  console.log("===== 搜索触发诊断结束 =====");
}

var MESSAGE_ENTRY_TARGETS = ["Message", "Messages", "消息", "发消息", "私信"];

function isSearchPageReady() {
  try {
    var edit = className("android.widget.EditText").findOne(300);
    if (!edit) return false;
    var b = null;
    try { b = edit.bounds(); } catch (e0) { b = null; }
    if (b && b.top < device.height * 0.20) return true;
  } catch (e) {}
  return false;
}

function openSearch() {
  console.log("点击搜索...");

  if (isSearchPageReady()) {
    console.log("当前已在搜索页，无需重复点击搜索入口");
    return true;
  }

  if (!isOnTikTokMainTab() || !hasSearchEntryOnCurrentPage()) {
    console.log("当前页面不是可直接搜索的起点，先尝试返回主界面");
    backToMainTab(8);
    randomSleep(600, 900);
    if (isSearchPageReady()) return true;
  }

  var el = null;
  try { el = descContains("Search").findOne(1200); } catch (e0) { el = null; }
  if (!el) {
    try { el = descContains("search").findOne(1200); } catch (e1) { el = null; }
  }
  if (el) {
    var ok = clickClickableParent(el, "搜索入口(desc)");
    if (ok) {
      randomSleep(600, 900);
      if (isSearchPageReady()) return true;
      console.warn("点击搜索入口后仍未进入搜索页");
    }
  }

  try {
    click(device.width * 0.92, device.height * 0.10);
    console.log("搜索入口坐标兜底已执行");
    randomSleep(600, 900);
    if (isSearchPageReady()) return true;
  } catch (e2) {}

  console.warn("openSearch 失败：未进入搜索页");
  logCurrentAppContext("openSearch失败");
  return false;
}
function findSearchSubmitButtonNearEdit(edit) {
  var editBounds = null;
  try { editBounds = edit && edit.bounds ? edit.bounds() : null; } catch (e0) { editBounds = null; }

  // 优先找右上角明确的 Search 文本按钮
  try {
    var searchTextBtn = text("Search").clickable(true).findOne(400) || text("搜索").clickable(true).findOne(400);
    if (searchTextBtn) {
      var b0 = searchTextBtn.bounds();
      if (b0 && b0.top < device.height * 0.20) return searchTextBtn;
    }
  } catch (e1) {}

  // 再找搜索框右侧的可点击 Button（不依赖固定 id）
  try {
    var buttons = className("android.widget.Button").clickable(true).find();
    if (buttons) {
      var best = null;
      var bestScore = 999999;
      buttons.forEach(function(n) {
        try {
          var b = n.bounds();
          if (!b) return;
          if (b.top > device.height * 0.22) return;
          if (editBounds) {
            if (b.left < editBounds.right - 40) return;
            if (Math.abs(b.centerY() - editBounds.centerY()) > 80) return;
          }
          var score = Math.abs(device.width - b.right) + Math.abs(b.top);
          if (score < bestScore) {
            bestScore = score;
            best = n;
          }
        } catch (e) {}
      });
      if (best) return best;
    }
  } catch (e2) {}

  return null;
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
    try { logNodeSummary(edit, "输入后搜索框"); } catch (e1b) {}
    randomSleep(3000, 5000);
  dumpSearchTriggerDebug(keyword);
  // 触发搜索：优先点顶部右侧真实 Search 按钮；最后才坐标兜底
  var searched = false;
  var searchBtn = findSearchSubmitButtonNearEdit(edit);
  if (searchBtn) {
    logNodeSummary(searchBtn, "搜索提交按钮命中");
    searched = safeClick(searchBtn, "搜索提交按钮");
  }
  if (!searched) {
    console.log("执行搜索坐标点击 point=(957,150)");
    try { searched = !!click(957,150); } catch (e2) { searched = false; }
  }

  randomSleep(800, 1200);
  return searched;
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

function normalizeVisibleText(s) {
  return String(s || "").replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
}

function isFollowerMetaText(s) {
  var textValue = normalizeVisibleText(s).toLowerCase();
  return (
    textValue.indexOf("followers") >= 0 ||
    textValue.indexOf("likes") >= 0 ||
    textValue.indexOf("follower") >= 0 ||
    textValue.indexOf("粉丝") >= 0 ||
    textValue.indexOf("获赞") >= 0
  );
}

function findFollowerMetaNearNode(anchorNode) {
  if (!anchorNode) return null;
  var anchorBounds = null;
  try { anchorBounds = anchorNode.bounds(); } catch (e0) { anchorBounds = null; }
  if (!anchorBounds) return null;

  var best = null;
  var bestScore = 999999;
  try {
    var texts = className("android.widget.TextView").find();
    if (texts) {
      texts.forEach(function(n) {
        try {
          var rawText = n.text ? n.text() : "";
          if (!isFollowerMetaText(rawText)) return;
          var b = n.bounds();
          if (!b) return;
          if (b.top < anchorBounds.bottom - 10) return;
          if (b.top > anchorBounds.bottom + 140) return;
          if (Math.abs(b.left - anchorBounds.left) > 80) return;
          var score = Math.abs(b.top - anchorBounds.bottom) + Math.abs(b.left - anchorBounds.left);
          if (score < bestScore) {
            bestScore = score;
            best = n;
          }
        } catch (e) {}
      });
    }
  } catch (e1) {}
  return best;
}

function buildUserResultTapTarget(textNode, reason) {
  if (!textNode) return null;
  var textBounds = null;
  try { textBounds = textNode.bounds(); } catch (e0) { textBounds = null; }
  if (!textBounds) return null;

  var metaNode = findFollowerMetaNearNode(textNode);
  var metaBounds = null;
  try { metaBounds = metaNode ? metaNode.bounds() : null; } catch (e1) { metaBounds = null; }

  var x = Math.floor(Math.max(device.width * 0.28, Math.min(device.width * 0.60, textBounds.left + 120)));
  var y = 0;
  if (metaBounds) y = Math.floor((textBounds.centerY() + metaBounds.centerY()) / 2);
  else y = Math.floor(textBounds.centerY() + 28);

  return {
    x: x,
    y: y,
    reason: reason,
    text: normalizeVisibleText(textNode.text ? textNode.text() : ""),
    hasMeta: !!metaBounds,
    textBounds: textBounds,
    metaBounds: metaBounds
  };
}

function findFirstUserResult(username) {
  var normalizedUsername = normalizeVisibleText(username);
  var prefix = normalizedUsername.length > 12 ? normalizedUsername.substring(0, 12) : normalizedUsername;

  try {
    var exactNodes = className("android.widget.TextView").find();
    if (exactNodes) {
      var exactHit = null;
      exactNodes.forEach(function(n) {
        if (exactHit) return;
        try {
          var rawText = n.text ? n.text() : "";
          var normalizedText = normalizeVisibleText(rawText);
          if (!normalizedText) return;
          if (normalizedText !== normalizedUsername) return;
          var b = n.bounds();
          if (!b || b.top < device.height * 0.15 || b.top > device.height * 0.85) return;
          exactHit = buildUserResultTapTarget(n, "精确用户名匹配");
        } catch (e) {}
      });
      if (exactHit) {
        console.log("findFirstUserResult: 精确匹配命中 text=" + exactHit.text + ", hasMeta=" + exactHit.hasMeta);
        return exactHit;
      }
    }
  } catch (e0) {}

  try {
    var prefixNodes = className("android.widget.TextView").find();
    if (prefixNodes) {
      var prefixHit = null;
      prefixNodes.forEach(function(n) {
        if (prefixHit) return;
        try {
          var rawText = n.text ? n.text() : "";
          var normalizedText = normalizeVisibleText(rawText);
          if (!normalizedText) return;
          if (normalizedText.indexOf(prefix) !== 0) return;
          var b = n.bounds();
          if (!b || b.top < device.height * 0.15 || b.top > device.height * 0.85) return;
          if (!findFollowerMetaNearNode(n)) return;
          prefixHit = buildUserResultTapTarget(n, "前缀匹配+followers校验");
        } catch (e) {}
      });
      if (prefixHit) {
        console.log("findFirstUserResult: 前缀匹配命中 text=" + prefixHit.text + ", hasMeta=" + prefixHit.hasMeta);
        return prefixHit;
      }
    }
  } catch (e1) {}

  try {
    var metas = className("android.widget.TextView").find();
    if (metas) {
      var fallbackHit = null;
      metas.forEach(function(n) {
        if (fallbackHit) return;
        try {
          var rawText = n.text ? n.text() : "";
          if (!isFollowerMetaText(rawText)) return;
          var b = n.bounds();
          if (!b || b.top < 350 || b.top > device.height * 0.85) return;
          var x = Math.floor(device.width * 0.40);
          var y = Math.floor(b.centerY() - 36);
          fallbackHit = {
            x: x,
            y: y,
            reason: "followers区域位置兜底",
            text: normalizeVisibleText(rawText),
            hasMeta: true,
            textBounds: b,
            metaBounds: b
          };
        } catch (e) {}
      });
      if (fallbackHit) {
        console.log("findFirstUserResult: followers位置兜底命中 text=" + fallbackHit.text);
        return fallbackHit;
      }
    }
  } catch (e2) {}

  return null;
}

function isStillOnUserSearchResults(keyword) {
  var normalizedKeyword = normalizeVisibleText(keyword);
  try {
    if ((text("Users").exists() || text("Top").exists() || text("Videos").exists()) && className("android.widget.EditText").exists()) {
      var edit = className("android.widget.EditText").findOne(300);
      if (edit) {
        var value = normalizeVisibleText(edit.text ? edit.text() : "");
        if (!normalizedKeyword || value.indexOf(normalizedKeyword) >= 0 || normalizedKeyword.indexOf(value) >= 0) return true;
      }
    }
  } catch (e) {}
  return false;
}

function tapUserResultTarget(target, username, attempt) {
  if (!target) return false;
  console.log(
    "点击用户结果: attempt=" +
      attempt +
      ", reason=" +
      target.reason +
      ", text=" +
      target.text +
      ", hasMeta=" +
      target.hasMeta +
      ", point=(" +
      target.x +
      "," +
      target.y +
      ")"
  );
  var ok = false;
  try { ok = click(target.x, target.y); } catch (e0) { ok = false; }
  console.log("点击用户结果坐标结果: " + ok);
  if (!ok) return false;
  randomSleep(900, 1400);

  if (isStillOnUserSearchResults(username)) {
    console.warn("点击后仍停留在搜索结果页，尝试备用点位");
    var backupX = Math.floor(device.width * 0.18);
    var backupY = target.metaBounds ? target.metaBounds.centerY() : target.y;
    try { ok = click(backupX, backupY); } catch (e1) { ok = false; }
    console.log("备用点位点击结果: " + ok + " point=(" + backupX + "," + backupY + ")");
    if (ok) randomSleep(900, 1400);
    if (isStillOnUserSearchResults(username)) {
      console.warn("备用点位后仍停留在搜索结果页，本轮点击视为失败");
      return false;
    }
  }
  return true;
}

function openUserFromResults(username) {
  console.log("打开搜索结果用户:", username);
  clickAnyText(["Users", "User", "用户"], "Users Tab", 1500);
  randomSleep(3000, 5000);

  for (var attempt = 0; attempt < 3; attempt++) {
    var target = findFirstUserResult(username);
    if (target) {
      if (tapUserResultTarget(target, username, attempt)) return true;
    }
    console.log("openUserFromResults attempt=" + attempt + " 未完成跳转，等待重试...");
    randomSleep(1800, 2600);
  }

  console.warn("openUserFromResults 所有策略均未命中: " + username);
  logCurrentAppContext("openUserFromResults失败");
  return false;
}

function isOwnProfilePage() {
  try {
    if (text("Edit profile").exists() || text("Edit Profile").exists() || text("编辑资料").exists() || text("编辑个人资料").exists()) {
      return true;
    }
  } catch (e0) {}
  try {
    if (textContains("Share profile").exists() || textContains("分享个人资料").exists()) {
      return true;
    }
  } catch (e1) {}
  try {
    if (text("Edit").exists() || text("编辑").exists()) return true;
  } catch (e2) {}
  return false;
}

function findMessageEntry() {
  console.log("===== 查找Message入口 =====");

  // 第一层：精确/包含文本匹配
  for (var i = 0; i < MESSAGE_ENTRY_TARGETS.length; i++) {
    var t = MESSAGE_ENTRY_TARGETS[i];
    try {
      var exact = text(t).findOne(300);
      if (exact) {
        logNodeSummary(exact, "Message入口命中(text)-" + t);
        return exact;
      }
    } catch (e0) {}
    try {
      var contains = textContains(t).findOne(200);
      if (contains) {
        logNodeSummary(contains, "Message入口命中(textContains)-" + t);
        return contains;
      }
    } catch (e1) {}
  }

  // 第二层：遍历中部可点击节点，按文本匹配
  try {
    var clickableNodes = clickable(true).find();
    if (clickableNodes) {
      var best = null;
      var targetsSet = {};
      for (var j = 0; j < MESSAGE_ENTRY_TARGETS.length; j++) targetsSet[MESSAGE_ENTRY_TARGETS[j]] = true;
      clickableNodes.forEach(function(n) {
        if (best) return;
        try {
          var nt = n.text ? String(n.text() || "") : "";
          if (!nt || !targetsSet[nt]) return;
          var b = n.bounds();
          if (b && b.top > device.height * 0.25 && b.bottom < device.height * 0.92) {
            logNodeSummary(n, "Message入口命中(clickable遍历)");
            best = n;
          }
        } catch (e) {}
      });
      if (best) return best;
    }
  } catch (e2) {}

  console.log("当前页面未找到 Message 入口");
  return null;
}

function openMessageEntryOnProfile() {
  console.log("进入 Message...");

  if (isOwnProfilePage()) {
    console.warn("当前进入的是自己的主页/可编辑主页，没有 Message 按钮，直接跳过查找");
    return false;
  }

  var messageNode = findMessageEntry();
  if (messageNode) {
    if (clickClickableParent(messageNode, "Message 按钮")) return true;
  }

  console.warn("当前页面未找到 Message 按钮");
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
      if (isOwnProfilePage()) {
        console.warn("目标用户疑似当前登录账号，跳过发送: " + username);
      } else {
        failed.push(username + ":openMessage");
      }
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
