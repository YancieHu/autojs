/**
 * TikTok养号脚本 - 纯动态配置版本
 * 支持从engines.myEngine().execArgv.template_params动态获取配置参数
 * 无本地配置文件依赖，完全基于外部传入的参数
 *
 * 📖 详细API文档请参考: tiktok/API_DOCUMENTATION.md
 *
 * 🔧 核心函数：
 * - loadDynamicConfig(): 从execArgv获取配置并转换为JavaScript对象
 * - reportConfigResult(): 向客户端上报执行结果
 *
 * 🌐 全局变量：
 * - globalTaskId: 任务ID，用于结果上报
 * - globalConfig: 转换后的配置对象
 */

// ==================== 动态配置加载 ====================

/**
 * 从客户端获取配置参数
 * 从 engines.myEngine().execArgv.template_params 获取JSONObject并转换为JavaScript对象
 */
function loadDynamicConfig() {
    try {
        var config = null;

        // 方式1: 从engines.myEngine().execArgv获取
        try {
            if (typeof engines !== 'undefined' && engines.myEngine && engines.myEngine().execArgv) {
                var execArgv = engines.myEngine().execArgv;

                // 获取全局taskId
                if (execArgv && execArgv.taskId) {
                    globalTaskId = execArgv.taskId;
                }

                if (execArgv && execArgv.template_params) {
                    config = execArgv.template_params;
                    console.log("✓ 从execArgv加载配置成功");
                    console.log("======");
                    console.log("config:", config);

                    // 将JSONObject转换为普通对象并保存到全局变量
                    globalConfig = {
                        search_keyword: config.getString("search_keyword") || "",
                        browse_num: config.getInt("browse_num"),
                        browse_interval: config.getInt("browse_interval"),
                        like_percent: config.getInt("like_percent"),
                        collect_percent: config.getInt("collect_percent"),
                        comment_percent: config.getInt("comment_percent"),
                        comment_type: config.getString("comment_type") || "manual",
                        comment_word_limit: config.getInt("comment_word_limit") || 100,
                        comment_content: []
                    };

                    // 处理评论内容数组
                    if (config.has("comment_content")) {
                        var commentArray = config.getJSONArray("comment_content");
                        for (var i = 0; i < commentArray.length(); i++) {
                            globalConfig.comment_content.push(commentArray.getString(i));
                        }
                    }

                    console.log("✓ 全局配置设置成功:", globalConfig);
                    reportConfigResult(true, "加载配置成功");
                    return globalConfig;
                } else {
                    console.log("✗ execArgv中没有template_params");
                    reportConfigResult(false, "execArgv中没有template_params");
                    return null;
                }
            } else {
                console.log("✗ engines或execArgv不可用");
                reportConfigResult(false, "engines或execArgv不可用");
                return null;
            }
        } catch (e) {
            console.log("从execArgv读取配置失败:", e.message);
            reportConfigResult(false, "从execArgv读取配置失败: " + e.message);
            return null;
        }

    } catch (error) {
        console.error("加载配置失败:", error);
        reportConfigResult(false, "加载配置失败: " + error.message);
        return null;
    }
}

// 全局变量
var globalTaskId = "10001";
var globalConfig = null;

/**
 * 向客户端上报执行结果
 * @param {boolean} isSuccess - 是否成功
 * @param {string} message - 结果信息
 * 客户端会将上报的数据包装在data字段中
 */
function reportConfigResult(isSuccess, message) {
    try {
        if (globalTaskId && typeof scriptUtils !== 'undefined' && scriptUtils.sendTaskResult) {
            var resultMap = {
                "status": isSuccess ? "success" : "failed",
                "result": isSuccess ? "脚本运行成功: " + message : "脚本运行失败: " + message,
                "task_id":globalTaskId
            };

            console.log("上报配置结果, taskId:", globalTaskId);
            console.log("上报状态:", isSuccess ? "成功" : "失败");
            console.log("上报内容:", resultMap);

            scriptUtils.sendTaskResult(resultMap);
        } else {
            console.log("无法上报结果 - globalTaskId:", globalTaskId, ", scriptUtils:", typeof scriptUtils !== 'undefined');
        }
    } catch (e) {
        console.error("上报配置结果时出错:", e.message);
    }
}



/**
 * 构建养号配置 - 使用全局配置
 * @returns {Object} 养号配置对象
 */
