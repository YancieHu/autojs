/**
 * TikTok 视频/图集发布脚本（英文界面）
 *
 * 参数来源：engines.myEngine().execArgv.template_params
 * 结果上报：参考 chrome_baidu_search.js 的 reportResult（scriptUtils.reportLog）
 *
 * 支持两种模式（见 publish.md）：
 * - publish_mode: "video"
 * - publish_mode: "album"
 */

// ==================== 全局变量 ====================
var globalTaskId = "40001";
var globalConfig = null;

var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";

// ==================== 本地调试默认参数（对接服务端后可删除） ====================
// 目的：先让脚本在无下发参数时也能跑通发布流程，后续对接完成直接删掉本段并把开关设为false即可。
var ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS = true;
var DEFAULT_TEMPLATE_PARAMS_VIDEO_JSON = JSON.stringify({
  publish_mode: "video",
  video_file: "https://raw.githubusercontent.com/YancieHu/autojs/feature/ticktok/tiktok/34.mp4",
  video_caption: "这是一个测试视频支持多行文案",
  video_tags: "搞笑, 旅行",
  video_cover: "https://raw.githubusercontent.com/YancieHu/autojs/feature/ticktok/tiktok/bind.png",
  video_mentions: "@user123, @friend456"
});

var DEFAULT_TEMPLATE_PARAMS_IMAGE_JSON = JSON.stringify({
  "publish_mode": "album",
  "album_images": ["https://raw.githubusercontent.com/YancieHu/autojs/feature/ticktok/tiktok/bind.png", "https://raw.githubusercontent.com/YancieHu/autojs/feature/ticktok/tiktok/bind.png"],
  "album_title": "这是图集标题",
  "album_caption": "这是图集文案支持多行",
  "album_tags": "美食, 生活",
  "album_mentions": "@userA, @userB"
});



// ==================== 配置加载（保持与原脚本一致接口） ====================

function loadGmailConfig() {
  try {
    var execArgv = null;
    if (
      typeof engines !== "undefined" &&
      engines.myEngine &&
      engines.myEngine().execArgv
    ) {
      execArgv = engines.myEngine().execArgv;
    }

    // 兼容 task_id / taskId
    if (execArgv && execArgv.task_id) {
      globalTaskId = execArgv.task_id;
    } else if (execArgv && execArgv.taskId) {
      globalTaskId = execArgv.taskId;
    }

    var rawParams = null;
    if (ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS) {
      console.log("使用本地默认视频参数跑通流程");
      rawParams = DEFAULT_TEMPLATE_PARAMS_IMAGE_JSON;
    } else  if (execArgv && execArgv.template_params) {
      rawParams = execArgv.template_params;
    }

    if (!rawParams) {
      console.log("✗ execArgv.template_params 不存在，且未启用本地默认参数");
      return false;
    }

    var paramsObj = normalizeTemplateParams(rawParams);
    if (!paramsObj) {
      console.log("✗ template_params 解析失败");
      return false;
    }

    globalConfig = normalizePublishConfig(paramsObj);
    if (!globalConfig) {
      console.log("✗ 发布参数不合法");
      return false;
    }

    console.log("✓ 配置加载成功:", globalConfig);
    return true;
  } catch (error) {
    console.error("加载配置失败:", error);
    return false;
  }
}

function normalizeTemplateParams(templateParams) {
  try {
    if (!templateParams) return null;
    if (typeof templateParams === "string") {
      return JSON.parse(templateParams);
    }
    // JSONObject: 尝试 toString() 转 JSON
    if (typeof templateParams.toString === "function") {
      var str = String(templateParams);
      if (str && (str.indexOf("{") === 0 || str.indexOf("[") === 0)) {
        try {
          return JSON.parse(str);
        } catch (e) {
          // ignore，继续 fallback
        }
      }
    }
    // 已经是普通对象
    if (typeof templateParams === "object") {
      return templateParams;
    }
    return null;
  } catch (e) {
    console.error("normalizeTemplateParams 失败:", e);
    return null;
  }
}

