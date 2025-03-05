import os
import random
import string
import time
import logging
from flask import Flask, render_template, request, jsonify, Response
from flask_socketio import SocketIO

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建应用
app = Flask(__name__)
app.config['SECRET_KEY'] = 'poker_secret_key'

# 简化SocketIO配置，关闭ping/pong机制
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=None,  # 禁用ping超时
    ping_interval=None,  # 禁用ping间隔
    transports=['websocket', 'polling']  # 明确指定传输方式
)

# 房间数据
rooms = {}

# 主页
@app.route('/')
def index():
    logger.info("加载主页")
    return render_template('index.html')

# 静态文件测试
@app.route('/test-static')
def test_static():
    return jsonify({
        "css_exists": os.path.exists(os.path.join(app.static_folder, 'css', 'style.css')),
        "js_exists": os.path.exists(os.path.join(app.static_folder, 'js', 'main.js')),
    })

# 健康检查
@app.route('/health')
def health():
    return jsonify({"status": "ok"})

# 简化的API路由代替Socket.IO (备用方案)
@app.route('/api/create-room', methods=['POST'])
def api_create_room():
    data = request.json
    room_id = ''.join(random.choice(string.digits) for _ in range(6))
    username = data.get('username', 'Unknown')
    
    rooms[room_id] = {
        'players': [{
            'username': username,
            'isHost': True
        }],
        'status': 'waiting'
    }
    
    return jsonify({
        'success': True,
        'room_id': room_id,
        'players': rooms[room_id]['players']
    })

# 连接事件
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    logger.info(f"客户端连接: {sid}")
    emit_safely('connection_confirmed', {'status': 'connected', 'sid': sid})

# 安全的emit函数，捕获异常
def emit_safely(event, data, **kwargs):
    try:
        socketio.emit(event, data, **kwargs)
    except Exception as e:
        logger.error(f"发送事件错误 ({event}): {str(e)}")

# 创建房间
@socketio.on('create_room')
def handle_create_room(data):
    try:
        sid = request.sid
        username = data.get('username', 'Unknown')
        logger.info(f"创建房间请求: {username} (SID: {sid})")
        
        # 生成房间ID
        room_id = ''.join(random.choice(string.digits) for _ in range(6))
        
        # 创建房间数据
        rooms[room_id] = {
            'players': [{
                'id': sid,
                'username': username,
                'isHost': True
            }],
            'status': 'waiting'
        }
        
        # 加入Socket.IO房间
        socketio.server.enter_room(sid, room_id)
        
        # 发送响应
        emit_safely('room_created', {
            'room_id': room_id,
            'players': rooms[room_id]['players']
        })
        
        logger.info(f"房间创建成功: {room_id}")
    except Exception as e:
        logger.error(f"创建房间错误: {str(e)}", exc_info=True)
        emit_safely('error', {'message': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"启动应用，端口: {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, log_output=True)