function buildNurturingConfig() {
    console.log("=== buildNurturingConfig 开始 ===");

    // 直接使用全局配置
    if (!globalConfig) {
        console.log("✗ 全局配置为空");
        reportConfigResult(false, "全局配置为空");
        return null;
    }

    console.log("使用全局配置:", globalConfig);

    var config = {
        // 基础配置
        searchKeyword: globalConfig.search_keyword || "",
        browseNum: globalConfig.browse_num,
        browseInterval: globalConfig.browse_interval,

        // 操作概率配置
        likePercent: globalConfig.like_percent,
        collectPercent: globalConfig.collect_percent,
        commentPercent: globalConfig.comment_percent,

        // 评论配置
        enableComments: false,
        commentContent: [],
        commentType: globalConfig.comment_type || "manual",
        commentWordLimit: globalConfig.comment_word_limit || 100,

        // 表情配置
        insertEmojisInComments: true,
        emojiPool: ["😊", "👍", "❤️", "🔥", "💯", "👏", "🎉", "✨"]
    };

    // 处理评论配置
    if (globalConfig.comment_content && globalConfig.comment_content.length > 0) {
        config.enableComments = true;
        config.commentContent = globalConfig.comment_content;
        console.log("✓ 启用评论功能，使用全局配置中的评论内容");
    } else {
        config.enableComments = false;
        console.log("✓ 评论功能已禁用（全局配置中无评论内容）");
    }

    console.log("✓ 配置构建成功:", config);
    return config;
}

// ==================== 统一养号类 ====================

/**
 * 统一的TikTok养号类
 * 支持普通养号和标签养号两种模式
 */
function TikTokNurturing() {
    console.log("TikTokNurturing构造函数 - 使用全局配置");

    // 使用全局配置构建
    this.config = buildNurturingConfig();

    console.log("TikTokNurturing构造函数 - 构建后的this.config:", this.config);

    // 通用配置
    this.generalConfig = {
        operationInterval: { min: 1000, max: 3000 },
        swipeConfig: {
            durationMin: 300,
            durationMax: 700,
            minSwipeDistancePercent: 0.3
        },
        maxRetryAttempts: 3,
        logLevel: 'INFO'
    };

    // 统计数据
    this.statistics = {
        videoCount: 0,
        likeCount: 0,
        followCount: 0,
        commentCount: 0,
        collectCount: 0
    };

    // 判断养号模式
    this.isTagMode = !!(this.config.searchKeyword && this.config.searchKeyword.trim());

    console.log("=== 养号配置初始化 ===");
    console.log("养号模式: " + (this.isTagMode ? "标签养号" : "普通养号"));
    if (this.isTagMode) {
        console.log("搜索关键词: " + this.config.searchKeyword);
    }
    console.log("浏览数量: " + this.config.browseNum);
    console.log("浏览间隔: " + this.config.browseInterval + "秒");
    console.log("点赞概率: " + this.config.likePercent + "%");
    console.log("收藏概率: " + this.config.collectPercent + "%");
    console.log("评论概率: " + this.config.commentPercent + "%");
    console.log("评论功能: " + (this.config.enableComments ? "启用" : "禁用"));
    if (this.config.enableComments) {
        console.log("评论内容数量: " + this.config.commentContent.length);
    }
}

/**
 * 开始养号
 */
TikTokNurturing.prototype.start = function() {
    console.log("=== 开始TikTok养号 ===");
    console.log("模式: " + (this.isTagMode ? "标签养号" : "普通养号"));

    // 启动TikTok
    if (!this.launchTikTok()) {
        console.error("启动TikTok失败");
        return false;
    }

    // 等待应用加载
    this.randomSleep(3000, 5000);

    try {
        // 如果是标签模式，先执行搜索
        if (this.isTagMode) {
            if (!this.performSearch(this.config.searchKeyword)) {
                console.error("搜索关键词失败: " + this.config.searchKeyword);
                return false;
            }
            console.log("✓ 搜索完成，开始浏览标签内容");
            this.randomSleep(2000, 4000);
        }

        // 开始浏览视频
        return this.browseVideos();

    } catch (error) {
        console.error("养号过程中发生错误:", error);
        return false;
    }
};

/**
 * 浏览视频
 */
