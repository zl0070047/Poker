// 调试版JavaScript - 替代main.js
console.log('加载简化版JavaScript...');

// 游戏状态
const gameState = {
    username: '',
    room: '',
    avatar: 'avatar1'
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
                                      type === 'success' ? '#34c759' : '#007aff';
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

// 使用常规HTTP请求作为备用方案
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

// 更新等待玩家列表
function updateWaitingPlayers(players) {
    const container = document.getElementById('waiting-players');
    container.innerHTML = '';
    
    document.getElementById('current-player-count').textContent = players.length;
    
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
}

// 初始化Socket.IO连接
let socket;
let socketConnected = false;

function initializeSocket() {
    log('初始化Socket.IO连接...');
    
    const socketUrl = window.location.hostname === 'localhost' ? '/' : window.location.origin;
    log(`Socket.IO URL: ${socketUrl}`);
    
    socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5
    });
    
    socket.on('connect', function() {
        log(`Socket.IO连接成功 (ID: ${socket.id})`);
        socketConnected = true;
        showMessage('服务器连接成功', 'success');
    });
    
    socket.on('connection_confirmed', function(data) {
        log(`服务器确认连接: ${JSON.stringify(data)}`);
        showMessage('连接已确认', 'success');
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
        
        // 保存房间ID
        gameState.room = data.room_id;
        
        // 更新房间ID显示
        document.getElementById('room-id-value').textContent = data.room_id;
        
        // 隐藏登录界面
        document.getElementById('login-screen').style.display = 'none';
        
        // 显示等待面板
        document.getElementById('waiting-panel').style.display = 'block';
        
        // 更新玩家列表
        updateWaitingPlayers(data.players);
        
        showMessage(`房间创建成功: ${data.room_id}`, 'success');
    });
    
    // 错误处理
    socket.on('error', function(data) {
        log(`Socket.IO错误: ${JSON.stringify(data)}`);
        showMessage(data.message || '发生错误', 'error');
    });
    
    return socket;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    const debugPanel = addDebugPanel();
    log('页面加载完成，初始化应用...');
    
    // 初始化Socket.IO
    socket = initializeSocket();
    
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
                socket.emit('create_room', { username });
            } else {
                log('Socket.IO未连接，使用HTTP备用方案');
                createRoomViaHttp();
            }
        });
    } else {
        log('错误：找不到创建房间按钮');
    }
    
    // 添加页面信息
    log(`页面URL: ${window.location.href}`);
    log(`用户代理: ${navigator.userAgent}`);
    log(`屏幕尺寸: ${window.innerWidth}x${window.innerHeight}`);
});
