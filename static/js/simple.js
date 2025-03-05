// 德州扑克游戏简化版JavaScript - 增强版
console.log('加载简化版JavaScript (增强版)...');

// 游戏状态
const gameState = {
    username: '',
    room: '',
    avatar: 'avatar1',
    isHost: false,
    players: []
};

// 显示消息
function showMessage(message, type = 'info') {
    console.log(`消息(${type}): ${message}`);
    
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translateX(-50%)';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '5px';
    messageDiv.style.backgroundColor = type === 'error' ? '#ff3b30' : 
                                      type === 'success' ? '#34c759' : 
                                      type === 'warning' ? '#ff9500' : '#007aff';
    messageDiv.style.color = 'white';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    messageDiv.style.fontSize = '14px';
    messageDiv.style.fontWeight = '500';
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 500);
    }, 3000);
}

// 添加调试日志区域
function addDebugPanel() {
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '0';
    debugPanel.style.left = '0';
    debugPanel.style.right = '0';
    debugPanel.style.backgroundColor = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.maxHeight = '150px';
    debugPanel.style.overflowY = 'auto';
    debugPanel.style.zIndex = '10000';
    debugPanel.style.display = 'none';
    
    document.body.appendChild(debugPanel);
    
    // 添加调试按钮
    const debugToggle = document.createElement('button');
    debugToggle.textContent = 'Debug';
    debugToggle.style.position = 'fixed';
    debugToggle.style.bottom = '10px';
    debugToggle.style.right = '10px';
    debugToggle.style.zIndex = '10001';
    debugToggle.style.padding = '5px 10px';
    debugToggle.style.backgroundColor = '#007aff';
    debugToggle.style.color = 'white';
    debugToggle.style.border = 'none';
    debugToggle.style.borderRadius = '5px';
    debugToggle.addEventListener('click', () => {
        debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    });
    
    document.body.appendChild(debugToggle);
    
    return debugPanel;
}

// 记录调试信息
function log(message) {
    console.log(message);
    const panel = document.getElementById('debug-panel');
    if (panel) {
        const entry = document.createElement('div');
        entry.textContent = `${new Date().toISOString().substr(11, 8)} ${message}`;
        panel.appendChild(entry);
        panel.scrollTop = panel.scrollHeight;
    }
}