TikTokNurturing.prototype.browseVideos = function() {
    console.log("开始浏览视频，目标数量: " + this.config.browseNum);

    var processedCount = 0;
    var maxVideos = this.config.browseNum;

    while (processedCount < maxVideos) {
        // 检查应用是否还在前台
        if (!this.isTikTokInForeground()) {
            console.warn("TikTok不在前台，重新启动");
            if (!this.launchTikTok()) {
                console.error("重新启动TikTok失败");
                break;
            }
            this.randomSleep(3000, 5000);

            // 如果是标签模式，需要重新搜索
            if (this.isTagMode) {
                if (!this.performSearch(this.config.searchKeyword)) {
                    console.warn("重新搜索失败");
                    break;
                }
                this.randomSleep(2000, 4000);
            }
        }

        processedCount++;
        console.log("\n--- 处理第 " + processedCount + "/" + maxVideos + " 个视频 ---");

        // 处理当前视频
        this.processCurrentVideo();

        // 如果不是最后一个视频，滑动到下一个
        if (processedCount < maxVideos) {
            this.swipeToNextVideo();
            // 滑动后短暂等待，主要的浏览间隔已在processCurrentVideo中处理
            this.randomSleep(1000, 2000);
        }
    }

    this.printStatistics();
    console.log("=== 养号完成 ===");
    return true;
};

/**
 * 处理当前视频
 */
TikTokNurturing.prototype.processCurrentVideo = function() {
    this.statistics.videoCount++;

    // 观看视频（根据配置的浏览间隔动态设置观看时长）
    var baseInterval = this.config.browseInterval || 4; // 默认4秒
    var minWatchTime = Math.max(2, baseInterval - 1); // 最少观看时间
    var maxWatchTime = baseInterval + 2; // 最多观看时间
    var watchTime = this.getRandomInt(minWatchTime, maxWatchTime) * 1000;

    console.log("观看视频 " + (watchTime / 1000) + " 秒 (基于浏览间隔: " + baseInterval + "秒)");
    sleep(watchTime);

    // 执行随机操作
    this.performRandomActions();
};

/**
 * 执行随机操作（点赞、收藏、评论）
 */
TikTokNurturing.prototype.performRandomActions = function() {
    // 点赞操作
    if (this.shouldExecuteByProbability(this.config.likePercent)) {
        if (this.performLike()) {
            this.statistics.likeCount++;
            console.log("✓ 点赞成功");
        } else {
            console.log("✗ 点赞失败");
        }
        this.randomSleep(500, 1500);
    }

    // 收藏操作
    if (this.shouldExecuteByProbability(this.config.collectPercent)) {
        if (this.performCollect()) {
            this.statistics.collectCount++;
            console.log("✓ 收藏成功");
        } else {
            console.log("✗ 收藏失败");
        }
        this.randomSleep(500, 1500);
    }

    // 评论操作
    if (this.config.enableComments && this.shouldExecuteByProbability(this.config.commentPercent)) {
        var commentText = this.getRandomArrayElement(this.config.commentContent);

        // 表情插入功能
        if (this.config.insertEmojisInComments && Math.random() < 0.5) {
            var emoji = this.getRandomArrayElement(this.config.emojiPool);
            commentText = commentText + " " + emoji;
        }

        if (commentText && this.performComment(commentText)) {
            this.statistics.commentCount++;
            console.log("✓ 评论成功: " + commentText);
        } else {
            console.log("✗ 评论失败");
        }
        this.randomSleep(1000, 2000);
    }
};

// ==================== 工具函数和操作方法 ====================

/**
 * 生成指定范围内的随机整数
 */
TikTokNurturing.prototype.getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 根据概率判断是否执行某个操作
 */
TikTokNurturing.prototype.shouldExecuteByProbability = function(probability) {
    return Math.random() * 100 < probability;
};

/**
 * 从数组中随机选择一个元素
 */
TikTokNurturing.prototype.getRandomArrayElement = function(array) {
    if (!array || array.length === 0) {
        return null;
    }
    return array[this.getRandomInt(0, array.length - 1)];
};

/**
 * 随机等待指定时间范围
 */
TikTokNurturing.prototype.randomSleep = function(minMs, maxMs) {
    var sleepTime = this.getRandomInt(minMs, maxMs);
    console.log("随机等待 " + sleepTime + "ms");
    sleep(sleepTime);
};

/**
 * 启动TikTok应用
 */
