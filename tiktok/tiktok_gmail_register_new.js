/**
 * TikTok Gmail注册脚本 - 全新设计版本
 * 采用应用内登录流程，避开系统设置限制
 * 
 * 核心思路：
 * 1. 清空TikTok应用数据，确保全新状态
 * 2. 直接启动TikTok应用
 * 3. 在TikTok应用内完成Google登录流程
 * 4. 避开Android系统设置和独立Google登录页面的限制
 */

// ==================== 全局变量 ====================
var globalTaskId = "30001";
// var gmailEmail = "yenc2170@gmail.com";
// var gmailPassword = "Ahjzxba123@";
var gmailEmail = "huyang191@163.com";
var gmailPassword = "@Hu476190636.";
var initialSwipeCompleted = false;

// ==================== 配置加载 ====================

function loadGmailConfig() {
    try {
        if (typeof engines !== 'undefined' && engines.myEngine && engines.myEngine().execArgv) {
            var execArgv = engines.myEngine().execArgv;
            
            if (execArgv && execArgv.taskId) {
                globalTaskId = execArgv.taskId;
            }
            
            if (execArgv && execArgv.template_params) {
                var config = execArgv.template_params;
                // 可以从配置中获取邮箱密码，这里使用默认值
                console.log("✓ Gmail配置加载成功");
                console.log("Gmail邮箱:", gmailEmail);
                
                if (!gmailEmail || !gmailPassword) {
                    console.log("✗ Gmail邮箱或密码为空");
                    reportResult(false, "Gmail邮箱或密码为空");
                    return false;
                }
                
                reportResult(true, "Gmail配置加载成功");
                return true;
            }
        }
        
        console.log("✓ 使用默认Gmail配置");
        return true;
        
    } catch (error) {
        console.error("加载Gmail配置失败:", error);
        reportResult(false, "加载Gmail配置失败: " + error.message);
        return false;
    }
}

function reportResult(isSuccess, message) {
    try {
        if (globalTaskId && typeof scriptUtils !== 'undefined' && scriptUtils.sendTaskResult) {
            var resultMap = {
                "status": isSuccess ? "success" : "failed",
                "result": isSuccess ? "TikTok Gmail注册成功: " + message : "TikTok Gmail注册失败: " + message,
                "task_id": globalTaskId
            };
            
            console.log("上报结果:", resultMap);
            scriptUtils.sendTaskResult(resultMap);
        }
    } catch (e) {
        console.error("上报结果时出错:", e.message);
    }
}

// ==================== 工具函数 ====================

function randomSleep(minMs, maxMs) {
    var sleepTime = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    console.log("等待 " + sleepTime + "ms");
    sleep(sleepTime);
}

function safeClick(element, description) {
    try {
        if (element) {
            console.log("点击: " + description);
            element.click();
            randomSleep(500, 1500);
            return true;
        } else {
            console.warn(description + " 元素不存在");
            return false;
        }
    } catch (error) {
        console.error("点击 " + description + " 失败:", error);
        return false;
    }
}

function safeInput(element, inputText, description) {
    try {
        if (element && element.editable()) {
            console.log("输入到 " + description + ": " + inputText);
            element.setText(inputText);
            randomSleep(1000, 2000);
            return true;
        } else {
            console.warn(description + " 不可编辑或不存在");
            return false;
        }
    } catch (error) {
        console.error("输入到 " + description + " 失败:", error);
        return false;
    }
}

function findElementByText(searchText, timeout) {
    timeout = timeout || 3000;
    try {
        // 方法2: 包含匹配
        element = textContains(searchText).findOne(timeout / 2);
        if (element) return element;
        // 方法3: 描述匹配
        element = desc(searchText).findOne(timeout / 2);
        if (element) return element;
        return null;
    } catch (error) {
        console.error("查找元素失败:", error);
        return null;
    }
}


function findExactElementByText(searchText, timeout,clickable =true) {
    timeout = timeout || 3000;
    try {
        // 方法1: 精确匹配
        var element = text(searchText).clickable(clickable).findOne(timeout / 2);
        if (element) return element;
        // 方法4: 描述包含匹配
        element = descContains(searchText).clickable(clickable).findOne(timeout / 2);
        if (element) return element;

        return null;
    } catch (error) {
        console.error("查找元素失败:", error);
        return null;
    }
}

