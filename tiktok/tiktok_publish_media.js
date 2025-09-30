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
  video_file: "https://bj.bcebos.com/v1/yunapp-ftp/apk/img/12.mp4",
  video_caption: "这是一个测试视频支持多行文案",
  video_cover: "https://bj.bcebos.com/v1/yunapp-ftp/apk/img/sdk_bind.png",
  video_tags: "搞笑, 旅行",
  video_mentions: "@user123, @friend456"
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
    if (execArgv && execArgv.template_params) {
      rawParams = execArgv.template_params;
    } else if (ENABLE_LOCAL_DEFAULT_TEMPLATE_PARAMS) {
      console.log("未检测到下发 template_params，使用本地默认视频参数跑通流程");
      rawParams = DEFAULT_TEMPLATE_PARAMS_VIDEO_JSON;
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
        video_cover: (obj.video_cover || obj.videoCover || "").trim(),
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
  console.log("点击: " + description);
  element.click();
  randomSleep(500, 1200);
  return true;
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

function handleCommonDialogsOnce() {
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
    if (cfg.video_cover) urls.push(cfg.video_cover);
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

function openCreateAndUpload() {
  console.log("进入发布入口 (+)...");

  // 方式1：找描述为 Create / Add 的按钮
  var createBtn =
    descMatches(/Create|Add|New post/i).findOne(1200) ||
    textMatches(/Create|Add/i).findOne(1200);
  if (createBtn && safeClick(createBtn, "Create按钮")) {
    randomSleep(1200, 2000);
  } else {
    // 方式2：坐标兜底（底部中间）
    console.log("未找到 Create 按钮，使用坐标点击兜底");
    click(device.width / 2, Math.floor(device.height * 0.93));
    randomSleep(1200, 2000);
  }

  // 找 Upload
  console.log("点击 Upload...");
  var ok = false;
  for (var i = 0; i < 8; i++) {
    if (clickAnyText(["Upload"], "Upload入口", 800)) {
      ok = true;
      break;
    }
    handleCommonDialogsOnce();
    randomSleep(600, 1200);
  }
  return ok;
}

function switchPickerTab(tabName) {
  if (!tabName) return false;
  return clickAnyText([tabName], "切换Tab", 800);
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
    handleCommonDialogsOnce();
    randomSleep(800, 1400);
  }
  return textContains("Post").exists() || descContains("Post").exists() || className("android.widget.EditText").exists();
}

function trySetVideoCoverIfProvided(cfg) {
  try {
    if (!cfg || cfg.publish_mode !== "video") return true;
    if (!cfg.video_cover) return true;

    // 不同版本入口文案可能不同，这里尽量覆盖
    var coverEntry = findElementByTextAny(
      ["Cover", "Edit cover", "Select cover", "Set cover"],
      800
    );
    if (!coverEntry) return true;

    console.log("尝试设置封面...");
    safeClick(coverEntry, "封面入口");
    randomSleep(1200, 2000);

    // 如果进入了封面选择页，优先选最近的第一张（downloadMedia 会把封面放入媒体库）
    // 注意：有的版本是视频帧封面，不是相册封面；此处只做 best-effort
    switchPickerTab("Photos");
    randomSleep(600, 1200);
    pickFirstThumbnail();
    randomSleep(1200, 2000);

    // 确认/保存
    clickAnyText(["Done", "Save", "Confirm", "OK"], "封面确认", 800);
    randomSleep(800, 1400);

    return true;
  } catch (e) {
    // 封面失败不影响主流程
    console.warn("设置封面失败(忽略):", e.message);
    return true;
  }
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
    console.log("✗ 无法进入 Upload");
    return false;
  }

  randomSleep(2000, 3200);

  if (cfg.publish_mode === "video") {
    console.log("选择视频...");
    switchPickerTab("Videos");
    randomSleep(800, 1400);
    if (!pickFirstThumbnail()) return false;
    randomSleep(1200, 2000);
  } else {
    console.log("选择图集...");
    switchPickerTab("Photos");
    randomSleep(800, 1400);
    if (!pickAlbumThumbnails((cfg.album_images || []).length)) return false;
    randomSleep(1200, 2000);
  }

  // 下一步到发布页
  if (!clickNextUntilPost(8)) {
    console.log("✗ 无法到达发布页");
    return false;
  }

  // 封面设置：best-effort，不影响主流程
  trySetVideoCoverIfProvided(cfg);

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
