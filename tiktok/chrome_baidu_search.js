/**
 * Chrome 百度搜索脚本
 * 需求：
 * 1. 打开 Chrome 浏览器
 * 2. 输入网址 baidu.com
 * 3. 进入百度后输入关键词并执行搜索
 *
 * 关键词来源：loadGmailConfig 方法（保持与原脚本的一致接口）
 */

// ==================== 全局变量 ====================
var globalTaskId = "30001";
var searchKeyword = "自动化测试";
var CHROME_PACKAGE = "com.android.chrome";

// ==================== 配置加载 ====================

function loadGmailConfig() {
  try {
    if (
      typeof engines !== "undefined" &&
      engines.myEngine &&
      engines.myEngine().execArgv
    ) {
      var execArgv = engines.myEngine().execArgv;

      if (execArgv && execArgv.task_id) {
        globalTaskId = execArgv.task_id;
      }

      if (execArgv && execArgv.template_params) {
        var config = execArgv.template_params;
        searchKeyword = config.optString("search_content",searchKeyword);
        console.log("✓ 配置加载成功: searchKeyword = " + searchKeyword);
        return true;
      }
    }

    console.log("✓ 使用默认搜索关键词: " + searchKeyword);
    return true;
  } catch (error) {
    console.error("加载配置失败:", error);
    return false;
  }
}

// ==================== 工具函数 ====================