// ==================== 核心功能函数 ====================

/**
 * 清空TikTok应用数据
 * 确保应用回到全新安装状态
 */
function clearTikTokData() {
    console.log("=== 清空TikTok应用数据 ===");
    
    var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";
    
    try {
        console.log("尝试强制停止应用...");
        shell("am force-stop " + TIKTOK_PACKAGE, false);
        randomSleep(1000, 2000);
        
        // 再次尝试清空
        result = shell("pm clear " + TIKTOK_PACKAGE, false);
        console.log("清空数据结果:", result);
        if (result.code === 0) {
            console.log("✓ 强制停止后清空数据成功");
            randomSleep(2000, 3000);
            return true;
        }
        console.log("⚠ 无法自动清空数据，但继续执行");
        return true;
        
    } catch (error) {
        console.error("清空TikTok数据时发生错误:", error);
        console.log("⚠ 清空数据失败，但继续执行");
        return true; // 即使失败也继续执行
    }
}

/**
 * 启动全新的TikTok应用
 */
function launchTikTokFresh() {
    console.log("=== 启动全新TikTok应用 ===");
    
    var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";
    
    try {
        // 确保应用完全关闭
        shell("am force-stop " + TIKTOK_PACKAGE, false);
        randomSleep(2000, 3000);
        
        // 启动TikTok
        console.log("启动TikTok应用...");
        app.launch(TIKTOK_PACKAGE);
        randomSleep(5000, 8000); // 首次启动需要更长时间
        
        // 验证启动成功
        if (currentPackage() === TIKTOK_PACKAGE) {
            console.log("✓ TikTok应用启动成功");
            return true;
        } else {
            console.log("✗ TikTok应用启动失败");
            return false;
        }
        
    } catch (error) {
        console.error("启动TikTok应用失败:", error);
        return false;
    }
}

/**
 * 处理TikTok欢迎界面和引导页面
 */
function handleTikTokWelcome() {
    console.log("=== 处理TikTok欢迎界面 ===");

    try {
        var maxAttempts = 10;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            console.log("处理欢迎界面: " + (attempt + 1) + "/" + maxAttempts);

            if (handleTikTokConsentDialog()) {
                console.log("✓ 处理同意弹窗后等待页面刷新");
                randomSleep(2000, 3500);
                continue;
            }

            // 检查是否已经在主界面
            if (isTikTokMainScreen()) {
                console.log("✓ 已经在TikTok主界面");
                performInitialContentSwipe();
                return true;
            }
            
            // 查找并处理各种可能的按钮
            var handled = false;
            
            // 跳过按钮
            var skipButtons = ["跳过", "Skip", "稍后", "Later"];
            for (var i = 0; i < skipButtons.length; i++) {
                var element = findElementByText(skipButtons[i], 1000);
                if (element) {
                    console.log("找到跳过按钮: " + skipButtons[i]);
                    safeClick(element, "跳过按钮");
                    handled = true;
                    break;
                }
            }
            
            // 继续/下一步按钮
            if (!handled) {
                var continueButtons = ["继续", "Continue", "下一步", "Next", "开始", "Start"];
                for (var j = 0; j < continueButtons.length; j++) {
                    var element = findElementByText(continueButtons[j], 1000);
                    if (element) {
                        console.log("找到继续按钮: " + continueButtons[j]);
                        safeClick(element, "继续按钮");
                        handled = true;
                        break;
                    }
                }
            }
            
            // 登录/注册按钮
            if (!handled) {
                var loginButtons = ["登录", "注册", "Sign up", "Log in", "Get started"];
                for (var k = 0; k < loginButtons.length; k++) {
                    var element = findElementByText(loginButtons[k], 1000);
                    if (element) {
                        console.log("找到登录注册按钮: " + loginButtons[k]);
                        safeClick(element, "登录注册按钮");
                        handled = true;
                        break;
                    }
                }
            }
            
            if (!handled) {
                console.log("未找到可处理的按钮，等待页面变化...");
            }
            
            randomSleep(2000, 4000);
        }
        
        console.log("✓ 欢迎界面处理完成");
        return true;

    } catch (error) {
        console.error("处理TikTok欢迎界面失败:", error);
        return false;
    }
}