// 通过HTTP创建房间（备用方案）
async function createRoomViaHttp() {
    const username = document.getElementById('create-username').value.trim();
    if (!username) {
        showMessage('请输入用户名', 'error');
        return;
    }
    
    try {
        log(`通过HTTP请求创建房间 (用户: ${username})`);
        
        const response = await fetch('/api/create-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        
        const data = await response.json();
        
        if (data.success) {
            log(`房间创建成功: ${data.room_id}`);
            showMessage(`房间创建成功: ${data.room_id}`, 'success');
            
            // 更新游戏状态
            gameState.room = data.room_id;
            gameState.username = username;
            gameState.isHost = true;
            
            // 更新房间ID显示
            document.getElementById('room-id-value').textContent = data.room_id;
            
            // 隐藏登录界面
            document.getElementById('login-screen').style.display = 'none';
            
            // 显示等待面板
            document.getElementById('waiting-panel').style.display = 'block';
            
            // 更新玩家列表
            updateWaitingPlayers(data.players);
        } else {
            showMessage(data.message || '创建房间失败', 'error');
        }
    } catch (error) {
        log(`创建房间错误: ${error.message}`);
        showMessage('创建房间失败，请稍后再试', 'error');
    }
}

// 定义一个独立的处理函数，便于重用和调试
function handleJoinRoom() {
    log('触发加入房间按钮点击事件');
    showMessage('正在处理加入房间请求...', 'info');
    
    // 查找输入字段，同样使用多种查找方式
    let usernameInput = document.getElementById('join-username');
    if (!usernameInput) {
        usernameInput = document.querySelector('input[placeholder*="用户名"], input[placeholder*="昵称"]');
    }
    
    let roomIdInput = document.getElementById('room-id');
    if (!roomIdInput) {
        roomIdInput = document.querySelector('input[placeholder*="房间号"]');
    }
    
    // 如果找不到输入字段，弹出提示框
    const username = usernameInput ? usernameInput.value.trim() : prompt('请输入您的用户名:');
    const roomId = roomIdInput ? roomIdInput.value.trim() : prompt('请输入房间号:');
    
    log(`加入房间信息 - 用户名: "${username}", 房间号: "${roomId}"`);
    
    if (!username) {
        showMessage('请输入用户名', 'error');
        return;
    }
    
    if (!roomId) {
        showMessage('请输入房间号', 'error');
        return;
    }
    
    // 更新游戏状态
    gameState.username = username;
    gameState.room = roomId;
    
    // 判断是使用Socket.IO还是HTTP备用方案
    if (socketConnected) {
        log(`通过Socket.IO加入房间 (用户: ${username}, 房间: ${roomId})`);
        socket.emit('join_room', { 
            username: username,
            room_id: roomId,
            avatar: gameState.avatar
        });
        
        // 添加加入房间提示
        showMessage(`正在加入房间: ${roomId}...`, 'info');
    } else {
        log('Socket.IO未连接，使用HTTP备用方案');
        joinRoomViaHttp(username, roomId);
    }
}

// 通过HTTP加入房间（备用方案）
async function joinRoomViaHttp(username, roomId) {
    // 如果没有提供参数，尝试从表单获取
    if (!username || !roomId) {
        const usernameInput = document.getElementById('join-username');
        const roomIdInput = document.getElementById('room-id');
        
        username = username || (usernameInput ? usernameInput.value.trim() : '');
        roomId = roomId || (roomIdInput ? roomIdInput.value.trim() : '');
    }
    
    if (!username) {
        showMessage('请输入用户名', 'error');
        return;
    }
    
    if (!roomId) {
        showMessage('请输入房间号', 'error');
        return;
    }
    
    try {
        log(`通过HTTP请求加入房间 (用户: ${username}, 房间: ${roomId})`);
        
        const response = await fetch('/api/join-room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, room_id: roomId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            log(`成功加入房间: ${roomId}`);
            showMessage(`成功加入房间: ${roomId}`, 'success');
            
            // 更新游戏状态
            gameState.room = roomId;
            gameState.username = username;
            gameState.isHost = false;
            
            // 更新房间ID显示
            document.getElementById('room-id-value').textContent = roomId;
            
            // 隐藏登录界面
            document.getElementById('login-screen').style.display = 'none';
            
            // 显示等待面板
            document.getElementById('waiting-panel').style.display = 'block';
            
            // 更新玩家列表
            updateWaitingPlayers(data.players);
        } else {
            showMessage(data.message || '加入房间失败', 'error');
        }
    } catch (error) {
        log(`加入房间错误: ${error.message}`);
        showMessage('加入房间失败，请稍后再试', 'error');
    }
}

// 更新等待玩家列表
function updateWaitingPlayers(players) {
    log(`更新等待玩家列表: ${JSON.stringify(players)}`);
    
    const container = document.getElementById('waiting-players');
    if (!container) {
        log('错误: 找不到waiting-players元素');
        return;
    }
    
    // 清空容器
    container.innerHTML = '';
    
    // 更新玩家数量
    const countElement = document.getElementById('current-player-count');
    if (countElement) {
        countElement.textContent = players.length;
    }
    
    // 添加每个玩家
    players.forEach(player => {
        const div = document.createElement('div');
        div.className = 'waiting-player';
        div.innerHTML = `
            <div class="waiting-player-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="waiting-player-name">
                ${player.username}
                ${player.isHost ? '<span class="host-tag">房主</span>' : ''}
            </div>
        `;
        container.appendChild(div);
    });
    
    // 启用/禁用开始游戏按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn && gameState.isHost) {
        startGameBtn.disabled = players.length < 2;
        startGameBtn.textContent = players.length < 2 
            ? '开始游戏(至少需要2名玩家)' 
            : '开始游戏';
    }
}

// 初始化Socket.IO连接
let socket;
let socketConnected = false;

