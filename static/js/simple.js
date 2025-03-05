// 德州扑克游戏简化版JavaScript
console.log('加载简化版JavaScript...');

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
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => document.body.removeChild(messageDiv), 500);
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

// 通过HTTP加入房间（备用方案）
async function joinRoomViaHttp() {
    const username = document.getElementById('join-username').value.trim();
    const roomId = document.getElementById('room-id').value.trim();
    
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
    testConnectButton.style.bottom = '90px';
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
    testJoinButton.style.bottom = '50px';
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
    
    // 加入房间按钮事件
    const joinRoomBtn = document.getElementById('join-room-btn');
    if (joinRoomBtn) {
        log('找到加入房间按钮，添加事件监听器');
        joinRoomBtn.addEventListener('click', function() {
            log('点击了加入房间按钮');
            
            const username = document.getElementById('join-username').value.trim();
            const roomId = document.getElementById('room-id').value.trim();
            
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
                joinRoomViaHttp();
            }
        });
    } else {
        log('错误：找不到加入房间按钮');
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
    
    // 添加页面信息
    log(`页面URL: ${window.location.href}`);
    log(`用户代理: ${navigator.userAgent}`);
    log(`屏幕尺寸: ${window.innerWidth}x${window.innerHeight}`);
});