/**
 * 处理进入TikTok时可能出现的同意弹窗
 */
function handleTikTokConsentDialog() {
    try {
        var consentTexts = [
            "Agree and continue",
            "同意并继续",
            "同意並繼續",
            "I agree",
            "Continue",
            "同意继续"
        ];

        for (var i = 0; i < consentTexts.length; i++) {
            var consentButton = findExactElementByText(consentTexts[i], 1000);
            if (consentButton) {
                console.log("✓ 检测到TikTok同意弹窗按钮: " + consentTexts[i]);
                if (safeClick(consentButton, "TikTok同意弹窗")) {
                    randomSleep(1500, 2500);
                    performInitialContentSwipe();
                    return true;
                }
            }
        }

        return false;
    } catch (error) {
        console.error("处理TikTok同意弹窗失败:", error);
        return false;
    }
}

/**
 * 在首次进入推荐页时执行一次向上滑动，确保底部导航可点击
 */
function performInitialContentSwipe() {
    try {
        if (initialSwipeCompleted) {
            return true;
        }

        var screenWidth = device.width || 1080;
        var screenHeight = device.height || 1920;

        console.log("执行初次滑动以解锁底部导航...");
        swipe(screenWidth / 2, screenHeight * 0.75, screenWidth / 2, screenHeight * 0.25, 500);
        randomSleep(2000, 3000);

        initialSwipeCompleted = true;
        console.log("✓ 初次滑动完成");
        return true;

    } catch (error) {
        console.error("执行初次滑动失败:", error);
        return false;
    }
}

/**
 * 检查是否在TikTok主界面
 */
function isTikTokMainScreen() {
    var mainIndicators = ["首页", "Home", "For You", "推荐", "关注", "Following"];

    for (var i = 0; i < mainIndicators.length; i++) {
        var element = findElementByText(mainIndicators[i], 1000);
        if (element) {
            console.log("✓ 检测到主界面指示器: " + mainIndicators[i]);
            return true;
        }
    }

    return false;
}

/**
 * 在TikTok中查找Google登录选项
 */
function findGoogleLoginInTikTok() {
    console.log("=== 在TikTok中查找Google登录选项 ===");

    try {
        // 查找Google登录按钮
        var googleKeywords = [
            "Continue with Google", "使用Google登录",
            "Sign in with Google", "Google登录", "通过Google登录"
        ];

        for (var i = 0; i < googleKeywords.length; i++) {
            // var element = text(googleKeywords[i]).clickable(true);
            let element = findExactElementByText(googleKeywords[i],1000);
            if (element) {
                console.log("✓ 找到Google登录选项: " + googleKeywords[i]);
                if (safeClick(element, "Google登录选项")) {
                    console.log("✓ 成功点击Google登录选项");
                    randomSleep(5000, 8000);
                    return true;
                }
            }
        }

        console.log("✗ 未找到Google登录选项");
        return false;

    } catch (error) {
        console.error("查找Google登录选项失败:", error);
        return false;
    }
}

/**
 * 导航到TikTok登录界面
 */
function navigateToTikTokLoginScreen() {
    console.log("导航到TikTok登录界面...");

    try {
        var maxAttempts = 5;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            console.log("尝试导航到登录界面: " + (attempt + 1) + "/" + maxAttempts);

            handleTikTokConsentDialog();

            // 检查是否已经在登录界面
            if (isTikTokLoginScreen()) {
                console.log("✓ 已经在登录界面");
                return true;
            }

            // 查找登录相关按钮
            var loginKeywords = [
                "主页","登录", "注册", "Sign up", "Log in", "Sign in",
                "我", "Profile", "Me", "账号", "Account"
            ];

            var found = false;
            for (var i = 0; i < loginKeywords.length; i++) {
                var element = findElementByText(loginKeywords[i], 2000);
                if (element) {
                    console.log("找到导航按钮: " + loginKeywords[i]);
                    safeClick(element, "导航按钮");
                    found = true;
                    break;
                }
            }

            if (!found) {
                // 尝试点击底部导航栏的最后一个按钮（通常是"我"）
                console.log("尝试点击底部导航栏...");
                performInitialContentSwipe();
                var screenWidth = device.width || 1080;
                var screenHeight = device.height || 1920;

                // 点击底部右侧区域
                click(screenWidth * 0.8, screenHeight * 0.95);
                randomSleep(2000, 3000);
            }

            randomSleep(2000, 4000);
        }

        console.log("✗ 无法导航到登录界面");
        return false;

    } catch (error) {
        console.error("导航到登录界面失败:", error);
        return false;
    }
}