TikTokNurturing.prototype.launchTikTok = function() {
    var TIKTOK_PACKAGE = "com.zhiliaoapp.musically";
    var TIKTOK_APP_NAME = "TikTok";

    console.log("准备启动TikTok应用...");

    // 先检查应用是否正在运行，如果在运行就关闭
    try {
        if (this.isTikTokInForeground()) {
            console.log("TikTok正在运行，先关闭应用");
            home();
            sleep(1000);
            shell("am force-stop " + TIKTOK_PACKAGE, true);
            console.log("✓ TikTok应用已关闭");
            sleep(2000);
        }
    } catch (error) {
        console.log("关闭应用时出错，继续启动: " + error.message);
    }

    // 启动应用
    console.log("启动TikTok应用...");
    try {
        app.launch(TIKTOK_PACKAGE);
        sleep(3000);

        if (this.isTikTokInForeground()) {
            console.log("✓ TikTok启动成功");
            sleep(3000); // 等待应用完全加载
            return true;
        } else {
            console.log("✗ TikTok启动失败");
            return false;
        }
    } catch (error) {
        console.error("启动TikTok时发生错误:", error);
        return false;
    }
};

/**
 * 检查TikTok是否在前台
 */
TikTokNurturing.prototype.isTikTokInForeground = function() {
    try {
        return currentPackage() === "com.zhiliaoapp.musically";
    } catch (error) {
        console.error("检查应用前台状态失败:", error);
        return false;
    }
};

/**
 * 执行搜索操作
 */
TikTokNurturing.prototype.performSearch = function(keyword) {
    try {
        console.log("开始搜索关键词: " + keyword);

        // 查找搜索按钮
        var searchButton = this.findSearchButton();
        if (!searchButton) {
            console.log("✗ 搜索按钮未找到");
            return false;
        }

        if (!this.safeClick(searchButton, "搜索按钮")) {
            console.log("✗ 搜索按钮点击失败");
            return false;
        }

        // 等待搜索界面加载
        console.log("等待搜索界面加载...");
        sleep(2000);

        // 查找搜索输入框
        var searchInput = this.findSearchInput();
        if (!searchInput) {
            console.log("✗ 搜索输入框未找到");
            return false;
        }

        // 输入搜索关键词
        console.log("输入搜索关键词: " + keyword);
        if (!this.safeInput(searchInput, keyword, "搜索输入框")) {
            console.log("✗ 搜索关键词输入失败");
            return false;
        }

        // 执行搜索
        sleep(1000);
        key(66); // 按回车键执行搜索

        // 等待搜索结果加载
        this.randomSleep(2000, 4000);
        console.log("✓ 搜索完成");
        return true;

    } catch (error) {
        console.error("搜索操作失败:", error);
        return false;
    }
};

/**
 * 安全点击元素
 */
TikTokNurturing.prototype.safeClick = function(element, description) {
    description = description || "元素";
    try {
        if (element) {
            console.log("正在点击: " + description);
            element.click();
            this.randomSleep(500, 1500);
            return true;
        } else {
            console.warn(description + " 元素不存在");
            return false;
        }
    } catch (error) {
        console.error("点击 " + description + " 时发生错误:", error);
        return false;
    }
};

/**
 * 安全输入文本
 */
TikTokNurturing.prototype.safeInput = function(element, text, description) {
    description = description || "输入框";
    try {
        if (element && element.editable()) {
            console.log("正在输入到 " + description + ": " + text);
            element.setText(text);
            this.randomSleep(1000, 2000);
            return true;
        } else {
            console.warn(description + " 不可编辑或不存在");
            return false;
        }
    } catch (error) {
        console.error("输入到 " + description + " 时发生错误:", error);
        return false;
    }
};

/**
 * 执行点赞操作
 */
TikTokNurturing.prototype.performLike = function() {
    var likeButton = this.findLikeButton();
    if (likeButton) {
        return this.safeClick(likeButton, "点赞按钮");
    }
    return false;
};

/**
 * 执行收藏操作
 */
TikTokNurturing.prototype.performCollect = function() {
    var collectButton = this.findCollectButton();
    if (collectButton) {
        return this.safeClick(collectButton, "收藏按钮");
    }
    return false;
};

/**
 * 执行评论操作
 */