function initializeSocket() {
    log('初始化Socket.IO连接...');
    
    const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '/' 
        : window.location.origin;
    log(`Socket.IO URL: ${socketUrl}`);
    
    socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });
    
    socket.on('connect', function() {
        log(`Socket.IO连接成功 (ID: ${socket.id})`);
        socketConnected = true;
        showMessage('服务器连接成功', 'success');
    });
    
    socket.on('connection_confirmed', function(data) {
        log(`服务器确认连接: ${JSON.stringify(data)}`);
    });
    
    socket.on('connect_error', function(error) {
        log(`Socket.IO连接错误: ${error.message}`);
        socketConnected = false;
        showMessage('连接服务器失败，尝试刷新页面', 'error');
    });
    
    socket.on('disconnect', function() {
        log('Socket.IO连接断开');
        socketConnected = false;
        showMessage('与服务器的连接已断开', 'warning');
    });
    
    // 房间创建成功
    socket.on('room_created', function(data) {
        log(`收到room_created事件: ${JSON.stringify(data)}`);
        
        // 保存游戏状态
        gameState.room = data.room_id;
        gameState.isHost = true;
        gameState.players = data.players;
        
        // 更新房间ID显示
        const roomIdValue = document.getElementById('room-id-value');
        if (roomIdValue) {
            roomIdValue.textContent = data.room_id;
        }
        
        // 隐藏登录界面
        document.getElementById('login-screen').style.display = 'none';
        
        // 显示等待面板
        document.getElementById('waiting-panel').style.display = 'block';
        
        // 更新玩家列表
        updateWaitingPlayers(data.players);
        
        showMessage(`房间创建成功: ${data.room_id}`, 'success');
    });
    
    // 加入房间成功
    socket.on('room_joined', function(data) {
        log(`收到room_joined事件: ${JSON.stringify(data)}`);
        
        // 保存游戏状态
        gameState.room = data.room_id;
        gameState.isHost = false;
        gameState.players = data.players;
        
        // 更新房间ID显示
        const roomIdValue = document.getElementById('room-id-value');
        if (roomIdValue) {
            roomIdValue.textContent = data.room_id;
        }
        
        // 隐藏登录界面
        document.getElementById('login-screen').style.display = 'none';
        
        // 显示等待面板
        document.getElementById('waiting-panel').style.display = 'block';
        
        // 更新玩家列表
        updateWaitingPlayers(data.players);
        
        showMessage(`成功加入房间: ${data.room_id}`, 'success');
    });
    
    // 房间更新
    socket.on('room_update', function(data) {
        log(`收到room_update事件: ${JSON.stringify(data)}`);
        
        // 更新玩家列表
        if (data.players) {
            gameState.players = data.players;
            updateWaitingPlayers(data.players);
        }
    });
    
    // 玩家离开
    socket.on('player_left', function(data) {
        log(`收到player_left事件: ${JSON.stringify(data)}`);
        showMessage(`玩家 ${data.username} 离开了房间`, 'info');
        
        // 更新玩家列表
        if (data.players) {
            gameState.players = data.players;
            updateWaitingPlayers(data.players);
        }
    });
    
    // 游戏开始
    socket.on('game_start', function(data) {
        log(`收到game_start事件: ${JSON.stringify(data)}`);
        showMessage('游戏开始!', 'success');
        
        // 隐藏等待面板
        document.getElementById('waiting-panel').style.display = 'none';
        
        // 显示游戏界面
        document.getElementById('game-screen').style.display = 'block';
    });
    
    // 错误处理
    socket.on('error', function(data) {
        log(`收到错误: ${JSON.stringify(data)}`);
        showMessage(data.message || '发生错误', 'error');
    });
    
    // 服务器Pong响应
    socket.on('pong_client', function(data) {
        log(`收到pong_client: ${JSON.stringify(data)}`);
    });
    
    return socket;
}

// 初始化标签页切换
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns.length === 0) {
        log('没有找到标签页按钮');
        return;
    }
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            log(`切换到标签页: ${targetTab}`);
            
            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // 添加活动状态到当前选项
            btn.classList.add('active');
            const pane = document.getElementById(`${targetTab}-tab`);
            if (pane) {
                pane.classList.add('active');
            }
        });
    });
}

// 初始化头像选择
function initializeAvatarSelection() {
    const avatarOptions = document.querySelectorAll('.avatar-option');
    if (avatarOptions.length === 0) {
        log('没有找到头像选项');
        return;
    }
    
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            // 获取所有同组的选项
            const container = option.closest('.avatar-options');
            if (!container) return;
            
            // 移除所有选中状态
            container.querySelectorAll('.avatar-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // 添加选中状态
            option.classList.add('selected');
            
            // 保存头像选择
            const avatar = option.getAttribute('data-avatar');
            if (avatar) {
                log(`选择头像: ${avatar}`);
                gameState.avatar = avatar;
            }
        });
    });
}