/**
 * 检查是否在TikTok登录界面
 */
function isTikTokLoginScreen() {
    var loginIndicators = [
        "登录", "注册", "Sign up", "Log in", "Sign in",
        "手机号", "邮箱", "Phone", "Email", "Google", "Facebook"
    ];

    for (var i = 0; i < loginIndicators.length; i++) {
        var element = findElementByText(loginIndicators[i], 1000);
        if (element) {
            console.log("✓ 检测到登录界面指示器: " + loginIndicators[i]);
            return true;
        }
    }

    return false;
}

/**
 * 处理TikTok应用内的Google OAuth流程
 */
function handleGoogleOAuthInTikTok() {
    console.log("=== 处理TikTok内的Google OAuth流程 ===");

    try {
        // 等待Google登录页面加载
        console.log("等待Google登录页面加载...");
        randomSleep(5000, 8000);

        // 检查是否需要选择Google账户
        if (handleGoogleAccountSelection()) {
            console.log("✓ Google账户选择完成");
        }

        // 输入Gmail凭据
        if (!inputGmailCredentialsInWebView()) {
            console.error("在WebView中输入Gmail凭据失败");
            return false;
        }

        // 处理OAuth授权
        if (!handleOAuthAuthorization()) {
            console.error("处理OAuth授权失败");
            return false;
        }

        console.log("✓ Google OAuth流程完成");
        return true;

    } catch (error) {
        console.error("处理Google OAuth流程失败:", error);
        return false;
    }
}

/**
 * 处理Google账户选择
 */
function handleGoogleAccountSelection() {
    console.log("处理Google账户选择...");

    try {
        // 查找Gmail账户
        var emailElement = findElementByText(gmailEmail, 3000);
        if (emailElement) {
            console.log("✓ 找到目标Gmail账户: " + gmailEmail);
            return safeClick(emailElement, "Gmail账户");
        }

        // 查找任何Gmail账户
        var accountElements = className("android.widget.TextView").find();
        for (var i = 0; i < accountElements.length; i++) {
            var text = accountElements[i].text() || "";
            if (text.includes("@gmail.com")) {
                console.log("✓ 找到Gmail账户: " + text);
                return safeClick(accountElements[i], "Gmail账户");
            }
        }

        console.log("✓ 未找到需要选择的账户，继续流程");
        return true;

    } catch (error) {
        console.error("处理Google账户选择失败:", error);
        return false;
    }
}

/**
 * 在WebView中输入Gmail凭据
 */
function inputGmailCredentialsInWebView() {
    console.log("在WebView中输入Gmail凭据...");

    try {
        // 等待页面加载
        randomSleep(3000, 5000);

        // 输入邮箱
        if (!inputEmailInWebView()) {
            console.error("在WebView中输入邮箱失败");
            return false;
        }

        // 输入密码
        if (!inputPasswordInWebView()) {
            console.error("在WebView中输入密码失败");
            return false;
        }

        console.log("✓ Gmail凭据输入完成");
        return true;

    } catch (error) {
        console.error("在WebView中输入Gmail凭据失败:", error);
        return false;
    }
}

/**
 * 在WebView中输入邮箱
 */