TikTokNurturing.prototype.performComment = function(commentText) {
    try {
        // 点击评论按钮
        var commentButton = this.findCommentButton();
        if (!commentButton) {
            console.log("评论按钮查找失败");
            return false;
        }

        if (!this.safeClick(commentButton, "评论按钮")) {
            console.log("评论按钮点击失败");
            return false;
        }

        // 等待评论输入框出现
        console.log("等待评论输入框出现...");
        sleep(2000);

        var commentInput = this.findCommentInput();
        if (!commentInput) {
            console.log("评论输入框未出现");
            return false;
        }

        // 输入评论内容
        if (!this.safeInput(commentInput, commentText, "评论输入框")) {
            console.log("评论内容输入失败");
            return false;
        }

        // 查找并点击发送按钮
        console.log("查找发送按钮...");
        var sendButton = this.findSendButton();
        if (sendButton) {
            console.log("找到发送按钮，准备点击");
            return this.safeClick(sendButton, "发送按钮");
        } else {
            console.warn("未找到发送按钮");
            return false;
        }

    } catch (error) {
        console.error("评论操作失败:", error);
        return false;
    }
};

/**
 * 滑动到下一个视频
 */
TikTokNurturing.prototype.swipeToNextVideo = function() {
    try {
        // 获取屏幕尺寸
        var screenWidth = device.width || 1080;
        var screenHeight = device.height || 1920;

        // 定义滑动区域（避免触碰到边缘按钮）
        var centerX = screenWidth / 2;
        var startY = Math.floor(screenHeight * 0.7);
        var endY = Math.floor(screenHeight * 0.3);
        var duration = this.getRandomInt(300, 700);

        console.log("滑动到下一个视频: (" + centerX + ", " + startY + ") -> (" + centerX + ", " + endY + ")");
        swipe(centerX, startY, centerX, endY, duration);
        this.randomSleep(1000, 2000);

    } catch (error) {
        console.error("滑动操作失败:", error);
    }
};

/**
 * 检测系统语言是否为中文
 */
TikTokNurturing.prototype.isChineseLanguage = function() {
    try {
        var languageTag = autojs.getLanguageTag();
        return languageTag.startsWith("zh");
    } catch (error) {
        console.log("获取语言失败，默认使用中文: " + error.message);
        return true; // 默认中文
    }
};

/**
 * 查找搜索按钮
 */
TikTokNurturing.prototype.findSearchButton = function() {
    var keyword = this.isChineseLanguage() ? "搜索" : "Search";
    console.log("查找搜索按钮，使用关键词: " + keyword);

    var element = descContains(keyword).findOne(3000);
    if (element) {
        console.log("✓ 找到搜索按钮");
        return element;
    } else {
        console.log("✗ 未找到搜索按钮");
        return null;
    }
};

/**
 * 查找搜索输入框
 */
TikTokNurturing.prototype.findSearchInput = function() {
    console.log("查找搜索输入框，使用ID: fpa");

    try {
        var element = id("fpa").findOne(1000);
        if (element) {
            console.log("✓ 通过ID找到搜索输入框");
            return element;
        } else {
            // 备用方案：通过类名查找
            element = className("android.widget.EditText").findOne(1000);
            if (element) {
                console.log("✓ 通过EditText类名找到搜索输入框");
                return element;
            }
        }
    } catch (error) {
        console.log("✗ 搜索输入框查找失败: " + error.message);
    }

    console.warn("未找到搜索输入框");
    return null;
};

/**
 * 查找点赞按钮
 */
TikTokNurturing.prototype.findLikeButton = function() {
    var keyword = this.isChineseLanguage() ? "点赞" : "Like";
    console.log("查找点赞按钮，使用关键词: " + keyword);

    var element = descContains(keyword).findOne(1000);
    if (element) {
        console.log("✓ 找到点赞按钮");
        return element;
    } else {
        console.log("✗ 未找到点赞按钮");
        return null;
    }
};

/**
 * 查找收藏按钮
 */
TikTokNurturing.prototype.findCollectButton = function() {
    var keyword = this.isChineseLanguage() ? "收藏" : "Bookmark";
    console.log("查找收藏按钮，使用关键词: " + keyword);

    var element = descContains(keyword).findOne(1000);
    if (element) {
        console.log("✓ 找到收藏按钮");
        return element;
    } else {
        console.log("✗ 未找到收藏按钮");
        return null;
    }
};

/**
 * 查找评论按钮
 */
