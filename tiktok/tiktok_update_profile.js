/**
 * TikTok 修改资料脚本（英文/中文界面 best-effort）
 *
 * 参数来源：engines.myEngine().execArgv.template_params
 * 本地调试：默认使用脚本内置 JSON
 *
 * 支持字段：
 * - update_avatar_file: 头像图片URL
 * - update_name: 用户名（username）
 * - nickname: 昵称（display name）
 * - bio: 简介
 * - website: 网站
 */

// ==================== 全局变量 ====================
var globalTaskId = "50001";
var globalConfig = null;
var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";
var TIKTOK_EDIT_PROFILE_ACTIVITY = "com.ss.android.ugc.profile.business.ur.ui.ProfileEditActivity";
// 启动前强制关闭 App，避免从非主界面恢复
var FORCE_STOP_TIKTOK_BEFORE_LAUNCH = true;

// ==================== 本地调试默认参数 ====================
var ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS = true;

// 第25行：换成上面的数据
var DEFAULT_TEMPLATE_PARAMS_UPDATE_JSON = JSON.stringify({
  update_avatar_file: "http://10.1.58.102:8808/download/2026030318/Jesus-Avator_1772533312221.png",
  update_name: "ngquchong498",
  nickname: "ngquchong0303",
  bio: "God bless you",
  website: "https://www.desiringgod.org/",
  platforms: ["tiktok"]
});

// ==================== 结果上报（与发布脚本保持一致风格） ====================