function inputEmailInWebView() {
    console.log("在WebView中输入邮箱...");

    try {
        var maxAttempts = 5;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            console.log("尝试输入邮箱: " + (attempt + 1) + "/" + maxAttempts);

            // 查找邮箱输入框
            var emailInput = null;
            // 方法2: 查找第一个可编辑输入框
            if (!emailInput) {
                emailInput = className("android.widget.EditText").findOne(2000);
                if (emailInput) {
                    console.log("✓ 找到第一个输入框");
                }
            }

            if (emailInput) {
                if (safeInput(emailInput, gmailEmail, "邮箱输入框")) {
                    // 点击下一步
                    console.log("查找下一步");
                    var nextButtons = ["下一步","NEXT", "Next", "继续", "Continue"];
                    var nextClicked = false;

                    for (var j = 0; j < nextButtons.length; j++) {
                        var nextButton = findElementByText(nextButtons[j], 2000);
                        if (nextButton) {
                            console.log("✓ 找到下一步按钮: " + nextButtons[j]);
                            if (safeClick(nextButton, "下一步按钮")) {
                                nextClicked = true;
                                break;
                            }
                        }
                    }

                    if (nextClicked) {
                        randomSleep(3000, 5000);
                        console.log("✓ 邮箱输入完成");
                        return true;
                    }
                }
            }

            randomSleep(2000, 3000);
        }

        console.log("✗ 在WebView中输入邮箱失败");
        return false;

    } catch (error) {
        console.error("在WebView中输入邮箱失败:", error);
        return false;
    }
}

/**
 * 在WebView中输入密码
 */
function inputPasswordInWebView() {
    console.log("在WebView中输入密码...");

    try {
        var maxAttempts = 5;

        for (var attempt = 0; attempt < maxAttempts; attempt++) {
            console.log("尝试输入密码: " + (attempt + 1) + "/" + maxAttempts);

            // 查找密码输入框
            var passwordInput = null;

            // 方法1: 查找密码类型输入框
            var inputs = className("android.widget.EditText").find();
            for (var i = 0; i < inputs.length; i++) {
                var input = inputs[i];
                if (input.password()) {
                    passwordInput = input;
                    console.log("✓ 找到密码类型输入框");
                    break;
                }
            }

            // 方法2: 通过hint查找
            if (!passwordInput) {
                for (var j = 0; j < inputs.length; j++) {
                    var input = inputs[j];
                    var hint = input.hint() || "";

                    if (hint.toLowerCase().includes("password") ||
                        hint.includes("密码")) {
                        passwordInput = input;
                        console.log("✓ 通过hint找到密码输入框");
                        break;
                    }
                }
            }

            // 方法3: 查找任何可编辑输入框
            if (!passwordInput) {
                passwordInput = className("android.widget.EditText").findOne(2000);
                if (passwordInput) {
                    console.log("✓ 找到输入框");
                }
            }

            if (passwordInput) {
                if (safeInput(passwordInput, gmailPassword, "密码输入框")) {
                    // 点击登录
                    var loginButtons = ["登录", "下一步", "Next","NEXT", "Sign in", "继续", "Continue"];
                    var loginClicked = false;

                    for (var k = 0; k < loginButtons.length; k++) {
                        var loginButton = findElementByText(loginButtons[k], 2000);
                        if (loginButton) {
                            console.log("✓ 找到登录按钮: " + loginButtons[k]);
                            if (safeClick(loginButton, "登录按钮")) {
                                loginClicked = true;
                                break;
                            }
                        }
                    }

                    if (loginClicked) {
                        randomSleep(3000, 5000);
                        console.log("✓ 密码输入完成");
                        return true;
                    }
                }
            }

            randomSleep(2000, 3000);
        }

        console.log("✗ 在WebView中输入密码失败");
        return false;

    } catch (error) {
        console.error("在WebView中输入密码失败:", error);
        return false;
    }
}

/**
 * 处理OAuth授权
 */
function handleOAuthAuthorization() {
    console.log("处理OAuth授权...");

    try {
        var maxSteps = 8;

        for (var step = 0; step < maxSteps; step++) {
            console.log("处理授权步骤: " + (step + 1) + "/" + maxSteps);

            // 检查是否已经回到TikTok
            if (currentPackage() === "com.zhiliaoapp.musically") {
                console.log("✓ 已经回到TikTok应用");
                return true;
            }

            var handled = false;

            // 处理同意/允许按钮
            var agreeButtons = ["同意", "允许", "Accept", "Allow", "Agree", "继续", "Continue"];
            for (var i = 0; i < agreeButtons.length; i++) {
                var element = findElementByText(agreeButtons[i], 1000);
                if (element) {
                    console.log("✓ 找到同意按钮: " + agreeButtons[i]);
                    if (safeClick(element, "同意按钮")) {
                        handled = true;
                        break;
                    }
                }
            }

            // 处理确认按钮
            if (!handled) {
                var confirmButtons = ["确认", "确定", "OK", "Done", "完成"];
                for (var j = 0; j < confirmButtons.length; j++) {
                    var element = findElementByText(confirmButtons[j], 1000);
                    if (element) {
                        console.log("✓ 找到确认按钮: " + confirmButtons[j]);
                        if (safeClick(element, "确认按钮")) {
                            handled = true;
                            break;
                        }
                    }
                }
            }

            if (!handled) {
                console.log("未找到需要处理的按钮，等待页面变化...");
            }

            randomSleep(3000, 5000);
        }

        console.log("✓ OAuth授权处理完成");
        return true;

    } catch (error) {
        console.error("处理OAuth授权失败:", error);
        return false;
    }
}