function normalizePublishConfig(obj) {
  try {
    var mode = obj.publish_mode || obj.publishMode || "";
    mode = String(mode).trim().toLowerCase();
    if (!mode) return null;

    if (mode === "video") {
      var videoUrl = obj.video_file || obj.videoFile || "";
      videoUrl = String(videoUrl).trim();
      if (!videoUrl) return null;

      return {
        publish_mode: "video",
        video_file: videoUrl,
        video_caption: String(obj.video_caption || obj.videoCaption || ""),
        video_tags: String(obj.video_tags || obj.videoTags || ""),
        video_mentions: String(obj.video_mentions || obj.videoMentions || "")
      };
    }

    if (mode === "album") {
      var images = obj.album_images || obj.albumImages || [];
      if (!Array.isArray(images) || images.length <= 0) return null;
      if (images.length > 9) images = images.slice(0, 9);

      return {
        publish_mode: "album",
        album_images: images,
        album_title: String(obj.album_title || obj.albumTitle || ""),
        album_caption: String(obj.album_caption || obj.albumCaption || ""),
        album_tags: String(obj.album_tags || obj.albumTags || ""),
        album_mentions: String(obj.album_mentions || obj.albumMentions || "")
      };
    }

    return null;
  } catch (e) {
    console.error("normalizePublishConfig 失败:", e);
    return null;
  }
}

// ==================== 结果上报（参考 chrome_baidu_search.js） ====================

