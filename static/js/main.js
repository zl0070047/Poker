// 游戏状态管理
const gameState = {
    username: '',
    room: '',
    avatar: 'avatar1',
    isHost: false,
    players: []
};

// 建立Socket.IO连接
console.log('初始化Socket.IO连接...');
const socketUrl = window.location.hostname === 'localhost' ? '/' : window.location.origin;
console.log('Socket.IO连接URL:', socketUrl);

const socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000
});

// 连接事件
socket.on('connect', function() {
    console.log('Socket.IO连接成功');
    showMessage('已连接到服务器', 'success');
    
    // 测试连接
    socket.emit('ping_server');
});

socket.on('connection_confirmed', function(data) {
    console.log('服务器确认连接:', data);
});

socket.on('pong_client', function(data) {
    console.log('服务器响应:', data);
});

socket.on('connect_error', function(error) {
    console.error('Socket.IO连接错误:', error);
    showMessage('连接服务器失败', 'error');
});

socket.on('disconnect', function() {
    console.log('Socket.IO连接断开');
    showMessage('与服务器的连接已断开', 'warning');
});

// 消息显示函数
function showMessage(message, type = 'info') {
    console.log(`消息(${type}): ${message}`);
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '9999';
    
    // 设置背景色
    if (type === 'error') {
        messageElement.style.backgroundColor = '#ff3b30';
    } else if (type === 'success') {
        messageElement.style.backgroundColor = '#34c759';
    } else if (type === 'warning') {
        messageElement.style.backgroundColor = '#ff9500';
    } else {
        messageElement.style.backgroundColor = '#007aff';
    }
    
    messageElement.style.color = 'white';
    
    // 添加到页面
    document.body.appendChild(messageElement);
    
    // 3秒后移除
    setTimeout(() => {
        messageElement.style.opacity = '0';
        messageElement.style.transition = 'opacity 0.5s';
        
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 500);
    }, 3000);
}

// 生成房间ID
function generateRoomId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 切换到等待面板
function switchToWaitingPanel(isHost) {
    console.log('切换到等待面板, 是否房主:', isHost);
    
    // 隐藏其他面板
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    
    // 显示等待面板
    document.getElementById('waiting-panel').style.display = 'block';
    
    // 房主控制
    document.getElementById('host-controls').style.display = isHost ? 'block' : 'none';
    
    // 更新状态
    gameState.isHost = isHost;
    
    console.log('等待面板已显示');
}