/**
 * 完成TikTok注册流程
 */
function completeTikTokRegistration() {
    console.log("=== 完成TikTok注册流程 ===");

    try {
        var maxSteps = 10;

        for (var step = 0; step < maxSteps; step++) {
            console.log("完成注册步骤: " + (step + 1) + "/" + maxSteps);

            // 检查是否已经在主界面
            if (isTikTokMainScreen()) {
                console.log("✓ 已经进入TikTok主界面");
                return true;
            }

            var handled = false;

            // 处理用户协议
            var agreeButtons = ["同意", "接受", "Agree", "Accept", "我同意"];
            for (var i = 0; i < agreeButtons.length; i++) {
                var element = findElementByText(agreeButtons[i], 1000);
                if (element) {
                    console.log("✓ 找到用户协议同意按钮: " + agreeButtons[i]);
                    if (safeClick(element, "用户协议同意")) {
                        handled = true;
                        break;
                    }
                }
            }

            // 跳过个人信息设置
            if (!handled) {
                var skipButtons = ["跳过", "稍后", "Skip", "Later", "不，谢谢"];
                for (var j = 0; j < skipButtons.length; j++) {
                    var element = findElementByText(skipButtons[j], 1000);
                    if (element) {
                        console.log("✓ 找到跳过按钮: " + skipButtons[j]);
                        if (safeClick(element, "跳过按钮")) {
                            handled = true;
                            break;
                        }
                    }
                }
            }

            // 处理完成按钮
            if (!handled) {
                var doneButtons = ["完成", "开始", "Done", "Start", "进入"];
                for (var k = 0; k < doneButtons.length; k++) {
                    var element = findElementByText(doneButtons[k], 1000);
                    if (element) {
                        console.log("✓ 找到完成按钮: " + doneButtons[k]);
                        if (safeClick(element, "完成按钮")) {
                            handled = true;
                            break;
                        }
                    }
                }
            }

            if (!handled) {
                console.log("未找到需要处理的按钮，等待页面变化...");
            }

            randomSleep(3000, 5000);
        }

        console.log("✓ TikTok注册流程完成");
        return true;

    } catch (error) {
        console.error("完成TikTok注册流程失败:", error);
        return false;
    }
}

/**
 * 验证TikTok登录成功
 */
function verifyTikTokLogin() {
    console.log("=== 验证TikTok登录成功 ===");

    try {
        // 等待页面稳定
        randomSleep(5000, 8000);

        // 检查是否在TikTok主界面
        if (currentPackage() === "com.zhiliaoapp.musically" && isTikTokMainScreen()) {
            console.log("✓ TikTok登录验证成功");
            return true;
        }

        console.log("✗ TikTok登录验证失败");
        return false;

    } catch (error) {
        console.error("验证TikTok登录失败:", error);
        return false;
    }
}

// ==================== 主函数 ====================

/**
 * 主要的TikTok Gmail注册函数
 */