function reportResult(isSuccess, message) {
  try {
    if (globalTaskId && typeof scriptUtils !== "undefined") {
      var resultMap = {
        status: isSuccess ? "success" : "failed",
        result: isSuccess ? String(message || "") : "发布失败: " + String(message || ""),
        task_id: globalTaskId
      };

      console.log("上报结果:", resultMap);

      // 优先使用 reportLog（与 chrome_baidu_search.js 保持一致）
      if (scriptUtils.reportLog) {
        scriptUtils.reportLog(globalTaskId, JSON.stringify(resultMap));
      } else if (scriptUtils.sendTaskResult) {
        // 兼容其他脚本的上报方式
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

  // 仅用于排查：如果当前节点点不动，打印可点击父节点信息，并做一次兜底点击尝试
  if (!ok) {
    var p = null;
    try { p = element.parent ? element.parent() : null; } catch (e8) { p = null; }
    for (var i = 0; i < 6 && p; i++) {
      var pClickable = null;
      var pEnabled = null;
      var pText = "";
      var pDesc = "";
      var pCls = "";
      var pb = null;
      try { pClickable = p.clickable ? !!p.clickable() : null; } catch (e9) {}
      try { pEnabled = p.enabled ? !!p.enabled() : null; } catch (e10) {}
      try { pText = p.text ? String(p.text() || "") : ""; } catch (e11) {}
      try { pDesc = p.desc ? String(p.desc() || "") : ""; } catch (e12) {}
      try { pCls = p.className ? String(p.className() || "") : ""; } catch (e13) {}
      try { pb = p.bounds ? p.bounds() : null; } catch (e14) {}
      var pbStr = "";
      try {
        if (pb) pbStr = " (" + pb.left + "," + pb.top + "," + pb.right + "," + pb.bottom + ")";
      } catch (e15) {}

      if (pClickable) {
        console.log(
          "提示: 可点击父节点=" +
            i +
            " [text=" +
            pText +
            ", desc=" +
            pDesc +
            ", class=" +
            pCls +
            ", clickable=" +
            pClickable +
            ", enabled=" +
            pEnabled +
            ", bounds=" +
            pbStr +
            "]"
        );

        try {
          ok = !!p.click();
          console.log("父节点点击结果: " + ok + " - " + description);
        } catch (e16) {
          console.warn("父节点 click() 异常: " + description + " => " + e16);
        }
        break;
      }

      try { p = p.parent ? p.parent() : null; } catch (e17) { p = null; }
    }

    // 兜底：坐标点击（无法判断是否真正触发，仅保证发出了点击）
    if (!ok && b) {
      try {
        click(b.centerX(), b.centerY());
        console.log("坐标点击兜底已执行 - " + description);
        ok = true;
      } catch (e18) {
        console.warn("坐标点击兜底异常: " + description + " => " + e18);
      }
    }
  }

  if (ok) randomSleep(500, 1200);
  return ok;
}

function findElementByTextAny(targets, timeout) {
  timeout = timeout || 800;
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i];
    if (!t) continue;
    var el = text(t).findOne(timeout);
    if (!el) el = textContains(t).findOne(200);
    if (!el) el = desc(t).findOne(200);
    if (!el) el = descContains(t).findOne(200);
    if (el) return el;
  }
  return null;
}

function clickAnyText(targets, description, timeout) {
  var el = findElementByTextAny(targets, timeout);
  if (!el) return false;
  return safeClick(el, description + " - " + (el.text() || el.desc() || ""));
}

function isOnTikTokMainTab() {
  // 英文界面底栏一般包含这些
  var tabs = ["Home", "Friends", "Inbox", "Profile"];
  for (var i = 0; i < tabs.length; i++) {
    if (textContains(tabs[i]).exists() || descContains(tabs[i]).exists()) return true;
  }
  return false;
}

function isOnMediaPickerScreen() {
  // 素材选择页特征：Recents 下拉、顶部分类(All/Videos/Photos...)、底部 Select multiple / Next、以及选择框 j76
  try {
    if (textMatches(/Recents/i).exists()) return true;
    if (textMatches(/Select multiple/i).exists()) return true;
    if (id("j76").exists()) return true;
  } catch (e) {}
  return false;
}

function handleCommonDialogsOnce() {
  // 素材选择页：Next 不是弹窗按钮，避免误点导致流程判断混乱
  if (isOnMediaPickerScreen()) return false;

  // 常见弹窗：权限/引导/订阅/通知等
  var buttons = [
    "Allow",
    "While using the app",
    "Only this time",
    "OK",
    "Got it",
    "Continue",
    "Next",
    "Not now",
    "Skip",
    "Cancel",
    "Later",
    "Agree",
    "Accept",
    "I agree",
    "Don’t allow",
    "Don't allow"
  ];
  return clickAnyText(buttons, "通用弹窗按钮", 300);
}

// ==================== 权限预授权（root/ADB） ====================

function getAndroidSdkInt() {
  try {
    if (typeof device !== "undefined" && device && device.sdkInt) return device.sdkInt;
  } catch (e) {}
  try {
    if (typeof android !== "undefined" && android.os && android.os.Build && android.os.Build.VERSION) {
      return android.os.Build.VERSION.SDK_INT;
    }
  } catch (e) {}
  return 0;
}

function shellBestEffort(cmd, desc) {
  desc = desc || cmd;
  try {
    var r = shell(cmd, true);
    if (r && typeof r.code === "number" && r.code === 0) return true;
  } catch (e) {
    // ignore，继续尝试非root
  }

  try {
    var r2 = shell(cmd, false);
    if (r2 && typeof r2.code === "number" && r2.code === 0) return true;
  } catch (e2) {}

  console.log("! 命令执行失败: " + desc + " => " + cmd);
  return false;
}

function ensureTikTokRuntimePermissions() {
  var pkg = TIKTOK_PACKAGE;
  var sdk = getAndroidSdkInt();
  console.log("启动前预授权TikTok权限, pkg=" + pkg + ", sdk=" + sdk);

  // 重点：避免上传时弹出“Allow TikTok to take pictures and record video?”
  var perms = [
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO"
  ];

  // 上传本地素材通常还需要相册/媒体读取权限
  if (sdk >= 33) {
    perms.push("android.permission.READ_MEDIA_IMAGES");
    perms.push("android.permission.READ_MEDIA_VIDEO");
  } else {
    perms.push("android.permission.READ_EXTERNAL_STORAGE");
  }

  for (var i = 0; i < perms.length; i++) {
    shellBestEffort("pm grant " + pkg + " " + perms[i], "授予权限 " + perms[i]);
  }

  // 某些ROM会通过 AppOps 进一步控制相机/麦克风，尽量同步放开（失败不影响继续）
  shellBestEffort("appops set " + pkg + " CAMERA allow", "AppOps CAMERA");
  shellBestEffort("appops set " + pkg + " RECORD_AUDIO allow", "AppOps RECORD_AUDIO");
}

// ==================== 文案拼装 ====================

function splitByComma(textValue) {
  var raw = String(textValue || "");
  if (!raw) return [];
  return raw
    .split(",")
    .map(function(s) {
      return String(s || "").trim();
    })
    .filter(function(s) {
      return !!s;
    });
}

function normalizeTags(tagsText) {
  var tags = splitByComma(tagsText);
  return tags.map(function(t) {
    if (!t) return "";
    if (t[0] === "#") return t;
    return "#" + t.replace(/\s+/g, "");
  }).filter(function(t){ return !!t; });
}

function normalizeMentions(mentionsText) {
  var ms = splitByComma(mentionsText);
  return ms.map(function(m) {
    if (!m) return "";
    if (m[0] === "@") return m;
    return "@" + m;
  }).filter(function(m){ return !!m; });
}

function buildFinalCaption(cfg) {
  var base = "";
  if (cfg.publish_mode === "video") {
    base = String(cfg.video_caption || "");
  } else {
    var title = String(cfg.album_title || "").trim();
    var cap = String(cfg.album_caption || "");
    base = title ? (title + "\n" + cap) : cap;
  }

  var tags = cfg.publish_mode === "video" ? normalizeTags(cfg.video_tags) : normalizeTags(cfg.album_tags);
  var mentions = cfg.publish_mode === "video" ? normalizeMentions(cfg.video_mentions) : normalizeMentions(cfg.album_mentions);

  var extras = [];
  if (tags.length) extras = extras.concat(tags);
  if (mentions.length) extras = extras.concat(mentions);

  var extraText = extras.join(" ").trim();
  if (!extraText) return String(base || "").trim();

  if (base && String(base).trim()) {
    return String(base).trim() + "\n" + extraText;
  }
  return extraText;
}

// ==================== 下载素材 ====================

function downloadAllMedia(cfg) {
   console.log("准备下载downloadAllMedia:");
  if (typeof scriptUtils === "undefined" || !scriptUtils.downloadMedia) {
    failAndStop("scriptUtils 不存在或不支持 downloadMedia");
  }
  console.log("scriptUtils存在:");
  var urls = [];
  if (cfg.publish_mode === "video") {
    urls.push(cfg.video_file);
    // 视频模式：只下载视频
  } else {
    urls = urls.concat(cfg.album_images || []);
  }
  console.log("准备下载素材url:", urls);
  console.log("准备下载素材数量:", urls.length);
  var results = scriptUtils.downloadMedia(urls, true);
    console.log("results:", results);
  if (!results || !Array.isArray(results)) {
    failAndStop("downloadMedia 返回值异常");
  }

  var okPaths = [];
  for (var i = 0; i < results.length; i++) {
    var p = results[i];
    if (p) okPaths.push(p);
  }
  console.log("下载成功数量:", okPaths.length, " / ", results.length);

  // 只要主素材成功即可继续（视频模式：第一个必须成功；图集：全部必须成功）
  if (cfg.publish_mode === "video") {
    if (!results[0]) failAndStop("视频下载失败: " + cfg.video_file);
  } else {
    if (okPaths.length !== (cfg.album_images || []).length) {
      failAndStop("图集下载存在失败项");
    }
  }

  return {
    urls: urls,
    results: results,
    okPaths: okPaths
  };
}

// ==================== TikTok 发布流程（英文界面） ====================

function launchTikTok() {
  console.log("启动 TikTok...");
  ensureTikTokRuntimePermissions();
  app.launchPackage(TIKTOK_PACKAGE);
  var ok = waitForPackage(TIKTOK_PACKAGE, 20000);
  if (!ok) return false;

  // 处理启动弹窗
  var rounds = 0;
  while (rounds < 12) {
    if (!handleCommonDialogsOnce()) break;
    rounds++;
    randomSleep(800, 1400);
  }
  return true;
}

function waitForPackage(pkg, timeoutMs) {
  timeoutMs = timeoutMs || 15000;
  var start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (currentPackage && currentPackage() === pkg) return true;
    sleep(300);
  }
  return false;
}

