# AutoJs6 项目开发指南

## 📖 项目简介

这是一个基于 **AutoJs6** 的自动化脚本项目。AutoJs6 是一个支持无障碍服务的Android平台JavaScript自动化工具，可以用来开发各种自动化脚本，如UI自动化、任务自动化等。

本项目使用 VSCode 作为开发环境，通过 AutoJs6 VSCode 扩展插件实现代码编写、调试和部署。

---

## 🔧 VSCode插件安装指南,安装后有代码提示

### 方法一：通过VSCode扩展市场安装（推荐）

1. **打开VSCode扩展面板**
   - 快捷键：`Ctrl+Shift+X` (Windows/Linux) 或 `Cmd+Shift+X` (Mac)
   - 或点击左侧活动栏的扩展图标 📦

2. **搜索插件**
   - 在搜索框中输入：`AutoJs6-VSCode-Extension`
   - 或搜索关键词：`autojs6` 或 `auto.js`

3. **安装插件**
   - 找到插件名称：**AutoJs6-VSCode-Extension**
   - 点击 `Install` 按钮进行安装
   - 等待安装完成，插件会自动启用

### 方法二：通过命令面板安装

1. **打开命令面板**
   - 快捷键：`Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac)

2. **搜索扩展命令**
   - 输入：`Extensions: Install Extensions`
   - 选择该命令并回车

3. **搜索并安装**
   - 按照方法一的步骤 2-3 进行操作

### 插件信息确认

安装完成后，确认插件信息：
- **插件名称**：AutoJs6-VSCode-Extension
- **发布者**：通常显示为 AutoJs6 相关的开发者名称
- **功能**：提供 AutoJs6 项目的语法高亮、代码提示、项目管理等功能

---

## 🚀 新建项目指南

### 创建新项目

1. **使用插件创建项目**
   - 打开命令面板：`Ctrl+Shift+P` / `Cmd+Shift+P`
   - 输入：`AutoJs6: New Project`
   - 选择该命令并回车

2. **选择项目文件夹**
   - 选择一个**空文件夹**作为项目根目录
   - ⚠️ **注意**：不要选择已有文件的文件夹，避免文件冲突
   - 建议创建专门的项目文件夹，如：`D:\AutoJs6Projects\MyProject`

3. **项目初始化**
   - 插件会自动创建项目结构
   - 生成必要的配置文件（如 `project.json`）
   - 创建示例脚本文件

### 项目结构说明

创建完成后，项目目录结构通常如下：
```
MyProject/
├── project.json          # 项目配置文件
├── main.js              # 主脚本文件
├── modules/             # 模块文件夹
├── assets/              # 资源文件夹
└── .vscode/             # VSCode配置文件夹
    └── settings.json    # 项目设置
```

### 必要配置步骤

1. **检查项目配置**
   - 打开 `project.json` 文件
   - 确认项目名称、版本号等信息
   - 根据需要修改配置参数

2. **配置VSCode工作区**
   - 确保在VSCode中打开的是项目根目录
   - 检查 `.vscode/settings.json` 中的配置是否正确

---

## ⚙️ 环境配置

### npm命令使用说明

在项目根目录下，需要运行以下npm命令来配置开发环境：

#### 1. dts-link 命令
```bash
npm run dts-link
```

**用途说明**：
- 创建TypeScript声明文件的符号链接
- 将AutoJs6的类型定义链接到项目中
- 使VSCode能够提供准确的代码提示和类型检查

**何时使用**：
- 首次创建项目后
- 更新AutoJs6版本后
- 代码提示不正常时

#### 2. dts 命令
```bash
npm run dts
```

**用途说明**：
- 下载或更新AutoJs6的TypeScript声明文件
- 确保类型定义文件是最新版本
- 修复类型定义相关的问题

**何时使用**：
- 首次设置项目环境时
- AutoJs6 API更新后
- 遇到类型定义错误时

### 声明文件部署的重要性

**为什么需要声明文件？**
1. **代码提示**：提供准确的API函数和参数提示
2. **类型检查**：在编写代码时发现潜在错误
3. **文档支持**：显示函数说明和使用示例
4. **开发效率**：减少查阅文档的时间，提高编码速度

**配置步骤**：
```bash
# 1. 首先运行dts命令获取声明文件
npm run dts

# 2. 然后运行dts-link创建链接
npm run dts-link
```

⚠️ **注意**：两个命令都需要执行，且建议按上述顺序执行。

---

## 📝 开发流程

### 基本开发步骤

1. **编写脚本**
   - 在 `main.js` 或其他 `.js` 文件中编写代码
   - 利用VSCode的代码提示功能提高效率

2. **调试脚本**
   - 使用插件提供的调试功能
   - 通过USB连接或WiFi连接到Android设备

3. **部署运行**
   - 将脚本发送到AutoJs6应用
   - 在设备上运行和测试脚本

### 常用快捷键

- `F5`：运行当前脚本
- `Ctrl+F5`：停止运行脚本
- `F6`：运行项目
- `Ctrl+Shift+P`：打开命令面板，访问所有AutoJs6命令

---

## 🔍 常见问题

### Q: 代码没有提示怎么办？
A: 
1. 确保已安装AutoJs6-VSCode-Extension插件
2. 运行 `npm run dts` 和 `npm run dts-link`
3. 重启VSCode

### Q: 无法连接到设备？
A: 
1. 确保设备和电脑在同一网络
2. 检查AutoJs6应用中的服务器设置
3. 确认防火墙没有阻止连接

### Q: 项目创建失败？
A: 
1. 确保选择的是空文件夹
2. 检查文件夹权限
3. 重新安装插件后再试

---

## 📚 相关资源

- [AutoJs6 官方文档](https://github.com/SuperMonster003/AutoJs6)
- [AutoJs6 API文档](https://github.com/SuperMonster003/AutoJs6/wiki)
- [VSCode插件使用说明](https://github.com/SuperMonster003/AutoJs6-VSCode-Extension)

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📄 许可证

本项目遵循相应的开源许可证，具体请查看LICENSE文件。