// 添加测试按钮
function addTestButtons() {
    // 测试连接按钮
    const testConnectButton = document.createElement('button');
    testConnectButton.textContent = '测试连接';
    testConnectButton.style.position = 'fixed';
    testConnectButton.style.bottom = '130px';
    testConnectButton.style.right = '10px';
    testConnectButton.style.zIndex = '9999';
    testConnectButton.style.padding = '8px';
    testConnectButton.style.backgroundColor = '#007aff';
    testConnectButton.style.color = 'white';
    testConnectButton.style.border = 'none';
    testConnectButton.style.borderRadius = '5px';
    testConnectButton.addEventListener('click', function() {
        log('测试连接');
        if (socketConnected) {
            socket.emit('ping_server');
            showMessage('发送Ping到服务器', 'info');
        } else {
            showMessage('Socket未连接', 'error');
        }
    });
    document.body.appendChild(testConnectButton);
    
    // 测试加入房间按钮
    const testJoinButton = document.createElement('button');
    testJoinButton.textContent = '测试加入房间';
    testJoinButton.style.position = 'fixed';
    testJoinButton.style.bottom = '90px';
    testJoinButton.style.right = '10px';
    testJoinButton.style.zIndex = '9999';
    testJoinButton.style.padding = '8px';
    testJoinButton.style.backgroundColor = '#34c759';
    testJoinButton.style.color = 'white';
    testJoinButton.style.border = 'none';
    testJoinButton.style.borderRadius = '5px';
    testJoinButton.addEventListener('click', function() {
        const testRoomId = prompt('请输入要加入的房间号:');
        if (testRoomId) {
            const testUsername = 'Test_' + Math.floor(Math.random() * 1000);
            log(`测试加入房间: ${testRoomId} (用户: ${testUsername})`);
            
            if (socketConnected) {
                socket.emit('join_room', { 
                    username: testUsername,
                    room_id: testRoomId,
                    avatar: 'avatar1'
                });
                
                showMessage(`正在加入房间: ${testRoomId}...`, 'info');
            } else {
                showMessage('Socket未连接，无法加入', 'error');
            }
        }
    });
    document.body.appendChild(testJoinButton);
}

// 添加明显的测试按钮来加入房间
function addJoinRoomTestButton() {
    const testButton = document.createElement('button');
    testButton.textContent = '🔴 测试加入房间(点这里)';
    testButton.style.position = 'fixed';
    testButton.style.top = '100px';
    testButton.style.left = '50%';
    testButton.style.transform = 'translateX(-50%)';
    testButton.style.padding = '15px 30px';
    testButton.style.backgroundColor = '#ff3b30';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '10px';
    testButton.style.fontWeight = 'bold';
    testButton.style.fontSize = '18px';
    testButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    testButton.style.zIndex = '10000';
    
    testButton.addEventListener('click', function() {
        const roomId = prompt('请输入房间号:', '');
        if (roomId) {
            const username = prompt('请输入您的用户名:', 'Guest_' + Math.floor(Math.random() * 1000));
            if (username) {
                if (socketConnected) {
                    socket.emit('join_room', {
                        username: username,
                        room_id: roomId,
                        avatar: 'avatar1'
                    });
                    showMessage(`正在加入房间: ${roomId}`, 'info');
                } else {
                    joinRoomViaHttp(username, roomId);
                }
            }
        }
    });
    
    document.body.appendChild(testButton);
    log('已添加测试加入房间按钮');
}