function isOnCreateCameraScreen() {
  try {
    return (
      textMatches(/PHOTO/i).exists() &&
      textMatches(/POST/i).exists() &&
      textMatches(/LIVE/i).exists()
    );
  } catch (e) {}
  return false;
}

function clickCbmOrFallbackOnce() {
  try {
    var cbmBtn = id("cbm").findOne(800);
    if (cbmBtn) return safeClick(cbmBtn, "Create相机界面 - cbm按钮");
  } catch (e) {}

  if (!isOnCreateCameraScreen()) return false;

  console.log("未找到 cbm 按钮，使用坐标点击兜底 (885,1599)");
  var x = 885;
  var y = 1599;
  if (typeof device !== "undefined" && device && device.width && device.height) {
    if (x >= device.width || y >= device.height) {
      x = Math.floor(device.width * 0.82);
      y = Math.floor(device.height * 0.83);
      console.log("设备分辨率不匹配，使用比例坐标兜底: (" + x + "," + y + ")");
    }
  }
  click(x, y);
  randomSleep(800, 1400);
  return true;
}

function openCreateAndUpload() {
  console.log("进入发布入口 (+)...");
  var createBtn = descContains("Create").clickable(true).findOne(2000);

  // 方式1：找描述为 Create / Add 的按钮
  // var createBtn =
  //   descMatches(/Create|Add|New post/i).findOne(1200) ||
  //   textMatches(/Create|Add/i).findOne(1200);
  if (createBtn && safeClick(createBtn, "Create按钮")) {
    randomSleep(1200, 2000);
  } else {
    // 方式2：坐标兜底（底部中间）
    console.log("未找到 Create 按钮，使用坐标点击兜底");
    click(device.width / 2, 1857);
    randomSleep(1200, 2000);
  }

  // 新流程：Create 后直接进入素材选择页（不再查找 Upload）
  // 期间可能先进入相机(Photo)界面，需要点 cbm 进入素材选择页
  for (var k = 0; k < 8; k++) {
    if (isOnMediaPickerScreen()) return true;
    if (clickCbmOrFallbackOnce()) {
      randomSleep(800, 1400);
      if (isOnMediaPickerScreen()) return true;
    }
    // 仅在未进入素材选择页前处理通用弹窗（权限/引导等）
    if (!isOnMediaPickerScreen()) handleCommonDialogsOnce();
    randomSleep(500, 900);
  }
  return isOnMediaPickerScreen();
}