function reportResult(isSuccess, message) {
  try {
    if (globalTaskId && typeof scriptUtils !== "undefined") {
      var resultMap = {
        status: isSuccess ? "success" : "failed",
        result: isSuccess ? String(message || "") : "修改资料失败: " + String(message || ""),
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
      click(b.centerX(), b.centerY());
      console.log("坐标点击兜底已执行 - " + description);
      ok = true;
    } catch (e8) {
      console.warn("坐标点击兜底异常: " + description + " => " + e8);
    }
  }

  if (ok) randomSleep(500, 1100);
  return ok;
}

function findElementByTextAny(targets, timeout, debugDesc) {
  timeout = timeout || 800;
  var startTs = Date.now();
  var lastTried = "";

  if (!targets || !targets.length) {
    if (debugDesc) {
      console.warn("findElementByTextAny targets 为空: " + String(debugDesc));
      logCurrentAppContext("findElementByTextAny失败");
    }
    return null;
  }

  // 偶现找不到：做最多 3 轮重试（每轮之间短暂停顿），提高稳定性
  for (var round = 0; round < 3; round++) {
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (!t) continue;
      lastTried = String(t);

      var el = null;
      try { el = text(t).findOne(timeout); } catch (e0) { el = null; }
      if (!el) { try { el = textContains(t).findOne(250); } catch (e1) { el = null; } }
      if (!el) { try { el = desc(t).findOne(250); } catch (e2) { el = null; } }
      if (!el) { try { el = descContains(t).findOne(250); } catch (e3) { el = null; } }
      if (el) return el;
    }
    // 最后一轮不再等待
    if (round < 2) sleep(220);
  }

  // 仅在调用方明确传入 debugDesc 时打印失败日志，避免全局刷屏
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

function getAndroidSdkInt() {
  try {
    if (typeof device !== "undefined" && device && device.sdkInt) return device.sdkInt;
  } catch (e) {}
  try {
    if (typeof android !== "undefined" && android.os && android.os.Build && android.os.Build.VERSION) {
      return android.os.Build.VERSION.SDK_INT;
    }
  } catch (e2) {}
  return 0;
}

function ensureTikTokPermissionsForProfileUpdate() {
  var sdk = getAndroidSdkInt();
  console.log("启动前预授权(资料修改) sdk=" + sdk);
  // 头像选择相册可能需要读取媒体权限
  if (sdk >= 33) {
    shellBestEffort("pm grant " + TIKTOK_PACKAGE + " android.permission.READ_MEDIA_IMAGES");
    shellBestEffort("pm grant " + TIKTOK_PACKAGE + " android.permission.READ_MEDIA_VIDEO");
  } else {
    shellBestEffort("pm grant " + TIKTOK_PACKAGE + " android.permission.READ_EXTERNAL_STORAGE");
  }
}

function forceStopTikTokBeforeLaunch() {
  if (!FORCE_STOP_TIKTOK_BEFORE_LAUNCH) return;
  console.log("启动前强制关闭 TikTok，避免恢复到非主界面...");
  // best-effort：无 root/无权限时可能失败，但不影响继续尝试启动
  var ok = shellBestEffort("am force-stop " + TIKTOK_PACKAGE);
  console.log("force-stop 结果: " + ok);
  sleep(800);
}

function handleCommonDialogsOnce() {
  // 只保留“明显是弹窗”的按钮（避免 Next/Continue 这种流程按钮误点）
  // 避免与昵称/用户名确认弹窗冲突：这些弹窗的处理要走专用逻辑，不要在这里乱点
  try {
    if (typeof isNicknameConfirmDialogVisible === "function" && isNicknameConfirmDialogVisible()) return false;
    if (typeof isUsernameConfirmDialogVisible === "function" && isUsernameConfirmDialogVisible()) return false;
  } catch (e0) {}
  var buttons = [
    "Allow",
    "While using the app",
    "Only this time",
    "OK",
    "Got it",
    "Not now",
    "Skip",
    "Later",
    "Agree",
    "Accept",
    "I agree",
    "Don’t allow",
    "Don't allow"
  ];
  return clickAnyText(buttons, "通用弹窗按钮", 300);
}

function findTopRightCancelButton() {
  var candidates = [];
  try {
    var byText = text("Cancel").find();
    if (byText) {
      byText.forEach(function(n) { if (n) candidates.push(n); });
    }
  } catch (e0) {}
  try {
    var byDesc = desc("Cancel").find();
    if (byDesc) {
      byDesc.forEach(function(n) { if (n) candidates.push(n); });
    }
  } catch (e1) {}

  if (!candidates.length) return null;

  var best = null;
  var bestScore = -1;
  for (var i = 0; i < candidates.length; i++) {
    var el = candidates[i];
    var b = null;
    try { b = el.bounds(); } catch (e2) { b = null; }
    if (!b) continue;

    // 只认为“顶部区域”的 Cancel 是编辑页的退出按钮；避免点到弹窗底部 Cancel
    if (b.top > device.height * 0.25) continue;
    // 必须在左右角附近（避免匹配到某些顶部中间按钮）
    var inLeftCorner = b.centerX() <= device.width * 0.45;
    var inRightCorner = b.centerX() >= device.width * 0.55;
    if (!inLeftCorner && !inRightCorner) continue;

    // 越靠上优先，其次偏向左上（更常见）；再其次靠右上
    var cornerBias = inLeftCorner ? 100000000 : 0;
    var score = cornerBias + (device.height - b.top) * 1000 + (inLeftCorner ? (device.width - b.left) : b.right);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function cancelToEditProfileListIfNeeded(reason) {
  reason = reason || "";
  var btn = findTopRightCancelButton();
  if (!btn) return false;
  console.log("检测到顶部Cancel，先退出当前编辑页: " + reason);
  var ok = clickClickableParent(btn, "顶部Cancel");
  if (ok) {
    randomSleep(650, 1100);
    // 等待回到编辑资料主界面（best-effort）
    waitForEditProfileScreen(4500);
  }
  return ok;
}

function findSaveButtonInEditor(timeoutMs, debugDesc) {
  timeoutMs = timeoutMs || 1200;
  var start = Date.now();
  var labelRe = "Save";

  while (Date.now() - start < timeoutMs) {
    var candidates = [];
    try {
      var t = text(labelRe).find();
      if (t) t.forEach(function(n) { if (n) candidates.push(n); });
    } catch (e0) {}
    try {
      var d = desc(labelRe).find();
      if (d) d.forEach(function(n) { if (n) candidates.push(n); });
    } catch (e1) {}


    if (candidates.length) {
      var best = null;
      var bestScore = -1;
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var b = null;
        try { b = el.bounds(); } catch (e3) { b = null; }
        if (!b) continue;

        // Save 通常在右上角（过滤掉非顶部/非右侧的候选）
        if (b.top > device.height * 0.25) continue;
        if (b.centerX() < device.width * 0.55) continue;

        var score = (device.height - b.top) * 1000 + b.right;
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
      if (best) return best;
    }

    sleep(120);
  }

  if (debugDesc) {
    console.warn("未找到Save按钮: " + String(debugDesc));
    logCurrentAppContext("findSaveButtonInEditor失败");
  }
  return null;
}

function isElementEnabled(el, defaultValue) {
  if (typeof defaultValue === "undefined") defaultValue = true;
  if (!el) return defaultValue;
  try {
    if (typeof el.enabled === "function") return !!el.enabled();
  } catch (e) {}
  return defaultValue;
}

function isNicknameConfirmDialogVisible() {
  try {
    // 典型弹窗文案：Set nickname? / You can only change your nickname once every 7 days
    if (textContains("Set nickname").exists()) return true;
    if (textContains("change your nickname once every").exists()) return true;
    if (textContains("nickname once every").exists() && textContains("days").exists()) return true;
    if (textContains("设置昵称").exists()) return true;
    if (textContains("昵称").exists() && textContains("7").exists() && textContains("天").exists()) return true;
  } catch (e) {
    console.warn("isNicknameConfirmDialogVisible 异常:", e);
  }
  return false;
}

function handleNicknameConfirmDialog(timeoutMs) {
  timeoutMs = timeoutMs || 6500;
  var start = Date.now();
  var saw = false;

  while (Date.now() - start < timeoutMs) {
    if (isNicknameConfirmDialogVisible()) {
      saw = true;
      // 优先点 Confirm；如果 Confirm 不可用/点不动，再点 Cancel 让流程继续
      if (clickAnyText(["Confirm", "确认", "确定"], "昵称确认弹窗-Confirm", 800)) {
        randomSleep(450, 800);
        if (!isNicknameConfirmDialogVisible()) return true;
      }

      // 兜底：按钮可能在可点击容器上
      var btn = null;
      try {
        btn = text("Confirm").findOne(600) || text("确定").findOne(600) || text("确认").findOne(600);
      } catch (e1) {
        console.warn("handleNicknameConfirmDialog 查找Confirm异常:", e1);
        btn = null;
      }
      if (btn && clickClickableParent(btn, "昵称确认弹窗按钮(兜底)")) {
        randomSleep(450, 800);
        if (!isNicknameConfirmDialogVisible()) return true;
      }

      // Confirm 没有成功关闭弹窗：点 Cancel 退出（例如触发冷却期限制/按钮不可用）
      if (clickAnyText(["Cancel", "取消"], "昵称确认弹窗-Cancel(兜底)", 800)) {
        randomSleep(450, 800);
        if (!isNicknameConfirmDialogVisible()) return true;
      }
    } else if (saw) {
      // 看见过弹窗但现在不在了，认为已关闭
      return true;
    }
    sleep(250);
  }

  if (saw && isNicknameConfirmDialogVisible()) {
    console.warn("昵称确认弹窗未处理成功，仍然可见");
    logCurrentAppContext("handleNicknameConfirmDialog失败");
    return false;
  }
  return true;
}

function isUsernameConfirmDialogVisible() {
  try {
    // 典型弹窗文案：Set your username? / You can change your username once every 30 days.
    if (textContains("Set your username").exists()) return true;
    if (textContains("change your username once every").exists()) return true;
    if (textContains("username once every").exists() && textContains("days").exists()) return true;
    if (textContains("设置用户名").exists()) return true;
    if (textContains("用户名").exists() && textContains("30").exists() && textContains("天").exists()) return true;
  } catch (e) {
    console.warn("isUsernameConfirmDialogVisible 异常:", e);
  }
  return false;
}

function handleUsernameConfirmDialog(timeoutMs) {
  timeoutMs = timeoutMs || 6500;
  var start = Date.now();
  var saw = false;

  while (Date.now() - start < timeoutMs) {
    if (isUsernameConfirmDialogVisible()) {
      saw = true;

      // 优先点“Set username/确认/确定”；点完仍不消失则再点 Cancel 退出
      if (clickAnyText(["Set username", "Set Username", "Confirm", "确认", "确定", "设置用户名"], "用户名确认弹窗-Confirm", 900)) {
        randomSleep(450, 850);
        if (!isUsernameConfirmDialogVisible()) return true;
      }

      var btn = null;
      try {
        btn =
          textContains("Set username").findOne(700) ||
          text("Confirm").findOne(700) ||
          text("设置用户名").findOne(700) ||
          text("确定").findOne(700) ||
          text("确认").findOne(700);
      } catch (e1) {
        console.warn("handleUsernameConfirmDialog 查找Set username/Confirm异常:", e1);
        btn = null;
      }
      if (btn && clickClickableParent(btn, "用户名确认弹窗按钮(兜底)")) {
        randomSleep(450, 850);
        if (!isUsernameConfirmDialogVisible()) return true;
      }

      // 确认不成功（例如冷却期限制/按钮不可用）：点 Cancel 退出并继续后续流程
      if (clickAnyText(["Cancel", "取消"], "用户名确认弹窗-Cancel(兜底)", 900)) {
        randomSleep(450, 850);
        if (!isUsernameConfirmDialogVisible()) return true;
      }
    } else if (saw) {
      return true;
    }
    sleep(250);
  }

  if (saw && isUsernameConfirmDialogVisible()) {
    console.warn("用户名确认弹窗未处理成功，仍然可见");
    logCurrentAppContext("handleUsernameConfirmDialog失败");
    return false;
  }
  return true;
}

function isBioConfirmDialogVisible() {
  try {
    // 典型弹窗文案：Save bio? / Edits to your bio have not been saved yet.
    if (textContains("Save bio").exists()) return true;
    if (textContains("not been saved").exists()) return true;
    if (textContains("保存简介").exists()) return true;
  } catch (e) {
    console.warn("isBioConfirmDialogVisible 异常:", e);
  }
  return false;
}

function handleBioConfirmDialog(timeoutMs) {
  timeoutMs = timeoutMs || 6500;
  var start = Date.now();
  var saw = false;

  while (Date.now() - start < timeoutMs) {
    var visible = isBioConfirmDialogVisible();
    console.log("handleBioConfirmDialog 检测弹窗: visible=" + visible + ", elapsed=" + (Date.now() - start) + "ms");
    if (visible) {
      saw = true;
      console.log("检测到 Save bio? 弹窗，尝试点击 Save");
      if (clickAnyText(["Save", "保存"], "简介确认弹窗-Save", 900)) {
        randomSleep(450, 850);
        if (!isBioConfirmDialogVisible()) {
          console.log("Save bio? 弹窗已关闭，简介保存成功");
          return true;
        }
        console.warn("点击Save后弹窗仍然存在");
      }

      var btn = null;
      try {
        btn = text("Save").findOne(700) || text("保存").findOne(700);
      } catch (e1) {
        console.warn("handleBioConfirmDialog 查找Save异常:", e1);
        btn = null;
      }
      if (btn) {
        console.log("通过 findOne 找到Save按钮，兜底点击");
        if (clickClickableParent(btn, "简介确认弹窗按钮(兜底)")) {
          randomSleep(450, 850);
          if (!isBioConfirmDialogVisible()) {
            console.log("Save bio? 弹窗已关闭(兜底)，简介保存成功");
            return true;
          }
        }
      }
    } else if (saw) {
      console.log("Save bio? 弹窗已消失，认为已关闭");
      return true;
    }
    sleep(250);
  }

  if (saw && isBioConfirmDialogVisible()) {
    console.warn("简介确认弹窗未处理成功，仍然可见");
    logCurrentAppContext("handleBioConfirmDialog失败");
    return false;
  }
  console.log("handleBioConfirmDialog 超时退出，saw=" + saw + "（未出现弹窗，直接保存成功）");
  return true;
}

function isOnTikTokMainTab() {
  // 底栏常见入口（英文/中文）
  var tabs = ["Home", "Friends", "Inbox", "Profile", "Me", "首页", "朋友", "收件箱", "消息", "我", "个人资料"];
  for (var i = 0; i < tabs.length; i++) {
    if (textContains(tabs[i]).exists() || descContains(tabs[i]).exists()) return true;
  }
  return false;
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

function waitForPackage(pkg, timeoutMs) {
  timeoutMs = timeoutMs || 15000;
  var start = Date.now();
  var lastPkg = "";
  var lastLogTs = 0;
  while (Date.now() - start < timeoutMs) {
    var curPkg = safeCurrentPackage();
    if (curPkg) lastPkg = curPkg;
    if (curPkg === pkg) return true;
    logCurrentAppContext("启动中");
    // 兜底：有些环境 currentPackage 不可靠/不可用，但 UI 已经在 TikTok 主页了
    try {
      if (isOnTikTokMainTab()) return true;
    } catch (e2) {}

    // 启动过程可能弹权限/提示窗，提前处理，避免一直卡住
    try { handleCommonDialogsOnce(); } catch (e3) {}

    // 降低日志刷屏：每 2 秒打印一次当前包名
    if (Date.now() - lastLogTs > 2000) {
      lastLogTs = Date.now();
      console.log("等待前台包名切换: cur=" + String(curPkg || "") + ", last=" + String(lastPkg || "") + ", target=" + pkg);
    }
    sleep(300);
  }
  console.warn("等待前台包名超时: last=" + String(lastPkg || "") + ", target=" + pkg);
  return false;
}

// ==================== 配置加载 ====================

function normalizeTemplateParams(templateParams) {
  try {
    if (!templateParams) return null;
    if (typeof templateParams === "string") {
      return JSON.parse(templateParams);
    }
    if (typeof templateParams.toString === "function") {
      var str = String(templateParams);
      if (str && (str.indexOf("{") === 0 || str.indexOf("[") === 0)) {
        try {
          return JSON.parse(str);
        } catch (e) {}
      }
    }
    if (typeof templateParams === "object") return templateParams;
    return null;
  } catch (e2) {
    console.error("normalizeTemplateParams 失败:", e2);
    return null;
  }
}

function normalizeUpdateConfig(obj) {
  try {
    obj = obj || {};
    return {
      update_avatar_file: String(obj.update_avatar_file || obj.avatar || obj.avatar_file || obj.updateAvatarFile || "").trim(),
      update_name: String(obj.update_name || obj.username || obj.updateName || "").trim(),
      nickname: String(obj.nickname || obj.name || obj.display_name || obj.displayName || "").trim(),
      bio: String(obj.bio || obj.signature || "").trim(),
      website: String(obj.website || obj.link || "").trim(),
      // 内部字段：用于缓存头像预下载结果（不要依赖外部传入）
      _avatar_download_done: false,
      _avatar_download_paths: []
    };
  } catch (e) {
    console.error("normalizeUpdateConfig 失败:", e);
    return null;
  }
}

function preDownloadAvatarIfNeeded(cfg) {
  try {
    if (!cfg || !cfg.update_avatar_file) return true;
    if (cfg._avatar_download_done) return true;

    if (typeof scriptUtils === "undefined" || !scriptUtils.downloadMedia) {
      console.log("! scriptUtils.downloadMedia 不可用，跳过头像预下载");
      cfg._avatar_download_done = true;
      cfg._avatar_download_paths = [];
      return true;
    }

    console.log("准备预下载头像到相册:", cfg.update_avatar_file);
    var results = scriptUtils.downloadMedia([cfg.update_avatar_file], true);
    console.log("头像预下载结果:", results);
    cfg._avatar_download_done = true;
    cfg._avatar_download_paths = Array.isArray(results) ? results : [];

    // 给媒体库一点时间刷新到 Recents（best-effort）
    randomSleep(800, 1500);
    return true;
  } catch (e) {
    console.warn("头像预下载异常(继续):", e);
    try {
      cfg._avatar_download_done = true;
      cfg._avatar_download_paths = [];
    } catch (e2) {}
    return true;
  }
}

function readLocalUpdateMd() {
  try {
    return DEFAULT_TEMPLATE_PARAMS_UPDATE_JSON;
  } catch (e) {
    console.warn("读取本地默认资料参数失败:", e);
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
      console.log("使用本地默认资料参数跑通流程");
    } else if (execArgv && execArgv.template_params) {
      rawParams = execArgv.template_params;
    }

    if (!rawParams) {
      console.log("✗ template_params 不存在，且未启用本地默认资料参数");
      return false;
    }

    var paramsObj = normalizeTemplateParams(rawParams);
    if (!paramsObj) {
      console.log("✗ 参数解析失败");
      return false;
    }

    globalConfig = normalizeUpdateConfig(paramsObj);
    if (!globalConfig) {
      console.log("✗ 修改资料参数不合法");
      return false;
    }

    console.log("✓ 配置加载成功:", globalConfig);
    return true;
  } catch (e) {
    console.error("加载配置失败:", e);
    return false;
  }
}

// ==================== TikTok 资料修改流程 ====================

function launchTikTok() {
  console.log("启动 TikTok...");
  ensureTikTokPermissionsForProfileUpdate();
  forceStopTikTokBeforeLaunch();
  logCurrentAppContext("启动前");
  app.launchPackage(TIKTOK_PACKAGE);
  sleep(800);
  logCurrentAppContext("launchPackage后");
  // 某些环境 currentPackage 不稳定，这里做 UI 特征兜底识别
  var ok = waitForPackage(TIKTOK_PACKAGE, 25000);
  logCurrentAppContext(ok ? "识别成功" : "识别失败");
  if (!ok) return false;

  var rounds = 0;
  while (rounds < 10) {
    if (!handleCommonDialogsOnce()) break;
    rounds++;
    randomSleep(700, 1200);
  }
  return true;
}

function goToProfileTab() {
  console.log("进入个人主页(Profile)...");
  var targets = ["Profile", "Me", "Account", "我", "个人资料"];
  for (var i = 0; i < 5; i++) {
    if (clickAnyText(targets, "底栏Profile", 800)) return true;
    // 底部右侧区域兜底
    try {
      click(device.width * 0.9, device.height * 0.95);
    } catch (e) {}
    randomSleep(900, 1400);
    handleCommonDialogsOnce();
  }
  return false;
}

function openEditProfile() {
  console.log("打开编辑资料(Edit profile)...");
  var targets = ["Edit profile", "Edit Profile", "Edit", "编辑资料", "编辑个人资料"];
  for (var i = 0; i < 6; i++) {
    var el = findElementByTextAny(targets, 1200);
    if (el) {
      if (clickClickableParent(el, "编辑资料入口")) return true;
    }
    handleCommonDialogsOnce();
    randomSleep(800, 1200);
  }
  return false;
}

function waitForEditProfileScreen(timeoutMs) {
  timeoutMs = timeoutMs || 8000;
  var start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // 兜底：有些机型/版本在无障碍树里拿不到标题，但 activity 是可靠的
    var act = safeCurrentActivity();
    if (act && (act === TIKTOK_EDIT_PROFILE_ACTIVITY || String(act).indexOf("ProfileEditActivity") >= 0)) {
      return true;
    }
    // 注意：字段编辑页的标题也可能是 Name/Username，不能用单个标题判断
    var labelCount = 0;
    try { if (text("Username").exists() || text("用户名").exists() || text("TikTok ID").exists()) labelCount++; } catch (e0) {}
    try { if (text("Name").exists() || text("昵称").exists() || text("名字").exists() || text("Display name").exists() || text("显示名称").exists()) labelCount++; } catch (e1) {}
    try { if (text("Bio").exists() || text("简介").exists() || text("个性签名").exists() || text("About").exists()) labelCount++; } catch (e2) {}
    try { if (text("Website").exists() || text("网站").exists() || text("Link").exists() || text("链接").exists()) labelCount++; } catch (e3) {}
    if (labelCount >= 2) return true;

    // handleCommonDialogsOnce();
    sleep(300);
  }
  return false;
}

function openFieldByLabel(labelTargets, desc) {
  var el = findElementByTextAny(labelTargets, 1500, desc);
  if (!el) {
    console.warn("openFieldByLabel 找不到入口: " + String(desc) + ", targets=" + JSON.stringify(labelTargets));
    logCurrentAppContext("openFieldByLabel失败");
    return false;
  }
  var ok = clickClickableParent(el, desc);
  if (!ok) {
    console.warn("openFieldByLabel 点击失败: " + String(desc));
    logCurrentAppContext("openFieldByLabel点击失败");
  }
  return ok;
}

function setTextInEditor(value, desc) {
  if (!value) return true;
  var edit = className("android.widget.EditText").findOne(3000);
  if (!edit) return false;
  console.log("填写 " + desc + "，长度=" + String(value).length);
  edit.setText(String(value));
  randomSleep(500, 900);
  return true;
}

function clickSaveInEditor() {
  // 不同版本可能是 Save / Done / 对勾
  if (clickAnyText(["Save", "Done", "OK", "保存", "完成"], "保存按钮", 1200)) return true;
  var el = null;
  try {
    el = descMatches(/Save|Done|OK/i).clickable(true).findOne(800);
  } catch (e) {}
  if (el) return safeClick(el, "保存按钮(desc)");
  return false;
}

function updateNickname(nickname) {
  if (!nickname) return true;
  console.log("修改昵称...");
  cancelToEditProfileListIfNeeded("修改昵称前");
  if (!openFieldByLabel(["Name", "昵称"], "昵称入口")) return false;
  randomSleep(700, 1200);
  if (!setTextInEditor(nickname, "昵称")) return false;
  // 简化逻辑：先判断 Save 是否可用；不可用（冷却期/限制）则直接 Cancel 退出编辑页继续流程
  var saveBtn = findSaveButtonInEditor(1800, "昵称");
  if (saveBtn) {
    if (!isElementEnabled(saveBtn, true)) {
      console.warn("昵称 Save 不可用（可能冷却期限制），点击 Cancel 退出");
      cancelToEditProfileListIfNeeded("昵称不可保存");
      waitForEditProfileScreen(9000);
      return true;
    }
    safeClick(saveBtn, "保存按钮-昵称");
  } else {
    console.log("昵称 Save可点击");
    if (!clickSaveInEditor()) return false;
  }
  // 保存昵称后可能弹出“Set nickname?”确认框，需要点 Confirm 才会回到编辑资料页
  if (!handleNicknameConfirmDialog(6500)) return false;
  // 等待回到编辑资料页，避免后续修改用户名时仍被弹窗遮挡
  waitForEditProfileScreen(9000);
  randomSleep(900, 1400);
  return true;
}

function updateUsername(username) {
  if (!username) return true;
  console.log("修改用户名...");
  cancelToEditProfileListIfNeeded("修改用户名前");
  if (!openFieldByLabel(["Username", "用户名", "TikTok ID", "ID"], "用户名入口")) return false;
  randomSleep(700, 1200);
  if (!setTextInEditor(username, "用户名")) return false;
  randomSleep(900, 1400);

  // 先判断 Save 是否可用（冷却期/限制时直接不可点）
  var saveBtnEarly = findSaveButtonInEditor(1800, "用户名");
  if (saveBtnEarly && !isElementEnabled(saveBtnEarly, true)) {
    console.warn("用户名 Save 不可用（可能冷却期限制），点击 Cancel 退出");
    cancelToEditProfileListIfNeeded("用户名不可保存");
    waitForEditProfileScreen(9000);
    return true;
  }

  // 等待可用性检查（best-effort）
  var start = Date.now();
  while (Date.now() - start < 5000) {
    if (
      textContains("isn't available").exists() ||
      textContains("not available").exists() ||
      textContains("taken").exists() ||
      textContains("try another").exists()
    ) {
      console.log("✗ 用户名不可用");
      // 退出编辑页，避免卡在输入界面
      cancelToEditProfileListIfNeeded("用户名不可用");
      return false;
    }
    if (textContains("available").exists() || textContains("可用").exists()) break;
    sleep(300);
  }

  var saveBtn = saveBtnEarly || findSaveButtonInEditor(1800, "用户名");
  if (saveBtn) {
    if (!isElementEnabled(saveBtn, true)) {
      console.warn("用户名 Save 不可用（可能冷却期限制），点击 Cancel 退出");
      cancelToEditProfileListIfNeeded("用户名不可保存");
      waitForEditProfileScreen(9000);
      return true;
    }
    safeClick(saveBtn, "保存按钮-用户名");
  } else {
    if (!clickSaveInEditor()) return false;
  }
  // 保存用户名后可能弹出“Set your username?”确认框，需要点 Set username 才会提交；不允许修改时点 Cancel 继续流程
  if (!handleUsernameConfirmDialog(6500)) return false;
  waitForEditProfileScreen(9000);
  randomSleep(1200, 1800);
  return true;
}

function updateBio(bio) {
  if (!bio) return true;
  console.log("修改简介(bio)...");
  cancelToEditProfileListIfNeeded("修改简介前");
  if (!openFieldByLabel(["Bio", "简介", "个性签名", "About"], "简介入口")) return false;
  randomSleep(700, 1200);
  if (!setTextInEditor(bio, "简介")) return false;
  // bio 无冷却期限制，不做 isElementEnabled 检查，直接点 Save
  var saveBtn = findSaveButtonInEditor(1800, "简介");
  if (saveBtn) {
    safeClick(saveBtn, "保存按钮-简介");
  } else {
    console.log("简介未找到顶部Save按钮，尝试 clickSaveInEditor");
    if (!clickSaveInEditor()) return false;
  }
  // 保存简介后可能弹出"Save bio?"确认框，需要点 Save 才会提交
  console.log("简介Save已点击，等待确认弹窗检测...");
  if (!handleBioConfirmDialog(6500)) return false;
  waitForEditProfileScreen(9000);
  randomSleep(900, 1400);
  return true;
}

function updateWebsite(website) {
  if (!website) return true;
  console.log("修改网站(website)...");
  cancelToEditProfileListIfNeeded("修改网站前");
  if (!openFieldByLabel(["Website", "网站", "Link", "链接"], "网站入口")) return false;
  randomSleep(700, 1200);
  if (!setTextInEditor(website, "网站")) return false;
  if (!clickSaveInEditor()) return false;
  randomSleep(900, 1400);
  return true;
}

function pickFirstImageInGrid() {
  // 选取一个“比较像缩略图”的可点击元素
  var candidates = clickable(true).find();
  if (!candidates) return false;
  try { if (typeof candidates.empty === "function" && candidates.empty()) return false; } catch (e) {}

  var best = null;
  var bestScore = -1;
  try {
    candidates.forEach(function(el) {
      try {
        var b = el.bounds();
        if (!b) return;
        if (b.top < device.height * 0.10) return;
        if (b.bottom > device.height * 0.92) return;
        var w = b.width();
        var h = b.height();
        if (w < device.width * 0.18 || h < device.width * 0.18) return;
        var score = -b.top * 10 + b.left; // 越靠上越优先
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      } catch (e2) {}
    });
  } catch (e3) {}

  if (!best) return false;
  return safeClick(best, "选择第一张图片");
}

function clickByCenter(el, desc) {
  if (!el) return false;
  // 先尝试直接 click（更简单），失败再用坐标点击兜底（更稳）
  try {
    if (typeof el.click === "function") {
      var ok = !!el.click();
      console.log("直接点击: " + desc + " => " + ok);
      if (ok) {
        randomSleep(250, 550);
        return true;
      }
    }
  } catch (e0) {
    console.warn("直接点击异常: " + desc + " => " + e0);
  }
  var b = null;
  try { b = el.bounds ? el.bounds() : null; } catch (e) { b = null; }
  if (!b) return false;
  var x = 0;
  var y = 0;
  try {
    x = b.centerX();
    y = b.centerY();
  } catch (e2) {
    return false;
  }
  console.log("坐标点击: " + desc + " (" + x + "," + y + ")");
  try {
    click(x, y);
    randomSleep(250, 550);
    return true;
  } catch (e3) {
    console.warn("坐标点击异常: " + desc + " => " + e3);
    return false;
  }
}

function toSortedByBoundsTopLeft(nodes) {
  var arr = [];
  try {
    if (!nodes) return arr;
    nodes.forEach(function(n) {
      try {
        if (!n) return;
        var b = n.bounds ? n.bounds() : null;
        if (!b) return;
        // 排除顶部/底部工具栏区域（避免点到返回/Next）
        if (b.top < device.height * 0.10) return;
        if (b.bottom > device.height * 0.92) return;
        arr.push({ el: n, b: b });
      } catch (e) {}
    });
  } catch (e2) {}

  arr.sort(function(a, b) {
    if (a.b.top !== b.b.top) return a.b.top - b.b.top;
    return a.b.left - b.b.left;
  });
  return arr.map(function(x) { return x.el; });
}

function pickBySelectionCheckboxes(count) {
  count = count || 1;
  var boxes = null;
  try {
    boxes = id("j76").find();
  } catch (e) {
    boxes = null;
  }

  if (!boxes) return false;
  try { if (typeof boxes.empty === "function" && boxes.empty()) return false; } catch (e2) {}

  var sorted = toSortedByBoundsTopLeft(boxes);
  if (!sorted.length) return false;

  var picked = 0;
  var target = Math.min(count, sorted.length);
  for (var i = 0; i < target; i++) {
    if (clickByCenter(sorted[i], "选择框(j76) 第" + (i + 1) + "个")) {
      picked++;
      randomSleep(250, 550);
    } else {
      break;
    }
  }
  console.log("选择框(j76) 选择数量:", picked, "/", count);
  return picked === count;
}

function updateAvatar(avatarUrl) {
  if (!avatarUrl) return true;
  console.log("修改头像...");

  // 启动阶段已做过预下载，这里兜底再做一次（避免预下载没跑到）
  try {
    if (globalConfig && !globalConfig._avatar_download_done) {
      preDownloadAvatarIfNeeded(globalConfig);
    }
  } catch (e0) {}

  // 进入更换头像入口
  var entry = findElementByTextAny(
    ["Change photo", "Change profile photo", "Change picture", "更换头像", "更换照片", "Change"],
    1200
  );
  if (entry) {
    clickClickableParent(entry, "更换头像入口");
  } else {
    // 兜底：尝试点击页面上方的头像区域
    var img = null;
    try {
      img = className("android.widget.ImageView").clickable(true).findOne(1200);
    } catch (e) {}
    if (!img) return false;
    safeClick(img, "头像区域(兜底)");
  }

  randomSleep(1500, 2500);

  // 头像弹框：Take photo / Upload photo / View photo
  // 需要点 Upload photo 才会进入选择图片页
  // Upload photo 是 clickable=false 的 TextView，需要向上遍历找可点击父容器
  var uploadPhotoEl = findElementByTextAny(["Upload photo", "Upload Photo", "上传照片", "上传图片"], 1500, "Upload photo");
  if (uploadPhotoEl) {
    clickClickableParent(uploadPhotoEl, "Upload photo");
  }
  randomSleep(2000, 3500);

  // // 选择相册/图库
  // clickAnyText(
  //   ["Select photo", "Select from gallery", "Choose from gallery", "Gallery", "Photos", "从相册选择", "相册", "图库"],
  //   "选择相册",
  //   1200
  // );
  // randomSleep(900, 1500);

  // 参考发布脚本：优先通过选择框(j76)选择第一张（通常最新在左上）
  if (!pickBySelectionCheckboxes(1)) {
    // 兜底：选第一张（假设刚下载的头像会排在最前）
    if (!pickFirstImageInGrid()) return false;
  }
  randomSleep(900, 1500);

  // 下一步进入裁剪页（头像选择页常见 Next）
  clickAnyText(["Next", "下一步"], "选择图片 - Next", 1500);
  randomSleep(900, 1500);

  var pdw=id("pdw").find();  
  if(pdw.checked){
    pdw.click();
    randomSleep(200,600);
  }

  // 确认/完成（裁剪页）
  clickAnyText(["Done", "Save", "Confirm", "OK", "完成", "确定"], "头像确认", 1500);
  randomSleep(1200, 1800);
  return true;
}

function updateProfile(cfg) {
  if (!launchTikTok()) return false;
  if (!goToProfileTab()) return false;
  randomSleep(1200, 1800);
  if (!openEditProfile()) return false;
  if (!waitForEditProfileScreen(9000)) return false;

  // 按顺序执行（头像先做，避免后续页面跳转影响）
  if (!updateAvatar(cfg.update_avatar_file)) {
    console.log("! 头像修改失败(继续)");
  }
  // 头像流程会跳到系统相册/裁剪页，这里确保回到“编辑资料”主界面再继续改昵称/用户名
  waitForEditProfileScreen(12000);
  if (!updateNickname(cfg.nickname)) return false;
  if (!updateUsername(cfg.update_name)) return false;
  if (!updateBio(cfg.bio)) return false;

  return true;
}

// ==================== 主流程 ====================

function main() {
  console.show();
  console.log("=== TikTok 修改资料脚本启动 ===");

  if (!loadUpdateConfig()) {
    failAndStop("加载修改资料参数失败");
  }

  // 参考发布脚本：先把头像素材下载到相册，后续 Upload photo 选第一张才更稳定
  preDownloadAvatarIfNeeded(globalConfig);

  var ok = updateProfile(globalConfig);
  if (!ok) {
    failAndStop("修改资料流程失败");
  }

  var summary =
    "修改资料成功" +
    (globalConfig.update_name ? ", username=" + globalConfig.update_name : "") +
    (globalConfig.nickname ? ", nickname=" + globalConfig.nickname : "");
  reportResult(true, summary);
  console.log(summary);
}

main();
