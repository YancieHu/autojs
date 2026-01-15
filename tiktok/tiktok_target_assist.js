/**
 * TikTok 点评关脚本（英文/中文界面 best-effort）
 *
 * 参数来源：engines.myEngine().execArgv.template_params
 * 本地调试：默认使用脚本内置 JSON
 *
 * 支持字段：
 * - usernames: 目标用户名（逗号分隔字符串，或数组）
 * - comment_content: 私信内容（逗号分隔字符串，或数组）
 */

// ==================== 全局变量 ====================
var globalTaskId = "50001";
var globalConfig = null;
var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";
var FORCE_STOP_TIKTOK_BEFORE_LAUNCH = true;

// ==================== 本地调试默认参数 ====================
var ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS = false;
var DEFAULT_TEMPLATE_PARAMS_UPDATE_JSON = JSON.stringify(
  {
    "usernames": "kimkamkim",
    "actions": ["comment", "like", "follow"],
    "comment_content": "评论内容",
    "comment_count_begin": 2,
    "comment_count_end": 4,
    "like_count_begin": 0,
    "like_count_end": 0,
    "video_watch_time_begin": 10,
    "video_watch_time_end": 30
  }
);

// ==================== 结果上报（必须保留） ====================

function reportResult(isSuccess, message) {
  try {
    if (globalTaskId && typeof scriptUtils !== "undefined") {
      var resultMap = {
        status: isSuccess ? "success" : "failed",
        result: isSuccess ? String(message || "") : "点评关失败: " + String(message || ""),
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

function randomIntBetween(a, b) {
  var start = parseInt(a, 0);
  var end = parseInt(b, 0);
  if (isNaN(start)) start = 0;
  if (isNaN(end)) end = 0;
  var minV = Math.min(start, end);
  var maxV = Math.max(start, end);
  return Math.floor(Math.random() * (maxV - minV + 1)) + minV;
}

function getLikeButtonSignatureForDebug() {
  // 用于排查“是否真的翻页”：抓一个相对稳定、且随视频变化的节点描述（常见为 Like 按钮 desc 里带点赞数）
  var el = null;
  try { el = descContains("Like video").findOne(350); } catch (e0) { el = null; }
  if (!el) { try { el = descContains("Liked video").findOne(350); } catch (e1) { el = null; } }
  if (!el) { try { el = descContains("Like").findOne(350); } catch (e2) { el = null; } }
  if (!el) { try { el = descContains("点赞").findOne(350); } catch (e3) { el = null; } }
  if (!el) return "no-like-node";

  var d = "";
  var cls = "";
  var b = null;
  try { d = el.desc ? String(el.desc() || "") : ""; } catch (e4) {}
  try { cls = el.className ? String(el.className() || "") : ""; } catch (e5) {}
  try { b = el.bounds ? el.bounds() : null; } catch (e6) { b = null; }
  var bStr = "";
  try { if (b) bStr = "(" + b.left + "," + b.top + "," + b.right + "," + b.bottom + ")"; } catch (e7) {}

  // desc 可能很长，截断便于看 diff
  var dShort = d;
  try { if (dShort.length > 80) dShort = dShort.slice(0, 80) + "..."; } catch (e8) {}
  return "desc=" + dShort + "|class=" + cls + "|bounds=" + bStr;
}

function hasVideoInputBarHint() {
  // 按你给的“刚刚评论成功的控件”来判断：只看 Post comment 是否存在
  try { return !!descContains("Post comment").exists(); } catch (e0) {}
  return false;
}

function actionsHas(cfg, keyEn, keyZh) {
  try {
    var actions = (cfg && cfg.actions) ? cfg.actions : [];
    for (var i = 0; i < actions.length; i++) {
      var a = String(actions[i] || "").trim();
      if (!a) continue;
      if (keyZh && a === keyZh) return true;
      if (keyEn && a.toLowerCase() === String(keyEn).toLowerCase()) return true;
    }
  } catch (e) {}
  return false;
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
    var messageRaw = obj.comment_content || obj.dm_text || obj.text || obj.message || obj.content || "";
    var actionsRaw = obj.actions || obj.action || obj.ops || obj.operation || [];
    var likeCountBeginRaw = obj.like_count_begin;
    var likeCountEndRaw = obj.like_count_end;
    var watchTimeBeginRaw = obj.video_watch_time_begin;
    var watchTimeEndRaw = obj.video_watch_time_end;
    var commentCountBeginRaw = obj.comment_count_begin;
    var commentCountEndRaw = obj.comment_count_end;

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

    var actions = [];
    if (Array.isArray(actionsRaw)) {
      actions = actionsRaw;
    } else {
      actions = String(actionsRaw || "").split(/[,，]/);
    }
    actions = actions
      .map(function(x) { return String(x || "").trim(); })
      .filter(function(x) { return !!x; });

    var likeCountBegin = parseInt(likeCountBeginRaw, 10);
    var likeCountEnd = parseInt(likeCountEndRaw, 10);
    var watchTimeBegin = parseInt(watchTimeBeginRaw, 10);
    var watchTimeEnd = parseInt(watchTimeEndRaw, 10);
    var commentCountBegin = parseInt(commentCountBeginRaw, 10);
    var commentCountEnd = parseInt(commentCountEndRaw, 10);
    if (isNaN(likeCountBegin)) likeCountBegin = 0;
    if (isNaN(likeCountEnd)) likeCountEnd = 0;
    if (isNaN(watchTimeBegin)) watchTimeBegin = 0;
    if (isNaN(watchTimeEnd)) watchTimeEnd = 0;
    if (isNaN(commentCountBegin)) commentCountBegin = 0;
    if (isNaN(commentCountEnd)) commentCountEnd = 0;

    return {
      usernames: usernames,
      comment_content: messages,
      actions: actions,
      like_count_begin: likeCountBegin,
      like_count_end: likeCountEnd,
      video_watch_time_begin: watchTimeBegin,
      video_watch_time_end: watchTimeEnd,
      comment_count_begin: commentCountBegin,
      comment_count_end: commentCountEnd
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
      console.log("使用本地默认点评关参数跑通流程");
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
    if (!globalConfig || !globalConfig.usernames || !globalConfig.usernames.length || !globalConfig.comment_content || !globalConfig.comment_content.length) {
      console.log("✗ 点评关参数不完整:", globalConfig);
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

function openFlow() {
  var actions = [];
  try { actions = (globalConfig && globalConfig.actions) ? globalConfig.actions : []; } catch (e0) { actions = []; }

  var needFollow = false;
  for (var i = 0; i < actions.length; i++) {
    var a = String(actions[i] || "").trim();
    if (!a) continue;
    if (a === "关注" || a.toLowerCase() === "follow") {
      needFollow = true;
      break;
    }
  }

  if (!needFollow) {
    console.log("actions 未包含 follow/关注，跳过关注");
    return true;
  }

  console.log("开始关注... actions=" + JSON.stringify(actions));
  if (clickAnyText(["Follow", "关注"], "Follow 按钮", 2500)) return true;
  try {
    var el = textContains("Follow").findOne(1500);
    if (el) return clickClickableParent(el, "Follow 按钮(desc)");
  } catch (e0) {}
  return false;
}

function openVideoForLikeOrComment() {
  var actions = [];
  try { actions = (globalConfig && globalConfig.actions) ? globalConfig.actions : []; } catch (e0) { actions = []; }

  var need = false;
  for (var i = 0; i < actions.length; i++) {
    var a = String(actions[i] || "").trim();
    if (!a) continue;
    var lower = a.toLowerCase();
    if (lower === "comment" || lower === "like" || a === "评论" || a === "点赞") {
      need = true;
      break;
    }
  }

  if (!need) {
    console.log("actions 未包含 comment/like（评论/点赞），跳过视频浏览");
    return true;
  }

  console.log("actions 包含 comment/like，准备进入视频列表页面 actions=" + JSON.stringify(actions));

  // 先滑动一屏，进入用户主页的视频列表区域
  try {
    swipe(device.width * 0.5, device.height * 0.80, device.width * 0.5, device.height * 0.30, 700);
  } catch (e1) {
    console.warn("滑动进入视频列表异常: " + e1);
  }
  randomSleep(1200, 1800);

  // 查找视频列表元素（id=e17），点击第一个进入浏览视频
  var first = null;
  try {
    var list = id("e17").find();
    var size = 0;
    try { size = list.size(); } catch (e2) { size = list.length || 0; }
    console.log("视频列表候选(id=e17) 数量=" + String(size));
    if (size > 0) {
      try { first = list.get(0); } catch (e3) { first = list[0]; }
    }
  } catch (e4) {
    console.warn("查找视频列表(id=e17)异常: " + e4);
  }

  if (!first) {
    console.warn("未找到视频列表元素(id=e17)，无法进入浏览视频");
    return false;
  }

  return clickClickableParent(first, "视频列表-第一个视频(id=e17)");
}

function clickLikeButtonOnce() {
  // 已点赞判定（尽量避免重复点导致取消）
  try {
    if (textContains("Liked").exists() || descContains("Liked").exists()) return true;
  } catch (e0) {}
  try {
    if (textContains("已赞").exists() || textContains("已点赞").exists()) return true;
  } catch (e1) {}

  // 常见：右侧心形按钮 desc=Like/点赞
  try {
    var el = descContains("Like").clickable(true).findOne(700);
    if (el) return clickClickableParent(el, "点赞按钮(descContains Like)");
  } catch (e2) {}
  try {
    var el2 = descContains("点赞").clickable(true).findOne(700);
    if (el2) return clickClickableParent(el2, "点赞按钮(descContains 点赞)");
  } catch (e3) {}

  // 文本兜底（可能误点，尽量最后用）
  if (clickAnyText(["Like", "点赞"], "点赞按钮(文本兜底)", 500)) return true;

  // 坐标兜底：TikTok 常见心形在右侧中下区域
  try {
    click(device.width * 0.92, device.height * 0.55);
    randomSleep(300, 600);
    return true;
  } catch (e4) {}
  return false;
}

function pickCommentText(cfg, index) {
  try {
    var arr = (cfg && cfg.comment_content) ? cfg.comment_content : [];
    if (!arr || !arr.length) return "";
    if (arr.length === 1) return String(arr[0] || "");
    return String(arr[index % arr.length] || "");
  } catch (e) {}
  return "";
}

function sendCommentOnce(commentText) {
  var txt = String(commentText || "").trim();
  if (!txt) {
    console.warn("评论内容为空，跳过评论");
    return false;
  }

  // 打开评论面板
  var opened = false;
  try { opened = clickAnyText(["Comment", "评论"], "评论按钮", 1200); } catch (e0) { opened = false; }
  if (!opened) {
    try {
      var c1 = descContains("Comment").clickable(true).findOne(800);
      if (c1) opened = clickClickableParent(c1, "评论按钮(descContains Comment)");
    } catch (e1) {}
  }
  randomSleep(800, 1200);

  // 找输入框并输入
  var edit = null;
  try { edit = className("android.widget.EditText").findOne(2500); } catch (e2) { edit = null; }
  if (!edit) {
    console.warn("未找到评论输入框(EditText)");
    try { back(); } catch (e3) {}
    randomSleep(600, 900);
    return false;
  }
  try { edit.click(); } catch (e4) {}
  try { edit.setText(txt); } catch (e5) { return false; }
  randomSleep(500, 900);

  // 发送/发布
  if (clickAnyText(["Post", "Send", "发送", "发布"], "发送评论按钮", 1200)) {
    randomSleep(800, 1200);
    // try { back(); } catch (e6) {}
    randomSleep(500, 900);
    return true;
  }
  try {
    var s1 = descContains("Send").clickable(true).findOne(800);
    if (s1) {
      clickClickableParent(s1, "发送评论按钮(descContains Send)");
      randomSleep(800, 1200);
    //   try { back(); } catch (e7) {}
      randomSleep(500, 900);
      return true;
    }
  } catch (e8) {}
  randomSleep(500, 900);
  return true;
}

function browseVideosAndLikeIfNeeded(cfg) {
  var needLike = actionsHas(cfg, "like", "点赞");
  var needComment = actionsHas(cfg, "comment", "评论");
  if (!needLike && !needComment) {
    console.log("actions 未包含 like/comment（点赞/评论），跳过视频互动");
    return true;
  }

  var likeTarget = needLike ? randomIntBetween(cfg.like_count_begin, cfg.like_count_end) : 0;
  var commentTarget = needComment ? randomIntBetween(cfg.comment_count_begin, cfg.comment_count_end) : 0;
  var browseTarget = Math.max(likeTarget, commentTarget);

  console.log(
    "点赞目标(随机)=" + String(likeTarget) + ", range=[" + String(cfg.like_count_begin) + "," + String(cfg.like_count_end) + "]" +
    "; 评论目标(随机)=" + String(commentTarget) + ", range=[" + String(cfg.comment_count_begin) + "," + String(cfg.comment_count_end) + "]" +
    "; 游览数量=max=" + String(browseTarget)
  );

  if (browseTarget <= 0) {
    console.log("游览数量<=0，视为无需互动");
    return true;
  }

  var liked = 0;
  var commented = 0;
  for (var i = 0; i < browseTarget; i++) {

    var watchSec = randomIntBetween(cfg.video_watch_time_begin, cfg.video_watch_time_end);
    if (watchSec < 0) watchSec = 0;
    console.log(
      "浏览视频#" +
        String(i + 1) +
        "/" +
        String(browseTarget) +
        " 观看=" +
        String(watchSec) +
        "s, 点赞进度=" +
        String(liked) +
        "/" +
        String(likeTarget) +
        ", 评论进度=" +
        String(commented) +
        "/" +
        String(commentTarget)
    );
    logCurrentAppContext("浏览视频-开始");
    console.log("屏幕尺寸 device=" + String(device.width) + "x" + String(device.height));
    console.log("视频签名(开始)=" + getLikeButtonSignatureForDebug());
    try { sleep(watchSec * 1000); } catch (e0) {}

    if (needLike && liked < likeTarget) {
      var likeOk = false;
      try { likeOk = clickLikeButtonOnce(); } catch (e1) { likeOk = false; }
      if (likeOk) liked++;
      console.log("点赞结果=" + String(likeOk) + ", 当前已点赞=" + String(liked));
      console.log("视频签名(点赞后)=" + getLikeButtonSignatureForDebug());
    }

    if (needComment && commented < commentTarget) {
      var commentText = pickCommentText(cfg, commented);
      console.log("准备评论: idx=" + String(commented) + ", textLen=" + String(commentText ? commentText.length : 0));
      var cOk = false;
      try { cOk = sendCommentOnce(commentText); } catch (e2) { cOk = false; }
      if (cOk) commented++;
      console.log("评论结果=" + String(cOk) + ", 当前已评论=" + String(commented));
    }

    if (liked >= likeTarget && commented >= commentTarget) {
      console.log("已达到点赞/评论目标，提前停止浏览 liked=" + String(liked) + ", commented=" + String(commented));
      return true;
    }

    // 滑到下一个视频；如果用户视频已结束，可能出现“没有更多/到尽头”等提示
    var preSwipeSig = getLikeButtonSignatureForDebug();
    console.log("准备滑动到下一个视频: from=(" + Math.floor(device.width * 0.5) + "," + Math.floor(device.height * 0.78) + ") to=(" + Math.floor(device.width * 0.5) + "," + Math.floor(device.height * 0.25) + "), dur=650");
    console.log("视频签名(滑动前)=" + preSwipeSig);
    var swipeOk = null;
    try {
    //   swipeOk = swipe(device.width * 0.5, device.height * 0.78, device.width * 0.5, device.height * 0.25, 650);
      swipeOk = swipeToNextVideo();
    } catch (e2) {
      console.warn("滑到下一个视频异常: " + e2);
      return true; // 无法继续就按“视频刷完也算完成”
    }
    console.log("swipe 返回=" + String(swipeOk));
    randomSleep(900, 1400);
    var postSwipeSig = getLikeButtonSignatureForDebug();
    console.log("视频签名(滑动后)=" + postSwipeSig);
    var hasInputBar = false;
    try { hasInputBar = hasVideoInputBarHint(); } catch (e22) { hasInputBar = false; }
    console.log("视频输入栏探测=" + (hasInputBar ? "存在" : "不存在"));
    if (!hasInputBar) {
      console.log("滑动后未检测到视频输入栏，认为没有更多可游览视频，提前结束");
      return true;
    }
    if (preSwipeSig !== "no-like-node" && postSwipeSig !== "no-like-node" && preSwipeSig === postSwipeSig) {
      console.warn("滑动后视频签名未变化：可能未翻页/被面板拦截/节点未刷新");
    }

    try {
      var endHints = ["No more videos", "No more", "You've reached the end", "End", "没有更多", "到尽头", "已到尽头"];
      for (var k = 0; k < endHints.length; k++) {
        if (textContains(endHints[k]).exists() || descContains(endHints[k]).exists()) {
          console.log("检测到视频已结束提示: " + endHints[k] + "，提前结束浏览");
          return true; // 没达到目标也算完成
        }
      }
    } catch (e3) {}
  }

  console.log("已按游览数量完成，最终 liked=" + String(liked) + "/" + String(likeTarget) + ", commented=" + String(commented) + "/" + String(commentTarget));
  return true;
}

/**
 * 滑动到下一个视频
 */
function swipeToNextVideo  () {
    var swipeOk = null;
    try {
        // 获取屏幕尺寸
        var screenWidth = device.width || 1080;
        var screenHeight = device.height || 1920;

        // 定义滑动区域（避免触碰到边缘按钮）
        var centerX = screenWidth / 2;
        var startY = Math.floor(screenHeight * 0.7);
        var endY = Math.floor(screenHeight * 0.3);
        var duration = randomIntBetween(300, 700);

        console.log("滑动到下一个视频: (" + centerX + ", " + startY + ") -> (" + centerX + ", " + endY + ")");
        swipeOk= swipe(centerX, startY, centerX, endY, duration);
        this.randomSleep(1000, 2000);

    } catch (error) {
        console.error("滑动操作失败:", error);
    }
    return swipeOk;
};

function sendPrivateMessage(cfg) {
  if (!launchTikTok()) return false;
  var usernames = cfg.usernames || [];
  var messages = cfg.comment_content || [];
  var failed = [];

  for (var i = 0; i < usernames.length; i++) {
    var username = usernames[i];
    var msg = messages.length === 1 ? messages[0] : messages[i % messages.length];
    console.log("准备点评关: to=" + username + ", msgIndex=" + (messages.length === 1 ? 0 : (i % messages.length)));

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

    if (!openFlow()) {
      failed.push(username + ":openMessage");
      backToMainTab(8);
      continue;
    }
    randomSleep(10000, 15000);

    if (!openVideoForLikeOrComment()) {
      failed.push(username + ":openVideo");
      backToMainTab(8);
      continue;
    }
    randomSleep(10000, 15000);
  
    if (!browseVideosAndLikeIfNeeded(cfg)) {
      failed.push(username + ":like");
      backToMainTab(8);
      continue;
    }
    randomSleep(2000, 3500);

  

    randomSleep(700, 1100);
    backToMainTab(8);
  }

  // 回到 TikTok 主界面
  backToMainTab(10);
//   forceStopTikTok();
  if (failed.length) {
    console.warn("部分发送失败:", failed);
    return false;
  }
  return true;
}

// ==================== 主流程 ====================

function main() {
  console.show();
  console.log("=== TikTok 点评关脚本启动 ===");

  if (!loadUpdateConfig()) {
    failAndStop("加载私信参数失败");
  }

  var ok = sendPrivateMessage(globalConfig);
  if (!ok) {
    failAndStop("点评关流程失败");
  }

  var summary =
    "点评关发送成功" +
    (globalConfig.usernames && globalConfig.usernames.length ? ", users=" + String(globalConfig.usernames.length) : "") +
    (globalConfig.comment_content && globalConfig.comment_content.length ? ", msgs=" + String(globalConfig.comment_content.length) : "");
  reportResult(true, summary);
  console.log(summary);
}

main();