function switchPickerTab(tabName) {
  if (!tabName) return false;
  return clickAnyText([tabName], "切换Tab", 800);
}

function toSortedByBoundsTopLeft(uiObjects) {
  var arr = [];
  if (!uiObjects) return arr;
  try {
    if (typeof uiObjects.forEach === "function") {
      uiObjects.forEach(function(el) { if (el) arr.push(el); });
    }
  } catch (e) {}

  // 兼容部分环境没有 forEach
  if (!arr.length) {
    try {
      var size = typeof uiObjects.size === "function" ? uiObjects.size() : uiObjects.length;
      for (var i = 0; i < size; i++) {
        var el2 = typeof uiObjects.get === "function" ? uiObjects.get(i) : uiObjects[i];
        if (el2) arr.push(el2);
      }
    } catch (e2) {}
  }

  arr.sort(function(a, b) {
    try {
      var ba = a.bounds();
      var bb = b.bounds();
      if (ba.top !== bb.top) return ba.top - bb.top;
      return ba.left - bb.left;
    } catch (e3) {
      return 0;
    }
  });
  return arr;
}

function clickByCenter(el, description) {
  try {
    if (el && el.click && el.click()) {
      console.log("点击: " + description);
      randomSleep(300, 700);
      return true;
    }
  } catch (e) {}
  try {
    var b = el && el.bounds ? el.bounds() : null;
    if (!b) return false;
    console.log("点击(坐标): " + description);
    click(b.centerX(), b.centerY());
    randomSleep(300, 700);
    return true;
  } catch (e2) {}
  return false;
}