// 更新等待玩家列表
function updateWaitingPlayers(players) {
    console.log('更新等待玩家列表:', players);
    
    const waitingPlayersElement = document.getElementById('waiting-players');
    if (!waitingPlayersElement) {
        console.error('找不到waiting-players元素');
        return;
    }
    
    // 清空现有内容
    waitingPlayersElement.innerHTML = '';
    
    // 更新玩家数量
    document.getElementById('current-player-count').textContent = players.length;
    
    // 添加玩家
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.className = 'waiting-player';
        
        // 创建头像
        const avatarElement = document.createElement('div');
        avatarElement.className = 'waiting-player-avatar';
        avatarElement.innerHTML = `<i class="fas fa-user"></i>`;
        
        // 创建名称
        const nameElement = document.createElement('div');
        nameElement.className = 'waiting-player-name';
        nameElement.textContent = player.username;
        
        // 如果是房主，添加标签
        if (player.isHost) {
            const hostTag = document.createElement('span');
            hostTag.className = 'host-tag';
            hostTag.textContent = '房主';
            nameElement.appendChild(hostTag);
        }
        
        // 组装
        playerElement.appendChild(avatarElement);
        playerElement.appendChild(nameElement);
        waitingPlayersElement.appendChild(playerElement);
    });
    
    // 启用/禁用开始游戏按钮
    const startGameBtn = document.getElementById('start-game-btn');
    if (gameState.isHost) {
        startGameBtn.disabled = players.length < 2;
        startGameBtn.textContent = players.length < 2 
            ? '开始游戏(至少需要2名玩家)' 
            : '开始游戏';
    }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，初始化UI和事件监听器');
    
    // 获取DOM元素
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const createUsernameInput = document.getElementById('create-username');
    const joinUsernameInput = document.getElementById('join-username');
    const roomIdInput = document.getElementById('room-id');
    const copyRoomIdBtn = document.getElementById('copy-room-id');
    
    // 添加测试按钮
    const testButton = document.createElement('button');
    testButton.textContent = '测试连接';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px';
    testButton.addEventListener('click', function() {
        socket.emit('ping_server');
        showMessage('发送测试消息', 'info');
    });
    document.body.appendChild(testButton);
    
    // 创建房间事件
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', function() {
            console.log('点击了创建房间按钮');
            
            const username = createUsernameInput.value.trim();
            if (!username) {
                showMessage('请输入用户名', 'error');
                return;
            }
            
            // 发送创建房间请求
            socket.emit('create_room', {
                username: username,
                avatar: gameState.avatar
            });
            
            // 保存状态
            gameState.username = username;
        });
    }
    
    // 加入房间事件
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', function() {
            console.log('点击了加入房间按钮');
            
            const username = joinUsernameInput.value.trim();
            const roomId = roomIdInput.value.trim();
            
            if (!username) {
                showMessage('请输入用户名', 'error');
                return;
            }
            
            if (!roomId) {
                showMessage('请输入房间号', 'error');
                return;
            }
            
            // 发送加入房间请求
            socket.emit('join_room', {
                room_id: roomId,
                username: username,
                avatar: gameState.avatar
            });
            
            // 保存状态
            gameState.username = username;
            gameState.room = roomId;
        });
    }
    
    // 开始游戏事件
    if (startGameBtn) {
        startGameBtn.addEventListener('click', function() {
            console.log('点击了开始游戏按钮');
            
            if (!gameState.room) {
                showMessage('房间号无效', 'error');
                return;
            }
            
            // 发送开始游戏请求
            socket.emit('start_game', {
                room_id: gameState.room
            });
        });
    }
    
    // 复制房间号
    if (copyRoomIdBtn) {
        copyRoomIdBtn.addEventListener('click', function() {
            const roomIdValue = document.getElementById('room-id-value');
            if (roomIdValue) {
                navigator.clipboard.writeText(roomIdValue.textContent)
                    .then(() => {
                        showMessage('房间号已复制', 'success');
                    })
                    .catch(err => {
                        console.error('复制失败:', err);
                        showMessage('复制失败', 'error');
                    });
            }
        });
    }
    
    // 房间创建成功事件
    socket.on('room_created', function(data) {
        console.log('收到room_created事件:', data);
        
        // 保存房间ID
        gameState.room = data.room_id;
        
        // 更新房间ID显示
        const roomIdValue = document.getElementById('room-id-value');
        if (roomIdValue) {
            roomIdValue.textContent = data.room_id;
        }
        
        // 切换到等待面板
        switchToWaitingPanel(true);
        
        // 更新玩家列表
        updateWaitingPlayers(data.players);
        
        // 显示成功消息
        showMessage(`房间创建成功: ${data.room_id}`, 'success');
    });
    
    // 加入房间成功事件
    socket.on('room_joined', function(data) {
        console.log('收到room_joined事件:', data);
        
        // 保存房间ID
        gameState.room = data.room_id;
        
        // 更新房间ID显示
        const roomIdValue = document.getElementById('room-id-value');
        if (roomIdValue) {
            roomIdValue.textContent = data.room_id;
        }
        
        // 切换到等待面板
        switchToWaitingPanel(false);
        
        // 更新玩家列表
        updateWaitingPlayers(data.players);
        
        // 显示成功消息
        showMessage(`成功加入房间: ${data.room_id}`, 'success');
    });
    
    // 房间更新事件
    socket.on('room_update', function(data) {
        console.log('收到room_update事件:', data);
        updateWaitingPlayers(data.players);
    });
    
    // 玩家离开事件
    socket.on('player_left', function(data) {
        console.log('收到player_left事件:', data);
        showMessage(`玩家 ${data.username} 离开了房间`, 'info');
        updateWaitingPlayers(data.players);
    });
    
    // 游戏开始事件
    socket.on('game_start', function(data) {
        console.log('收到game_start事件:', data);
        showMessage('游戏开始!', 'success');
        
        // 隐藏等待面板
        document.getElementById('waiting-panel').style.display = 'none';
        
        // 显示游戏界面
        document.getElementById('game-screen').style.display = 'block';
    });
    
    // 错误处理
    socket.on('error', function(data) {
        console.error('收到错误:', data);
        showMessage(data.message, 'error');
    });
    
    // 头像选择
    const avatarOptions = document.querySelectorAll('.avatar-option');
    if (avatarOptions.length > 0) {
        avatarOptions.forEach(option => {
            option.addEventListener('click', function() {
                // 移除其他选中
                avatarOptions.forEach(opt => opt.classList.remove('selected'));
                
                // 选中当前
                option.classList.add('selected');
                
                // 保存选择
                gameState.avatar = option.getAttribute('data-avatar');
            });
        });
    }
});
