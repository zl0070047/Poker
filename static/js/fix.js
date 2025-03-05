// 将此代码保存为 static/js/fix.js
(function() {
    console.log('加入房间按钮修复脚本启动');
    
    function fixJoinButton() {
        let joinBtn = document.getElementById('join-room-btn');
        if (!joinBtn) {
            console.log('找不到加入房间按钮，创建新按钮');
            const newBtn = document.createElement('button');
            newBtn.textContent = '加入房间 (修复版)';
            newBtn.style.position = 'fixed';
            newBtn.style.top = '150px';
            newBtn.style.left = '50%';
            newBtn.style.transform = 'translateX(-50%)';
            newBtn.style.padding = '15px 30px';
            newBtn.style.backgroundColor = '#ff3b30';
            newBtn.style.color = 'white';
            newBtn.style.fontSize = '16px';
            newBtn.style.fontWeight = 'bold';
            newBtn.style.border = 'none';
            newBtn.style.borderRadius = '10px';
            newBtn.style.zIndex = '10000';
            document.body.appendChild(newBtn);
            joinBtn = newBtn;
        }
        
        // 移除所有事件监听器
        const newJoinBtn = joinBtn.cloneNode(true);
        joinBtn.parentNode.replaceChild(newJoinBtn, joinBtn);
        
        // 添加直接处理函数
        newJoinBtn.onclick = function() {
            const username = document.getElementById('join-username')?.value.trim() || prompt('请输入用户名:');
            const roomId = document.getElementById('room-id')?.value.trim() || prompt('请输入房间号:');
            
            if (!username || !roomId) {
                alert('用户名和房间号不能为空!');
                return;
            }
            
            console.log(`加入房间 - 用户: ${username}, 房间: ${roomId}`);
            
            try {
                // 尝试使用Socket.IO
                if (window.io) {
                    const socket = io.connect('/');
                    socket.emit('join_room', {
                        username: username,
                        room_id: roomId,
                        avatar: 'avatar1'
                    });
                    alert('正在加入房间，请等待...');
                } else {
                    // 使用HTTP请求
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/join-room', true);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.onload = function() {
                        if (xhr.status === 200) {
                            const data = JSON.parse(xhr.responseText);
                            if (data.success) {
                                alert('加入房间成功!');
                                // 隐藏登录界面
                                document.getElementById('login-screen').style.display = 'none';
                                // 显示等待界面
                                document.getElementById('waiting-panel').style.display = 'block';
                            } else {
                                alert('加入房间失败: ' + (data.message || '未知错误'));
                            }
                        } else {
                            alert('服务器错误: ' + xhr.status);
                        }
                    };
                    xhr.onerror = function() {
                        alert('网络错误，无法连接到服务器');
                    };
                    xhr.send(JSON.stringify({
                        username: username,
                        room_id: roomId
                    }));
                }
            } catch (error) {
                console.error('加入房间出错:', error);
                alert('加入房间失败: ' + error.message);
            }
            
            return false;
        };
        
        console.log('加入房间按钮修复完成');
    }
    
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixJoinButton);
    } else {
        fixJoinButton();
    }
    
    // 再次尝试，确保修复
    setTimeout(fixJoinButton, 1000);
    setTimeout(fixJoinButton, 2000);
})();