TikTokNurturing.prototype.findCommentButton = function() {
    var keyword = this.isChineseLanguage() ? "评论" : "Comment";
    console.log("查找评论按钮，使用关键词: " + keyword);

    var element = descContains(keyword).findOne(1000);
    if (element) {
        console.log("✓ 找到评论按钮");
        return element;
    } else {
        console.log("✗ 未找到评论按钮");
        return null;
    }
};

/**
 * 查找评论输入框
 */
TikTokNurturing.prototype.findCommentInput = function() {
    var keyword = this.isChineseLanguage() ? "添加评论" : "Add comment";
    console.log("查找评论输入框，使用关键词: " + keyword);

    // 首先尝试使用关键词查找
    var element = textContains(keyword).findOne(1000);
    if (element) {
        console.log("✓ 通过关键词找到评论输入框");
        return element;
    }

    // 备用方案：通过类名查找EditText
    try {
        element = className("android.widget.EditText").findOne(1000);
        if (element) {
            console.log("✓ 通过EditText类名找到评论输入框");
            return element;
        }
    } catch (error) {
        console.log("✗ EditText类名查找失败: " + error.message);
    }

    console.log("✗ 未找到评论输入框");
    return null;
};

/**
 * 查找发送按钮
 */
TikTokNurturing.prototype.findSendButton = function() {
    var keyword = this.isChineseLanguage() ? "发送" : "Send";
    console.log("使用发送按钮关键词: " + keyword);

    var element = descContains(keyword).findOne(2000);
    if (element) {
        console.log("✓ 找到发送按钮");
        return element;
    } else {
        console.log("✗ 未找到发送按钮");
        return null;
    }
};

/**
 * 打印统计信息
 */
TikTokNurturing.prototype.printStatistics = function() {
    console.log("\n=== 养号统计 ===");
    console.log("观看视频数: " + this.statistics.videoCount);
    console.log("点赞次数: " + this.statistics.likeCount);
    console.log("收藏次数: " + this.statistics.collectCount);
    console.log("评论次数: " + this.statistics.commentCount);

    if (this.statistics.videoCount > 0) {
        console.log("点赞率: " + (this.statistics.likeCount / this.statistics.videoCount * 100).toFixed(1) + "%");
        console.log("收藏率: " + (this.statistics.collectCount / this.statistics.videoCount * 100).toFixed(1) + "%");
        console.log("评论率: " + (this.statistics.commentCount / this.statistics.videoCount * 100).toFixed(1) + "%");
    }
};

/**
 * 获取统计数据
 */
TikTokNurturing.prototype.getStatistics = function() {
    return {
        videoCount: this.statistics.videoCount,
        likeCount: this.statistics.likeCount,
        collectCount: this.statistics.collectCount,
        commentCount: this.statistics.commentCount
    };
};

// ==================== 主函数和使用示例 ====================

/**
 * 创建养号实例的工厂函数 - 使用全局配置
 * @returns {TikTokNurturing} 养号实例，失败返回null
 */
function createNurturingInstance() {
    // 加载动态配置到全局变量
    var result = loadDynamicConfig();

    // 如果配置加载失败，直接返回null
    if (!result) {
        console.log("✗ 动态配置加载失败，无法创建养号实例");
        return null;
    }

    // 创建养号实例
    return new TikTokNurturing();
}

/**
 * 主函数 - 纯动态配置的养号入口
 */
function startTikTokNurturing() {
    console.log("=== TikTok养号脚本启动（纯动态配置模式）===");

    // 检查无障碍服务
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        auto();
        return false;
    }

    try {
        console.log("所有配置将从动态参数获取，无本地配置文件依赖");

        // 创建养号实例
        var nurturing = createNurturingInstance();

        // 检查实例创建是否成功
        if (!nurturing) {
            console.log("✗ 养号实例创建失败，配置获取失败");
            return false;
        }

        // 开始养号
        var success = nurturing.start();

        if (success) {
            console.log("=== 养号完成 ===");
            var stats = nurturing.getStatistics();
            console.log("最终统计:");
            console.log("观看视频: " + stats.videoCount + " 个");
            console.log("点赞次数: " + stats.likeCount + " 次");
            console.log("收藏次数: " + stats.collectCount + " 次");
            console.log("评论次数: " + stats.commentCount + " 次");
        } else {
            console.log("=== 养号失败 ===");
        }

        return success;

    } catch (error) {
        console.error("养号过程中发生错误:", error);
        return false;
    }
}