function startTikTokGmailRegistration() {
    console.log("=== TikTok Gmail注册脚本启动（全新设计版本）===");

    try {
        // 步骤1: 清空TikTok应用数据
        console.log("\n--- 步骤1: 清空TikTok应用数据 ---");
        if (!clearTikTokData()) {
            console.error("清空TikTok数据失败");
            reportResult(false, "清空TikTok数据失败");
            return false;
        }

        // 步骤2: 启动全新TikTok应用
        console.log("\n--- 步骤2: 启动全新TikTok应用 ---");
        if (!launchTikTokFresh()) {
            console.error("启动TikTok应用失败");
            reportResult(false, "启动TikTok应用失败");
            return false;
        }

        // // 步骤3: 处理TikTok欢迎界面
        // console.log("\n--- 步骤3: 处理TikTok欢迎界面 ---");
        // if (!handleTikTokWelcome()) {
        //     console.error("处理TikTok欢迎界面失败");
        //     reportResult(false, "处理TikTok欢迎界面失败");
        //     return false;
        // }

        // 步骤4: 在TikTok中查找Google登录选项
        console.log("\n--- 步骤4: 查找Google登录选项 ---");
        if (!findGoogleLoginInTikTok()) {
            console.error("在TikTok中查找Google登录选项失败");
            reportResult(false, "查找Google登录选项失败");
            return false;
        }

        // 步骤5: 处理Google OAuth流程
        console.log("\n--- 步骤5: 处理Google OAuth流程 ---");
        if (!handleGoogleOAuthInTikTok()) {
            console.error("处理Google OAuth流程失败");
            reportResult(false, "Google OAuth流程失败");
            return false;
        }

        // 步骤6: 完成TikTok注册流程
        console.log("\n--- 步骤6: 完成TikTok注册流程 ---");
        if (!completeTikTokRegistration()) {
            console.error("完成TikTok注册流程失败");
            reportResult(false, "TikTok注册流程失败");
            return false;
        }

        // 步骤7: 验证登录成功
        console.log("\n--- 步骤7: 验证登录成功 ---");
        if (!verifyTikTokLogin()) {
            console.error("验证TikTok登录失败");
            reportResult(false, "TikTok登录验证失败");
            return false;
        }

        console.log("\n=== TikTok Gmail注册完成 ===");
        reportResult(true, "TikTok Gmail注册成功");
        return true;

    } catch (error) {
        console.error("TikTok Gmail注册过程中发生错误:", error);
        reportResult(false, "TikTok Gmail注册过程中发生错误: " + error.message);
        return false;
    }
}

/**
 * 主函数入口
 */
function main() {
    console.show();
    console.log("=== TikTok Gmail注册脚本 - 全新设计版本 ===");
    console.log("采用应用内登录流程，避开系统设置限制");

    // 检查无障碍服务
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        auto();
        return false;
    }

    try {
        // 加载Gmail配置
        if (!loadGmailConfig()) {
            console.error("Gmail配置加载失败");
            return false;
        }

        // 开始注册流程
        var success = startTikTokGmailRegistration();

        if (success) {
            console.log("\n=== 任务完成 ===");
            console.log("TikTok Gmail注册成功！");
            return true;
        } else {
            console.log("\n=== 任务失败 ===");
            console.log("TikTok Gmail注册失败，请查看日志");
            return false;
        }

    } catch (error) {
        console.error("主函数执行失败:", error);
        reportResult(false, "主函数执行失败: " + error.message);
        return false;
    }
}

/**
 * 测试函数 - 仅测试特定步骤
 */
function testSpecificStep() {
    console.show();
    console.log("=== 测试特定步骤 ===");

    // 检查无障碍服务
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        auto();
        return false;
    }

    try {
        // 加载配置
        loadGmailConfig();

        // 测试findElementByText函数是否正常工作
        console.log("测试findElementByText函数...");
        var testElement = findElementByText("设置", 2000);
        if (testElement) {
            console.log("✓ findElementByText函数工作正常");
        } else {
            console.log("✓ findElementByText函数正常（未找到'设置'元素是正常的）");
        }

        // 这里可以测试特定的步骤
        // 例如：测试清空数据
        // clearTikTokData();

        // 例如：测试启动应用
        // launchTikTokFresh();

        // 例如：测试查找Google登录
        // findGoogleLoginInTikTok();

        console.log("测试完成");
        return true;

    } catch (error) {
        console.error("测试失败:", error);
        return false;
    }
}

// ==================== 脚本执行 ====================

// 自动执行主函数
main();

// 如果需要测试特定步骤，可以注释掉上面的main()，取消注释下面的testSpecificStep()
// testSpecificStep();