function randomSleep(minMs, maxMs) {
  if (typeof maxMs === "undefined") {
    maxMs = minMs;
  }
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

function safeInput(element, textValue, description) {
  if (!element) {
    console.warn(description + " 元素不存在");
    return false;
  }
  if (!element.editable()) {
    console.warn(description + " 不可编辑");
    return false;
  }
  console.log("输入 " + description + ": " + textValue);

  element.setText(textValue);
  randomSleep(800, 1500);
  return true;
}

function findElementByText(searchText, timeout) {
  timeout = timeout || 3000;
  var element = text(searchText).findOne(timeout);
  if (element) return element;
  element = textContains(searchText).findOne(1000);
  if (element) return element;
  element = desc(searchText).findOne(1000);
  if (element) return element;
  return descContains(searchText).findOne(1000);
}

function clickAnyText(targets, description, timeout) {
  timeout = timeout || 300;
  for (var i = 0; i < targets.length; i++) {
    var target = targets[i];
    if (!target) continue;
    var element = text(target).findOne(timeout);
    if (!element) element = textContains(target).findOne(200);
    if (!element) element = desc(target).findOne(200);
    if (!element) element = descContains(target).findOne(200);
    if (element) {
      return safeClick(element, description + " - " + target);
    }
  }
  return false;
}

function isChromeReadyForUrlEntry() {
  if (id("url_bar").exists()) {
    return true;
  }
  var hints = [
    "搜索或输入网址",
    "Search or type web address",
    "Enter search or address",
    "输入网址或搜索词",
    "Search or type address",
  ];
  for (var i = 0; i < hints.length; i++) {
    if (
      text(hints[i]).exists() ||
      textContains(hints[i]).exists() ||
      desc(hints[i]).exists() ||
      descContains(hints[i]).exists()
    ) {
      return true;
    }
  }
  return false;
}

function handleChromePermissionDialogs() {
  var allowTexts = [
    "允许",
    "始终允许",
    "仅在使用时允许",
    "仅在使用应用时允许",
    "Allow",
    "Allow only while using the app",
    "While using the app",
    "Only this time",
  ];
  if (clickAnyText(allowTexts, "权限允许按钮")) {
    return true;
  }
  return false;
}

function handleBaiduPermissionDialogs() {
  var allowTexts = ["一律不允许", "仅这次访问时允许", "访问该网站时允许"];
  if (clickAnyText(allowTexts, "百度获取位置权限")) {
    randomSleep(800, 1500);
  }
  if (text("设备的信息").exists() && text("禁止").exists()) {
    text("禁止").findOnce().click();
    randomSleep(800, 1500);
  }
  var continueTexts = ["确定", "继续", "Continue"];
  if (clickAnyText(continueTexts, "权限提示继续按钮", 800)) {
    randomSleep(800, 1500);
  }
  if (text("选择活动").exists() && text("Chrome").exists()) {
    text("Chrome").findOnce().click();
    randomSleep(800, 1500);
  }
}

function handleChromeFirstRunPrompts() {
  var skipLogin = clickAnyText(
    [
      "在不登录账号的情况下使用",
      "继续不登录",
      "暂时跳过",
      '接受并继续',
      "Use without an account",
      "Continue without signing in",
    ],
    "Chrome 账号登录提示"
  );
  if (skipLogin) {
    randomSleep(800, 1500);
  }

  var privacyAck = clickAnyText(
    ['不用了',"知道了", "我知道了", "Got it", "了解"],
    "Chrome 隐私提示"
  );
  if (privacyAck) {
    randomSleep(800, 1500);
  }

  return clickAnyText(
    ["下一步", "Next", "确定", "继续"],
    "Chrome 引导下一步"  );
}

function ensureChromeReadyForUrlEntry() {
  console.log("=== 等待 Chrome 可输入网址 ===");
  randomSleep(800, 1500);
  if (isChromeReadyForUrlEntry()) {
    console.log("✓ Chrome 地址栏已就绪");
    return true;
  }
  var maxRounds = 12;
  for (var round = 0; round < maxRounds; round++) {
    var handled = false;
    if (handleChromePermissionDialogs()) {
      handled = true;
    }
    if (handleChromeFirstRunPrompts()) {
      handled = true;
    }
    if (isChromeReadyForUrlEntry()) {
      console.log("✓ Chrome 地址栏已就绪");
      return true;
    }
    if (!handled) {
      randomSleep(800, 1400);
    }
  }
  if (isChromeReadyForUrlEntry()) {
    console.log("✓ Chrome 地址栏已就绪");
    return true;
  }
  console.log("✗ 未能在限定时间内完成 Chrome 初始化");
  return false;
}

// ==================== 核心流程 ====================

function launchChrome() {
  console.log("=== 启动 Chrome 浏览器 ===");
  try {
    app.launch(CHROME_PACKAGE);
    randomSleep(3000, 4500);
    if (currentPackage() !== CHROME_PACKAGE) {
      console.log("✗ Chrome 未在前台，当前包: " + currentPackage());
      return false;
    }
    return ensureChromeReadyForUrlEntry();
  } catch (error) {
    console.error("启动 Chrome 失败:", error);
    return false;
  }
}

function openBaiduHomepage() {
  console.log("=== 准备打开百度 ===");
  try {
    var intent = app.intent({
      action: "android.intent.action.VIEW",
      data: "https://www.baidu.com",
      packageName: CHROME_PACKAGE,
      flags: ["activity_new_task"],
    });
    app.startActivity(intent);
    randomSleep(3000, 4500);
    handleBaiduPermissionDialogs();
    console.log("=== 已请求打开百度 ===");
    return true;
  } catch (error) {
    console.error("打开百度失败:", error);
    return false;
  }
}

function performBaiduSearch() {
  console.log("=== 执行百度搜索 ===");
  randomSleep(2500, 3500);
  try {
    var searchBox = findElementByText("输入关键词", 2000);
    if (!searchBox) {
      console.log("✗ 未找到输入关键词");
      var webInputs = className("android.widget.EditText").find();
      for (var i = 0; i < webInputs.length; i++) {
        var input = webInputs[i];
        if (input && input.editable()) {
          searchBox = input;
          break;
        }
      }
    }

    if (!searchBox) {
      console.log("✗ 未找到百度搜索输入框");
      return false;
    }

    safeClick(searchBox, "百度搜索输入框");
    if (!safeInput(searchBox, searchKeyword, "百度搜索输入框")) {
      return false;
    }

    var searchButton = text("百度一下").clickable(true).findOne(2000);
    if (searchButton) {
      safeClick(searchButton, "百度一下按钮");
    } else {
      press("enter");
    }

    randomSleep(3000, 4000);
    console.log("✓ 百度搜索完成");
    return true;
  } catch (error) {
    console.error("执行百度搜索异常:", error);
    return false;
  }
}

function performBaiduSearch1() {
  console.log("=== 执行百度搜索 ===");
  randomSleep(800, 1500);
  try {
    console.log("点击搜索框");
    click("输入关键词");
    randomSleep(800, 1500);
    console.log("输入文本"+searchKeyword);
    setText(searchKeyword);
    randomSleep(800, 1500);
    console.log("百度一下");
    click("百度一下")
    console.log("✓ 百度搜索完成");
    return true;
  } catch (error) {
    console.error("执行百度搜索异常:", error);
    return false;
  }
}

function ocrBaiduSearch() {
  try {
    handleBaiduPermissionDialogs();
    console.log("=== 准备开始ocr识别 ===");
    randomSleep(800, 1500);
    requestAndGrantScreen();
    var didi = ocr();
    console.log("ocr识别结果是:" + didi);
    reportResult(true, didi);
    console.log("脚本执行成功");
    return true;
  } catch (error) {
    console.error("执行ocr识别异常:", error);
    return false;
  }
}


function reportResult(isSuccess, message) {
    try {
        if (globalTaskId && typeof scriptUtils !== 'undefined' && scriptUtils.reportLog) {
            var resultMap = {
                "status": isSuccess ? "success" : "failed",
                "result": isSuccess ?  message : "百度搜索识别失败: " + message,
                "task_id": globalTaskId
            };
            
            console.log("上报结果:", resultMap);
            scriptUtils.reportLog(globalTaskId, JSON.stringify(resultMap));
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


/* ── 4. Main function: Request and auto-click permission dialog ─────────── */
function requestAndGrantScreen() {
  var startTime = Date.now();
  var TOTAL_TIMEOUT = 30000; // 30 seconds total timeout

  console.log("=== Starting screenshot permission request process ===");
  console.log("Total timeout: " + TOTAL_TIMEOUT + "ms (30 seconds)");

  // Log initial UI state
  console.log("UI state before permission request:");
  logCurrentUIElements();

  // Start async permission request to avoid blocking
  console.log("Starting async permission request...");

  var requestThread = null;
  var threadCompleted = false;

  // Start permission request in background thread
  requestThread = threads.start(function() {
      try {
          console.log("Background thread: Starting requestScreenCapture()");
          var result = requestScreenCapture(device.width>device.height);
          console.log("Background thread: Permission request result = " + result);
          threadCompleted = true;
          return result;
      } catch (e) {
          console.error("Background thread: Permission request exception = " + e);
          threadCompleted = true;
          return false;
      }
  });

  console.log("Permission request started in background, main thread monitoring dialog...");

  // Start monitoring permission dialog immediately, don't wait for requestScreenCapture to complete
  sleep(300); // Brief wait for dialog to potentially appear

  // Log UI state when dialog monitoring starts
  console.log("UI state when dialog monitoring starts:");
  logCurrentUIElements();

  // Wrap all subsequent operations in timeout check
  try {
      return executeWithTimeout(TOTAL_TIMEOUT, startTime, requestThread);
  } catch (e) {
      console.error("Permission request process exception: " + e);
      cleanupResources(requestThread);
      throw e;
  }
}

/* ── 13. Execute with timeout ─────────── */
function executeWithTimeout(timeoutMs, startTime, requestThread) {

  // Check if timeout reached
  function checkTimeout(stage) {
      var elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
          console.error("30s total timeout! Current stage: " + stage + ", elapsed: " + elapsed + "ms");
          cleanupResources(requestThread);
          throw "Screenshot permission request timeout (" + elapsed + "ms)";
      }
      return elapsed;
  }

  // Use multi-strategy attempts to click authorization button
  checkTimeout("Smart strategy start");
  var strategyStartTime = Date.now();

  if (tryGrantPermissionStrategies(timeoutMs, startTime)) {
      checkTimeout("Smart strategy completed");
      console.log("Smart strategy click successful, waiting for permission to take effect...");

      // Calculate remaining time for permission effectiveness check
      var elapsed = checkTimeout("Permission effectiveness check start");
      var remainingTime = Math.max(3000, timeoutMs - elapsed);

      // Wait for permission to actually take effect
      if (waitForPermissionGranted(remainingTime)) {
          var totalTime = Date.now() - startTime;
          console.log("Permission authorization successful! Total time: " + totalTime + "ms");
          cleanupResources(requestThread);
          console.log("=== Screenshot permission request process completed ===");
          return;
      } else {
          console.warn("Smart strategy executed but permission may not have fully taken effect");
      }
  }

  checkTimeout("Fallback strategy start");
  var strategyTime = Date.now() - strategyStartTime;
  console.warn("All smart strategies failed, time: " + strategyTime + "ms, using coordinate fallback");

  // Final fallback strategy: try multiple possible positions
  var fallbackPositions = [
      {x: device.width * 0.75, y: device.height * 0.85, desc: "bottom right"},
      {x: device.width * 0.5, y: device.height * 0.85, desc: "bottom center"},
      {x: device.width * 0.85, y: device.height * 0.9, desc: "lower right corner"},
      {x: device.width * 0.5, y: device.height * 0.6, desc: "center"}
  ];

  for (var i = 0; i < fallbackPositions.length; i++) {
      // Check timeout before each click
      checkTimeout("Fallback strategy " + (i+1));

      var pos = fallbackPositions[i];
      console.log("Fallback strategy " + (i+1) + "/" + fallbackPositions.length + ": trying " + pos.desc + " position (" + pos.x.toFixed(0) + ", " + pos.y.toFixed(0) + ")");

      // Log UI state before clicking
      logCurrentUIElements();

      click(pos.x, pos.y);
      sleep(800);

      // Log UI state after clicking
      console.log("UI state after clicking " + pos.desc + ":");
      logCurrentUIElements();

      // Calculate remaining time for permission effectiveness check
      var elapsed = checkTimeout("Fallback strategy " + (i+1) + " permission check");
      var remainingTime = Math.max(1000, timeoutMs - elapsed); // At least 1 second for checking

      // Check if permission is effective
      if (waitForPermissionGranted(remainingTime)) {
          var totalTime = Date.now() - startTime;
          console.log(pos.desc + " position click successful! Total time: " + totalTime + "ms");
          cleanupResources(requestThread);
          console.log("=== Screenshot permission request process completed ===");
          return;
      }
  }

  // All strategies failed
  var totalTime = Date.now() - startTime;
  console.error("All attempts failed, permission requires manual authorization! Total time: " + totalTime + "ms");
  console.log("Final UI state:");
  logCurrentUIElements();
  cleanupResources(requestThread);
  console.log("=== Screenshot permission request process ended (failed) ===");
  throw "Screenshot permission request ultimately failed, time: " + totalTime + "ms";
}

/* ── 14. Resource cleanup function ─────────── */
function cleanupResources(requestThread) {
  try {
      if (requestThread) {
          console.log("Cleaning up background permission request thread...");
          // Check thread status
          if (requestThread.isAlive && requestThread.isAlive()) {
              console.log("Thread still running, attempting to interrupt...");
              requestThread.interrupt();

              // Wait briefly for thread to exit
              var waitCount = 0;
              while (requestThread.isAlive() && waitCount < 10) {
                  sleep(100);
                  waitCount++;
                  console.log("Waiting for thread to exit... " + waitCount + "/10");
              }

              if (requestThread.isAlive()) {
                  console.warn("Warning: Thread may not have fully exited, this could cause resource leaks");
              } else {
                  console.log("Thread successfully exited");
              }
          } else {
              console.log("Thread already ended or doesn't exist");
          }
      }

      // Other cleanup work can be added here
      console.log("Resource cleanup completed");

  } catch (e) {
      console.error("Error during resource cleanup: " + e);
  }
}

/* ── 5. Multi-strategy permission authorization attempts ─────────── */
function tryGrantPermissionStrategies(totalTimeoutMs, startTime) {
  var maxAttempts = 15; // Max 15 attempts, 3 seconds total
  var attemptInterval = 200; // 200ms between attempts

  console.log("Starting smart strategy attempts, max " + maxAttempts + " times, " + attemptInterval + "ms interval");

  // Internal timeout check function
  function checkStrategyTimeout() {
      if (totalTimeoutMs && startTime) {
          var elapsed = Date.now() - startTime;
          if (elapsed > totalTimeoutMs) {
              console.warn("Strategy execution timeout, elapsed: " + elapsed + "ms");
              return true;
          }
      }
      return false;
  }

  for (var attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check total timeout before each attempt
      if (checkStrategyTimeout()) {
          console.log("Strategy attempt interrupted due to total timeout, current attempt " + attempt);
          break;
      }
      var attemptStartTime = Date.now();
      console.log("\n--- Attempt " + attempt + "/" + maxAttempts + " ---");

      // Strategy 1: Find confirmation button through keyword matching
      console.log("Trying strategy 1: keyword matching");
      if (tryStrategy1()) return true;

      // Strategy 2: Find button through ID matching
      console.log("Trying strategy 2: ID matching");
      if (tryStrategy2()) return true;

      // Strategy 3: Find right/bottom buttons through position
      console.log("Trying strategy 3: position strategy");
      if (tryStrategy3()) return true;

      // Strategy 4: Find newly appeared clickable elements
      console.log("Trying strategy 4: smart element identification");
      if (tryStrategy4()) return true;

      var attemptTime = Date.now() - attemptStartTime;
      console.log("Attempt " + attempt + " failed, time: " + attemptTime + "ms");

      // Check timeout again before waiting for next attempt
      if (attempt < maxAttempts) {
          if (checkStrategyTimeout()) {
              console.log("Total timeout reached while waiting, stopping subsequent attempts");
              break;
          }
          sleep(attemptInterval);
      }
  }

  console.log("All smart strategy attempts completed or timed out");
  return false;
}

/* ── 6. Strategy 1: Keyword matching ─────────── */
function tryStrategy1() {
  // Extended keyword list, supports more ROMs
  var keywords = /立即开始|马上开始|允许|确定|确认|同意|开始|授权|继续|立即录制|开始录制|Start now|Allow|OK|Accept|Grant|Yes|Begin|Continue|Confirm|Agree/i;
  console.log("   Finding keyword matching button: " + keywords.source);

  var btn = textMatches(keywords)
              .clickable(true)
              .findOne(500);

  if (btn) {
      var bounds = btn.bounds();
      var packageName = btn.packageName();
      var className = btn.className();
      console.log("   Strategy 1 success: found button");
      console.log("      Text: \"" + btn.text() + "\"");
      console.log("      Package: " + packageName);
      console.log("      Class: " + className);
      console.log("      Position: (" + bounds.centerX().toFixed(0) + ", " + bounds.centerY().toFixed(0) + ")");
      console.log("      Size: " + bounds.width() + "x" + bounds.height());
      console.log("      Bounds: " + bounds.toString());

      btn.click();
      console.log("   Button clicked, waiting 800ms");
      sleep(800);
      return true;
  } else {
      console.log("   Strategy 1 failed: no keyword matching button found");
  }

  return false;
}

/* ── 7. Strategy 2: ID matching ─────────── */
function tryStrategy2() {
  // Extended ID matching list
  var idPattern = /button1|btn_ok|allow|positive|confirm|grant|ok|accept|start|begin/i;
  console.log("   Finding ID matching button: " + idPattern.source);

  var btn = idMatches(idPattern)
              .clickable(true)
              .findOne(100);

  if (btn) {
      var bounds = btn.bounds();
      var packageName = btn.packageName();
      var className = btn.className();
      console.log("   Strategy 2 success: found button");
      console.log("      ID: \"" + btn.id() + "\"");
      console.log("      Text: \"" + btn.text() + "\"");
      console.log("      Package: " + packageName);
      console.log("      Class: " + className);
      console.log("      Position: (" + bounds.centerX().toFixed(0) + ", " + bounds.centerY().toFixed(0) + ")");
      console.log("      Size: " + bounds.width() + "x" + bounds.height());

      btn.click();
      console.log("   Button clicked, waiting 800ms");
      sleep(800);
      return true;
  } else {
      console.log("   Strategy 2 failed: no ID matching button found");
  }

  return false;
}

/* ── 8. Strategy 3: Position strategy ─────────── */
function tryStrategy3() {
  // Find buttons on right or bottom (usually confirmation buttons)
  console.log("   Finding Button controls on right or bottom");

  var buttons = className("android.widget.Button")
                  .clickable(true)
                  .find();

  console.log("   Found " + buttons.length + " Button controls");

  var bestButton = null;
  var bestScore = -1;

  for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var bounds = btn.bounds();
      var packageName = btn.packageName();
      var text = btn.text();

      console.log("      Button" + (i+1) + ": \"" + text + "\" position:(" + bounds.centerX().toFixed(0) + ", " + bounds.centerY().toFixed(0) + ") package:" + packageName);

      // Skip cancel-like buttons
      var cancelKeywords = /取消|Cancel|Deny|No|Refuse|拒绝|否|不/i;
      if (cancelKeywords.test(text)) {
          console.log("         Skipping cancel button: " + text);
          continue;
      }

      // Calculate position score (prefer right and bottom)
      var xRatio = bounds.centerX() / device.width;
      var yRatio = bounds.centerY() / device.height;

      // Only consider buttons in reasonable positions
      if (xRatio > 0.2 && yRatio > 0.5) {
          // Score: prefer right side more, and lower position slightly
          var score = xRatio * 2 + yRatio * 0.5;

          console.log("         Position score: " + score.toFixed(2) + " (x=" + xRatio.toFixed(2) + ", y=" + yRatio.toFixed(2) + ")");

          if (score > bestScore) {
              bestButton = btn;
              bestScore = score;
              console.log("         New best button: " + text);
          }
      }
  }

  if (bestButton) {
      var bounds = bestButton.bounds();
      var packageName = bestButton.packageName();
      var text = bestButton.text();

      console.log("   Strategy 3 success: selected best position button");
      console.log("      Text: \"" + text + "\"");
      console.log("      Package: " + packageName);
      console.log("      Position: (" + bounds.centerX().toFixed(0) + ", " + bounds.centerY().toFixed(0) + ")");
      console.log("      Screen ratio: X=" + (bounds.centerX()/device.width).toFixed(2) + " Y=" + (bounds.centerY()/device.height).toFixed(2));
      console.log("      Final score: " + bestScore.toFixed(2));

      bestButton.click();
      console.log("   Button clicked, waiting 800ms");
      sleep(800);
      return true;
  }

  console.log("   Strategy 3 failed: no position-matching button found");
  return false;
}

/* ── 9. Strategy 4: Find newly appeared clickable elements ─────────── */
function tryStrategy4() {
  // Find all currently clickable elements, prefer newly appeared ones
  console.log("   Finding newly appeared clickable elements");
  var clickables = clickable(true).find();

  for (var i = 0; i < clickables.length; i++) {
      var element = clickables[i];
      var bounds = element.bounds();
      var packageName = element.packageName();
      var text = element.text();

      // Skip elements that are obviously not permission dialog
      if (packageName && packageName.includes("hw.talkback")) {
          continue;
      }

      // Prefer elements with confirmation text or positioned bottom/right
      if ((text && /confirm|allow|start|ok|yes/i.test(text)) ||
          bounds.centerY() > device.height * 0.6 ||
          bounds.centerX() > device.width * 0.6) {

          console.log("   Strategy 4 trying: click element \"" + text + "\" package:" + packageName + " position:(" + bounds.centerX().toFixed(0) + ", " + bounds.centerY().toFixed(0) + ")");
          element.click();
          sleep(800);

          // Check if successful (simple judgment: dialog disappeared)
          if (!hasPermissionDialog()) {
              console.log("   Strategy 4 success");
              return true;
          }
      }
  }

  console.log("   Strategy 4 failed: no suitable elements found");
  return false;
}

/* ── 10. Check if permission dialog still exists ─────────── */
function hasPermissionDialog() {
  // Judge if permission-related dialog still exists through keywords
  return textMatches(/screen.*capture|record.*screen|media.*projection|permission/i)
           .exists();
}

/* ── 11. Device info logging ─────────── */
function logDeviceInfo() {
  console.log("Device info:");
  console.log("   Screen size: " + device.width + "x" + device.height);
  console.log("   Android version: " + device.release);
  console.log("   SDK version: " + device.sdkInt);
  console.log("   Device model: " + device.model);
  console.log("   Device brand: " + device.brand);
  console.log("   Device manufacturer: " + device.product);

  // Get screen density
  try {
      var metrics = context.getResources().getDisplayMetrics();
      console.log("   Screen density: " + metrics.density);
      console.log("   DPI: " + metrics.densityDpi);
  } catch (e) {
      console.log("   Screen density info failed: " + e);
  }
}

/* ── 12. UI element state logging ─────────── */
function logCurrentUIElements() {
  try {
      // Log all current clickable elements
      var clickables = clickable(true).find();
      console.log("Current clickable elements count: " + clickables.length);

      for (var i = 0; i < Math.min(clickables.length, 10); i++) {
          var element = clickables[i];
          var bounds = element.bounds();
          var packageName = element.packageName();
          var className = element.className();
          var text = element.text();
          var id = element.id();

          console.log("   Element" + (i+1) + ":");
          console.log("      Text: \"" + text + "\"");
          console.log("      ID: \"" + id + "\"");
          console.log("      Class: " + className);
          console.log("      Package: " + packageName);
          console.log("      Position: (" + bounds.centerX().toFixed(0) + ", " + bounds.centerY().toFixed(0) + ")");
          console.log("      Size: " + bounds.width() + "x" + bounds.height());
      }

      if (clickables.length > 10) {
          console.log("   ..." + (clickables.length - 10) + " more elements not shown");
      }

      // Check for permission-related text
      var permissionTexts = textMatches(/screen|capture|record|media|projection|allow|grant|permission/i).find();
      if (permissionTexts.length > 0) {
          console.log("Permission-related text elements: " + permissionTexts.length);
          for (var i = 0; i < Math.min(permissionTexts.length, 5); i++) {
              var element = permissionTexts[i];
              console.log("   Permission text" + (i+1) + ": \"" + element.text() + "\" package:" + element.packageName());
          }
      }

  } catch (e) {
      console.error("Error logging UI elements: " + e);
  }
}

/* ── 13. Wait for permission effectiveness check ─────────── */
function waitForPermissionGranted(timeoutMs) {
  console.log("Waiting for permission effectiveness check, timeout: " + timeoutMs + "ms");

  var startTime = Date.now();
  var checkInterval = 200;
  var checkCount = 0;

  while (Date.now() - startTime < timeoutMs) {
      checkCount++;

      try {
          // Method 1: Check if permission dialog disappeared (main criterion)
          var hasDialog = hasPermissionDialog();
          console.log("Permission check " + checkCount + ": permission dialog exists=" + hasDialog);

          if (!hasDialog) {
              console.log("Permission dialog disappeared, permission may have taken effect");
              // Wait a bit more to ensure permission fully takes effect
              sleep(500);
              return true;
          }

          // Method 2: Try checking if screen info can be obtained (more direct method)
          try {
              // Don't directly call captureScreen here as it may not be fully effective yet
              // Can check other related states
              console.log("Permission check " + checkCount + ": continuing to wait...");
          } catch (e) {
              console.log("Permission check " + checkCount + ": exception during check: " + e);
          }

      } catch (e) {
          console.log("Permission effectiveness check exception: " + e);
      }

      sleep(checkInterval);
  }

  console.warn("Permission effectiveness check timeout, elapsed: " + (Date.now() - startTime) + "ms, performed " + checkCount + " checks");

  // Final check of dialog status
  var finalCheck = hasPermissionDialog();
  console.log("Final check: permission dialog exists=" + finalCheck);

  return !finalCheck; // If dialog disappeared, assume permission may have taken effect
}






// ==================== 主流程 ====================

function startBaiduSearchFlow() {
  if (!loadGmailConfig()) {
    failAndStop("加载配置失败");
  }

  if (!launchChrome()) {
    failAndStop("启动 Chrome 失败");
  }

  if (!openBaiduHomepage()) {
    failAndStop("打开百度首页失败");
  }

  if (!performBaiduSearch1()) {
    failAndStop("执行百度搜索失败");
  }

  if (!ocrBaiduSearch()) {
    failAndStop("OCR 识别失败");
  }

  return true;
}

(function main() {
  console.show();
  console.log("=== Chrome 百度搜索脚本启动 ===");

  if (!auto.service) {
    console.error("请先开启无障碍服务");
    auto();
    return;
  }

  startBaiduSearchFlow();
})();