// ==================== 使用示例 ====================

/**
 * 示例1: 使用全局动态配置
 */
function example1_NormalNurturing() {
    console.log("=== 示例1: 使用全局动态配置 ===");
    return startTikTokNurturing();
}

// ==================== 执行代码 ====================

/**
 * 快速测试函数 - 测试纯动态配置加载和实例创建
 */
function quickTest() {
    console.log("=== 快速测试：纯动态配置验证 ===");

    try {
        // 测试动态配置加载
        var config = loadDynamicConfig();
        if (!config) {
            console.log("✗ 动态配置加载失败");
            return false;
        }

        console.log("✓ 动态配置加载成功");
        console.log("搜索关键词: " + (config.search_keyword || "无"));
        console.log("浏览数量: " + config.browse_num);
        console.log("点赞概率: " + config.like_percent + "%");
        console.log("评论内容数量: " + (config.comment_content ? config.comment_content.length : 0));

        // 测试实例创建
        var nurturing = createNurturingInstance();
        if (!nurturing) {
            console.log("✗ 养号实例创建失败");
            return false;
        }

        console.log("✓ 养号实例创建成功");
        console.log("养号模式: " + (nurturing.isTagMode ? "标签养号" : "普通养号"));
        console.log("评论功能: " + (nurturing.config.enableComments ? "启用" : "禁用"));

        console.log("=== 快速测试完成：纯动态配置模式正常 ===");
        return true;

    } catch (error) {
        console.error("快速测试失败:", error);
        return false;
    }
}

/**
 * 主执行入口 - 自动执行养号任务
 */
function main() {
    console.show();
    console.log("=== TikTok养号脚本 - 重构优化版本 ===");
    console.log("支持动态配置、参数化控制、统一的养号逻辑");

    // 检查无障碍服务
    if (!auto.service) {
        console.log("请先开启无障碍服务");
        auto();
        return false;
    }
    try {
        //  开始实际养号
        console.log("\n--- 步骤3: 开始养号 ---");
        var success = startTikTokNurturing();

        if (success) {
            console.log("\n=== 养号任务完成 ===");
            reportConfigResult(true, "养号任务完成");
            return true;
        } else {
            console.log("\n=== 养号任务失败 ===");
            return false;
        }

    } catch (error) {
        console.error("主函数执行失败:", error);
        return false;
    }
}

// ==================== 脚本说明和使用指南 ====================

/*
🎯 TikTok养号脚本 - 纯动态配置版本

✨ 主要特性：
1. 纯动态配置：完全依赖engines.myEngine().execArgv.template_params传入配置
2. 无本地文件依赖：移除所有本地配置文件（dudu.md等）的依赖
3. 严格参数验证：配置参数不完整时自动上报失败并停止执行
4. 模式统一：通过search_keyword参数区分普通养号和标签养号
5. 参数覆盖：支持运行时覆盖动态配置中的特定参数

📋 动态配置格式（通过execArgv.template_params传入）：
{
    "search_keyword": "搜索关键字",     // 空值=普通养号，有值=标签养号
    "browse_num": 50,                  // 浏览视频数量（必需）
    "browse_interval": 4,              // 浏览间隔秒数（必需）
    "collect_percent": 50,             // 收藏概率%（必需）
    "like_percent": 50,                // 点赞概率%（必需）
    "comment_percent": 50,             // 评论概率%（必需）
    "comment_content": ["评论1", "评论2"], // 评论内容数组（可选）
    "comment_type": "manual",          // 评论类型（可选）
    "comment_word_limit": 100          // 评论字数限制（可选）
}

🚀 使用方法：
1. 确保动态配置通过execArgv.template_params正确传入
2. 运行main()函数进行配置验证和自动执行
3. 可使用示例函数测试不同的参数覆盖场景

📝 示例：
- example1_NormalNurturing()     // 使用动态配置原值
- example2_TagNurturing()        // 覆盖搜索关键词
- example3_CustomComments()      // 覆盖评论内容
- example4_OverrideKeyword()     // 覆盖搜索关键词

⚠️ 注意事项：
- 必须通过动态配置传入所有必需参数，无默认值回退
- 配置获取失败会自动调用reportConfigResult()上报
- 确保已开启无障碍服务
- 无任何本地配置文件依赖
*/

// ==================== 执行入口 ====================

main();