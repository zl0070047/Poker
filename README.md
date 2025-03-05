<<<<<<< HEAD
# porkergame

# 豪华德州扑克

这是一个使用WebSocket技术构建的现代化德州扑克游戏，具有精美的苹果风格UI设计和流畅的动画效果。

![德州扑克游戏](https://example.com/poker-screenshot.png)

## 功能特点

- 🃏 精美的卡牌设计和流畅的动画效果
- 🎮 支持多人在线对战
- 💬 实时聊天系统
- 📊 实时排行榜
- 📱 响应式设计，支持多种设备
- ⚙️ 性能优化选项，适应不同设备性能
- 🌓 自动深色模式支持
- ♿ 增强的无障碍支持

## 最近改进

### 界面优化

- 全新的苹果风格设计，包括卡片、按钮和界面元素
- 优化了等待玩家界面，添加了清晰的房间号显示
- 改进了卡牌动画效果，增加了序列发牌动画
- 添加了深色模式支持，自动适应系统设置

### 性能优化

- 添加了性能设置面板，允许用户根据设备性能调整游戏效果
- 优化了动画效果，减少低端设备的性能压力
- 支持禁用模糊效果以提升性能
- 增加了动画速度调节功能

### 代码质量

- 减少了重复代码，统一使用现代API
- 改进了错误处理机制
- 增强了网络状态监控
- 添加了浏览器兼容性检查

### 无障碍支持

- 增加了键盘导航支持
- 改进了颜色对比度
- 添加了ARIA标签
- 支持屏幕阅读器

## 技术栈

- 前端：HTML5, CSS3, JavaScript (ES6+)
- 后端：Python, Flask, Socket.IO
- 通信：WebSocket

## 如何运行

### 依赖项

- Python 3.6+
- Flask
- Flask-SocketIO

### 安装

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/poker-game.git
cd poker-game
```

2. 安装依赖项：
```bash
pip install -r requirements.txt
```

3. 运行应用：
```bash
python app.py
```

4. 访问：
在浏览器中打开 `http://localhost:5000`

## 游戏规则

游戏遵循标准德州扑克规则：

1. 每位玩家获得2张底牌
2. 游戏共有四轮下注：前翻牌、翻牌、转牌和河牌
3. 共有5张公共牌
4. 玩家使用自己的2张底牌和5张公共牌中的任意几张组成最好的5张牌牌型
5. 牌型大小排序：皇家同花顺 > 同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌

## 浏览器兼容性

- Chrome 60+
- Firefox 60+
- Safari 11+
- Edge 79+

## 贡献

欢迎贡献代码或提出问题！请遵循以下步骤：

1. Fork仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

MIT 许可证 - 详见 LICENSE 文件

## 联系方式

如有任何问题，请联系：youremail@example.com 
>>>>>>> Initial commit: Poker game with Apple-style UI