function pickBySelectionCheckboxes(count) {
  if (count <= 0) return false;
  var boxes = null;
  try {
    boxes = id("j76").find();
  } catch (e) {}
  if (!boxes) return false;

  // UiObjectCollection: empty()；有些环境没有，做双判断
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

function pickFirstThumbnail() {
  // 选取一个“比较像缩略图”的可点击元素
  var candidates = clickable(true).find();
  if (!candidates || candidates.empty()) return false;

  var best = null;
  var bestScore = -1;
  candidates.forEach(function(el) {
    try {
      var b = el.bounds();
      if (!b) return;
      // 排除顶部/底部工具栏区域
      if (b.top < device.height * 0.12) return;
      if (b.bottom > device.height * 0.92) return;
      var w = b.width();
      var h = b.height();
      if (w < device.width * 0.18 || h < device.width * 0.18) return;
      var area = w * h;
      // 越靠上越优先（通常最新在左上）
      var score = area - b.top * 10;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    } catch (e) {}
  });

  if (!best) return false;
  return safeClick(best, "选择最新素材缩略图");
}

function enableMultiSelectIfNeeded() {
  // TikTok 图集多选入口可能是 "Select multiple"
  return clickAnyText(["Select multiple", "Multiple"], "开启多选", 600);
}

function pickAlbumThumbnails(count) {
  if (count <= 0) return false;
  enableMultiSelectIfNeeded();
  randomSleep(800, 1400);

  var picked = 0;
  for (var i = 0; i < count; i++) {
    // 每次重新找候选（避免点击后节点变化）
    if (pickNthThumbnail(i)) {
      picked++;
      randomSleep(400, 900);
    } else {
      break;
    }
  }
  console.log("图集选择数量:", picked, "/", count);
  return picked === count;
}

function pickNthThumbnail(index) {
  var candidates = clickable(true).find();
  if (!candidates || candidates.empty()) return false;

  var thumbs = [];
  candidates.forEach(function(el) {
    try {
      var b = el.bounds();
      if (!b) return;
      if (b.top < device.height * 0.12) return;
      if (b.bottom > device.height * 0.92) return;
      var w = b.width();
      var h = b.height();
      if (w < device.width * 0.18 || h < device.width * 0.18) return;
      thumbs.push({ el: el, b: b });
    } catch (e) {}
  });

  if (!thumbs.length) return false;

  // 排序：从上到下、从左到右
  thumbs.sort(function(a, b) {
    if (a.b.top !== b.b.top) return a.b.top - b.b.top;
    return a.b.left - b.b.left;
  });

  if (index >= thumbs.length) return false;
  return safeClick(thumbs[index].el, "选择第" + (index + 1) + "个缩略图");
}

function clickNextUntilPost(maxSteps) {
  maxSteps = maxSteps || 6;
  for (var i = 0; i < maxSteps; i++) {
    // 发布页通常会出现 Post 按钮或可编辑文案框
    if (textContains("Post").exists() || descContains("Post").exists()) return true;
    if (className("android.widget.EditText").exists()) return true;

    if (clickAnyText(["Next"], "Next按钮", 800)) {
      randomSleep(1500, 2600);
      continue;
    }
    // 素材选择页完全不跑通用弹窗处理，避免把 Next 当成弹窗按钮反复误点
    if (!isOnMediaPickerScreen()) handleCommonDialogsOnce();
    randomSleep(800, 1400);
  }
  return textContains("Post").exists() || descContains("Post").exists() || className("android.widget.EditText").exists();
}

function inputCaption(textValue) {
  var edit = className("android.widget.EditText").findOne(3000);
  if (!edit) {
    // 有些版本不是 EditText，可能是可点击文本区域
    var captionEntry = findElementByTextAny(["Describe your video", "Add a caption", "Add description"], 1500);
    if (captionEntry) safeClick(captionEntry, "文案输入入口");
    edit = className("android.widget.EditText").findOne(3000);
  }
  if (!edit) return false;

  console.log("填写文案，长度:", String(textValue || "").length);
  edit.setText(String(textValue || ""));
  randomSleep(800, 1400);
  return true;
}

function clickPostAndWait() {
  console.log("点击 Post...");
  if (!clickAnyText(["Post"], "Post按钮", 1500)) {
    // 兜底：找包含 Post 的节点
    var postBtn = textMatches(/Post/i).findOne(1200) || descMatches(/Post/i).findOne(1200);
    if (!postBtn || !safeClick(postBtn, "Post按钮(兜底)")) return false;
  }

  // 等待回到主界面或出现 Posted/Uploading 结束
  console.log("等待发布完成...");
  var start = Date.now();
  var timeoutMs = 90000;
  while (Date.now() - start < timeoutMs) {
    handleCommonDialogsOnce();
    if (isOnTikTokMainTab()) return true;
    if (textContains("Posted").exists() || textContains("Your video is being uploaded").exists()) return true;
    sleep(800);
  }
  return false;
}

function publishToTikTok(cfg) {
  if (!launchTikTok()) return false;

  if (!openCreateAndUpload()) {
    console.log("✗ 无法进入素材选择页");
    return false;
  }

  randomSleep(2000, 3200);

  if (cfg.publish_mode === "video") {
    console.log("选择视频...");
    switchPickerTab("Videos");
    randomSleep(800, 1400);
    // 优先按选择框(j76)选择第一个；找不到再用旧的缩略图启发式
    if (!pickBySelectionCheckboxes(1)) {
      if (!pickFirstThumbnail()) return false;
    }
    randomSleep(1200, 2000);
  } else {
    console.log("选择图集...");
    switchPickerTab("Photos");
    randomSleep(800, 1400);
    var imgCount = (cfg.album_images || []).length;
    // 优先按选择框(j76)按数量多选；找不到再走旧逻辑
    if (!pickBySelectionCheckboxes(imgCount)) {
      if (!pickAlbumThumbnails(imgCount)) return false;
    }
    randomSleep(1200, 2000);
  }

  // 下一步到发布页
  if (!clickNextUntilPost(8)) {
    console.log("✗ 无法到达发布页");
    return false;
  }

  var caption = buildFinalCaption(cfg);
  if (!inputCaption(caption)) {
    console.log("✗ 文案输入失败");
    return false;
  }

  if (!clickPostAndWait()) {
    console.log("✗ 发布等待超时/失败");
    return false;
  }

  return true;
}

// ==================== 主流程 ====================

function main() {
  console.show();
  console.log("=== TikTok 发布脚本启动 ===");

  if (!loadGmailConfig()) {
    failAndStop("加载发布参数失败");
  }

  var downloadInfo = downloadAllMedia(globalConfig);
  console.log("下载完成:", downloadInfo.okPaths);

  randomSleep(1500, 2500);

  var ok = publishToTikTok(globalConfig);
  if (!ok) {
    failAndStop("TikTok 发布流程失败");
  }

  var summary =
    "发布成功, mode=" +
    globalConfig.publish_mode +
    (globalConfig.publish_mode === "video"
      ? ", video=" + globalConfig.video_file
      : ", images=" + (globalConfig.album_images || []).length);

  reportResult(true, summary);
  console.log(summary);
}

main();