// 添加HTML结构分析功能，帮助诊断
function analyzeHtmlStructure() {
    log('开始分析HTML结构...');
    
    // 查找关键元素
    const loginScreen = document.getElementById('login-screen');
    const joinTab = document.getElementById('join-tab');
    const joinUsername = document.getElementById('join-username');
    const roomIdInput = document.getElementById('room-id');
    const joinRoomBtn = document.getElementById('join-room-btn');
    
    log(`登录页面(#login-screen): ${loginScreen ? '找到' : '未找到'}`);
    log(`加入标签页(#join-tab): ${joinTab ? '找到' : '未找到'}`);
    log(`加入用户名输入(#join-username): ${joinUsername ? '找到' : '未找到'}`);
    log(`房间号输入(#room-id): ${roomIdInput ? '找到' : '未找到'}`);
    log(`加入房间按钮(#join-room-btn): ${joinRoomBtn ? '找到' : '未找到'}`);
    
    // 如果找到加入标签页，检查它的子元素
    if (joinTab) {
        const inputs = joinTab.querySelectorAll('input');
        log(`加入标签页中的输入字段数量: ${inputs.length}`);
        inputs.forEach((input, i) => {
            log(`输入字段 ${i+1}: id="${input.id}", type="${input.type}", placeholder="${input.placeholder}"`);
        });
        
        const buttons = joinTab.querySelectorAll('button');
        log(`加入标签页中的按钮数量: ${buttons.length}`);
        buttons.forEach((btn, i) => {
            log(`按钮 ${i+1}: id="${btn.id}", class="${btn.className}", text="${btn.textContent.trim()}"`);
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    const debugPanel = addDebugPanel();
    log('页面加载完成，初始化应用...');
    
    // 初始化Socket.IO
    socket = initializeSocket();
    
    // 初始化标签页
    initializeTabs();
    
    // 初始化头像选择
    initializeAvatarSelection();
    
    // 添加测试按钮
    addTestButtons();
    
    // 添加明显的加入房间测试按钮
    addJoinRoomTestButton();
    
    // 分析HTML结构
    analyzeHtmlStructure();
    
    // 复制房间号按钮
    const copyRoomIdBtn = document.getElementById('copy-room-id');
    if (copyRoomIdBtn) {
        copyRoomIdBtn.addEventListener('click', function() {
            const roomIdValue = document.getElementById('room-id-value');
            if (roomIdValue && roomIdValue.textContent) {
                navigator.clipboard.writeText(roomIdValue.textContent)
                    .then(() => {
                        log(`复制房间号: ${roomIdValue.textContent}`);
                        showMessage('房间号已复制', 'success');
                    })
                    .catch(err => {
                        log(`复制失败: ${err.message}`);
                        showMessage('复制失败', 'error');
                    });
            } else {
                showMessage('没有可复制的房间号', 'error');
            }
        });
    }
    
    // 创建房间按钮事件
    const createRoomBtn = document.getElementById('create-room-btn');
    if (createRoomBtn) {
        log('找到创建房间按钮，添加事件监听器');
        createRoomBtn.addEventListener('click', function() {
            log('点击了创建房间按钮');
            const username = document.getElementById('create-username').value.trim();
            
            if (!username) {
                showMessage('请输入用户名', 'error');
                return;
            }
            
            gameState.username = username;
            
            // 判断是使用Socket.IO还是HTTP备用方案
            if (socketConnected) {
                log(`通过Socket.IO创建房间 (用户: ${username})`);
                socket.emit('create_room', { 
                    username: username,
                    avatar: gameState.avatar
                });
            } else {
                log('Socket.IO未连接，使用HTTP备用方案');
                createRoomViaHttp();
            }
        });
    } else {
        log('错误：找不到创建房间按钮');
    }
    
    // 加入房间按钮 - 使用多种查找方式确保能找到按钮
    log('尝试查找加入房间按钮...');
    let joinRoomBtn = document.getElementById('join-room-btn');
    
    if (!joinRoomBtn) {
        log('通过ID未找到加入房间按钮，尝试使用其他选择器');
        // 尝试通过选择器定位
        joinRoomBtn = document.querySelector('button.gold-btn:not(#create-room-btn)');
    }
    
    if (!joinRoomBtn) {
        log('通过选择器也未找到加入房间按钮，尝试查找所有按钮');
        // 记录所有找到的按钮
        const allButtons = document.querySelectorAll('button');
        log(`页面中找到 ${allButtons.length} 个按钮：`);
        allButtons.forEach((btn, index) => {
            log(`按钮 ${index+1}: id="${btn.id}", class="${btn.className}", text="${btn.textContent.trim()}"`);
        });
        
        // 尝试使用文本内容匹配
        joinRoomBtn = Array.from(allButtons).find(btn => 
            btn.textContent.includes('加入') || 
            btn.textContent.includes('join')
        );
    }
    
    // 在页面上直接添加一个可靠的按钮（备用方案）
    if (!joinRoomBtn) {
        log('无法找到加入房间按钮，添加备用按钮');
        
        const backupBtn = document.createElement('button');
        backupBtn.textContent = '📥 加入房间 (备用按钮)';
        backupBtn.style.position = 'fixed';
        backupBtn.style.top = '150px';
        backupBtn.style.left = '50%';
        backupBtn.style.transform = 'translateX(-50%)';
        backupBtn.style.zIndex = '9999';
        backupBtn.style.padding = '15px 30px';
        backupBtn.style.backgroundColor = '#ff9500';
        backupBtn.style.color = 'white';
        backupBtn.style.border = 'none';
        backupBtn.style.borderRadius = '10px';
        backupBtn.style.fontWeight = 'bold';
        backupBtn.style.fontSize = '16px';
        backupBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        
        document.body.appendChild(backupBtn);
        
        joinRoomBtn = backupBtn;
    }
    
    if (joinRoomBtn) {
        log(`找到加入房间按钮: ${joinRoomBtn.outerHTML.substring(0, 100)}`);
        
        // 确保按钮可见且可点击
        joinRoomBtn.style.pointerEvents = 'auto';
        joinRoomBtn.style.opacity = '1';
        
        // 添加视觉反馈效果
        joinRoomBtn.addEventListener('mousedown', function() {
            this.style.transform = this.style.transform ? 
                this.style.transform.replace('translateY(0)', 'translateY(2px)') : 'translateY(2px)';
        });
        
        joinRoomBtn.addEventListener('mouseup', function() {
            this.style.transform = this.style.transform ? 
                this.style.transform.replace('translateY(2px)', 'translateY(0)') : '';
        });
        
        // 绑定点击事件 - 同时使用onclick和addEventListener以确保可靠
        joinRoomBtn.onclick = handleJoinRoom;
        joinRoomBtn.addEventListener('click', handleJoinRoom);
        log('成功绑定加入房间事件处理函数');
    } else {
        log('严重错误：无法找到或创建加入房间按钮');
    }
    
    // 开始游戏按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            log('点击了开始游戏按钮');
            
            if (!gameState.room) {
                showMessage('房间号无效', 'error');
                return;
            }
            
            if (!gameState.isHost) {
                showMessage('只有房主可以开始游戏', 'error');
                return;
            }
            
            // 发送开始游戏请求
            if (socketConnected) {
                log(`通过Socket.IO开始游戏，房间: ${gameState.room}`);
                socket.emit('start_game', { room_id: gameState.room });
                showMessage('正在开始游戏...', 'info');
            } else {
                showMessage('连接已断开，无法开始游戏', 'error');
            }
        });
    } else {
        log('错误：找不到开始游戏按钮');
    }

    /* 游戏界面样式 */
.poker-table {
    margin: 20px auto;
    width: 90%;
    max-width: 800px;
    height: 400px;
    border-radius: 200px;
    background-color: #1b5e20;
    border: 15px solid #4e342e;
    position: relative;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    overflow: hidden;
}

.table-felt {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
}

.table-logo {
    position: absolute;
    top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: rgba(255,255,255,0.4);
}

.community-cards-container {
    width: 70%;
    height: 100px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.community-cards {
    display: flex;
    gap: 10px;
}

.players-container {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
}

.player-position {
    position: absolute;
    width: 80px;
    text-align: center;
    color: white;
}

.player-position.position-0 { bottom: 10px; left: 50%; transform: translateX(-50%); }
.player-position.position-1 { bottom: 10px; right: 20%; }
.player-position.position-2 { top: 50%; right: 10px; transform: translateY(-50%); }
.player-position.position-3 { top: 10px; right: 20%; }
.player-position.position-4 { top: 10px; left: 50%; transform: translateX(-50%); }
.player-position.position-5 { top: 10px; left: 20%; }
.player-position.position-6 { top: 50%; left: 10px; transform: translateY(-50%); }
.player-position.position-7 { bottom: 10px; left: 20%; }

.player-avatar {
    width: 40px;
    height: 40px;
    background-color: #333;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto;
    border: 2px solid white;
}

.player-area {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.player-info {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
}

.player-name {
    margin-left: 10px;
    font-weight: bold;
}

.player-cards {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
}

.card {
    width: 60px;
    height: 90px;
    background-color: white;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    position: relative;
}

.card.red {
    color: red;
}

.card.black {
    color: black;
}

.card .suit {
    position: absolute;
    top: 5px;
    left: 5px;
    font-size: 16px;
}

.card .rank {
    font-size: 24px;
    font-weight: bold;
}

.action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
}

.action-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 5px;
    background-color: #007aff;
    color: white;
    font-weight: bold;
    cursor: pointer;
}

.action-btn:hover {
    background-color: #0062cc;
}

.action-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
}

.pot-container {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0,0,0,0.6);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-weight: bold;
}
    
    // 添加页面信息
    log(`页面URL: ${window.location.href}`);
    log(`用户代理: ${navigator.userAgent}`);
    log(`屏幕尺寸: ${window.innerWidth}x${window.innerHeight}`);
});
