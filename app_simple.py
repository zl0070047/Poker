import os
import random
import string
import time
import logging
from flask import Flask, render_template, request, jsonify, Response
from flask_socketio import SocketIO

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# 创建应用
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'poker_secret_key')

# SocketIO配置
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=25,
    transports=['websocket', 'polling']
)

# 房间数据
rooms = {}

# 主页
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/diagnose')
def diagnose():
    return render_template('diagnose.html')
# 测试页面
@app.route('/test')
def test_page():
    logger.info("加载测试页面")
    return render_template('test.html')

# 静态文件测试
@app.route('/test-static')
def test_static():
    try:
        css_path = os.path.join(app.static_folder, 'css', 'style.css')
        js_path = os.path.join(app.static_folder, 'js', 'simple.js')
        
        css_exists = os.path.exists(css_path)
        js_exists = os.path.exists(js_path)
        
        css_size = os.path.getsize(css_path) if css_exists else 0
        js_size = os.path.getsize(js_path) if js_exists else 0
        
        return jsonify({
            'static_folder': app.static_folder,
            'css_path': css_path,
            'js_path': js_path,
            'css_exists': css_exists,
            'js_exists': js_exists,
            'css_size': css_size,
            'js_size': js_size
        })
    except Exception as e:
        logger.error(f"测试静态文件时出错: {str(e)}")
        return jsonify({"error": str(e)}), 500

# 健康检查
@app.route('/health')
def health():
    return jsonify({"status": "ok", "rooms": len(rooms)})

# 创建房间HTTP API
@app.route('/api/create-room', methods=['POST'])
def api_create_room():
    try:
        data = request.json
        username = data.get('username', 'Unknown')
        
        # 生成房间号
        room_id = ''.join(random.choice(string.digits) for _ in range(6))
        
        # 创建房间
        rooms[room_id] = {
            'players': [{
                'id': 'http-' + str(int(time.time())),
                'username': username,
                'isHost': True
            }],
            'status': 'waiting'
        }
        
        logger.info(f"通过HTTP API创建房间: {room_id}, 用户: {username}")
        
        return jsonify({
            'success': True,
            'room_id': room_id,
            'players': rooms[room_id]['players']
        })
    except Exception as e:
        logger.error(f"API创建房间错误: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'创建房间失败: {str(e)}'
        })

# 加入房间HTTP API
@app.route('/api/join-room', methods=['POST'])
def api_join_room():
    try:
        data = request.json
        room_id = data.get('room_id')
        username = data.get('username')
        
        # 验证参数
        if not room_id or not username:
            return jsonify({
                'success': False,
                'message': '缺少必要参数'
            })
        
        # 检查房间是否存在
        if room_id not in rooms:
            return jsonify({
                'success': False,
                'message': '房间不存在'
            })
        
        # 检查房间状态
        if rooms[room_id]['status'] != 'waiting':
            return jsonify({
                'success': False,
                'message': '游戏已开始，无法加入'
            })
        
        # 检查用户名是否重复
        for player in rooms[room_id]['players']:
            if player.get('username') == username:
                return jsonify({
                    'success': False,
                    'message': '该用户名已存在'
                })
        
        # 添加新玩家
        player = {
            'id': 'http-' + str(int(time.time())),
            'username': username,
            'isHost': False
        }
        rooms[room_id]['players'].append(player)
        
        logger.info(f"通过HTTP API加入房间: {username} 加入 {room_id}")
        
        return jsonify({
            'success': True,
            'room_id': room_id,
            'players': rooms[room_id]['players']
        })
        
    except Exception as e:
        logger.error(f"API加入房间错误: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'加入房间失败: {str(e)}'
        })

# 安全的emit函数，捕获异常
def emit_safely(event, data, **kwargs):
    try:
        socketio.emit(event, data, **kwargs)
    except Exception as e:
        logger.error(f"发送事件错误 ({event}): {str(e)}")

# Socket.IO连接事件
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    logger.info(f"客户端连接: {sid}")
    emit_safely('connection_confirmed', {'status': 'connected', 'sid': sid})

# Socket.IO断开连接事件
@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    logger.info(f"客户端断开连接: {sid}")
    
    # 处理玩家离开
    for room_id in list(rooms.keys()):
        room = rooms[room_id]
        players = room['players']
        
        for i, player in enumerate(players):
            if player.get('id') == sid:
                username = player.get('username', 'Unknown')
                logger.info(f"玩家 {username} 离开房间 {room_id}")
                
                # 移除玩家
                players.pop(i)
                
                # 如果房间空了，删除房间
                if not players:
                    del rooms[room_id]
                    logger.info(f"房间 {room_id} 已删除(空)")
                else:
                    # 通知其他玩家
                    emit_safely('player_left', {
                        'username': username,
                        'players': players
                    }, to=room_id)
                
                break

# Socket.IO Ping测试
@socketio.on('ping_server')
def handle_ping():
    sid = request.sid
    logger.info(f"收到ping: {sid}")
    emit_safely('pong_client', {
        'timestamp': time.time(),
        'status': 'ok'
    })

# Socket.IO创建房间
@socketio.on('create_room')
def handle_create_room(data):
    try:
        sid = request.sid
        username = data.get('username', 'Unknown')
        avatar = data.get('avatar', 'avatar1')
        logger.info(f"创建房间请求: {username} (SID: {sid})")
        
        # 生成房间ID
        room_id = ''.join(random.choice(string.digits) for _ in range(6))
        
        # 创建房间数据
        rooms[room_id] = {
            'players': [{
                'id': sid,
                'username': username,
                'avatar': avatar,
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

# Socket.IO加入房间
@socketio.on('join_room')
def handle_join_room(data):
    try:
        sid = request.sid
        room_id = data.get('room_id')
        username = data.get('username')
        avatar = data.get('avatar', 'avatar1')
        
        logger.info(f"加入房间请求: {username} 尝试加入 {room_id} (SID: {sid})")
        
        # 检查房间是否存在
        if room_id not in rooms:
            logger.warning(f"尝试加入不存在的房间: {room_id}")
            emit_safely('error', {'message': '房间不存在'})
            return
        
        # 检查房间状态
        if rooms[room_id]['status'] != 'waiting':
            emit_safely('error', {'message': '游戏已开始，无法加入'})
            return
        
        # 检查用户名是否重复
        for player in rooms[room_id]['players']:
            if player.get('username') == username:
                emit_safely('error', {'message': '该用户名已存在'})
                return
        
        # 添加新玩家
        player = {
            'id': sid,
            'username': username,
            'avatar': avatar,
            'isHost': False
        }
        rooms[room_id]['players'].append(player)
        
        # 加入Socket.IO房间
        socketio.server.enter_room(sid, room_id)
        
        # 发送响应
        emit_safely('room_joined', {
            'room_id': room_id,
            'players': rooms[room_id]['players']
        })
        
        # 通知房间其他人
        emit_safely('room_update', {
            'players': rooms[room_id]['players']
        }, to=room_id)
        
        logger.info(f"玩家 {username} 成功加入房间 {room_id}")
        
    except Exception as e:
        logger.error(f"加入房间错误: {str(e)}", exc_info=True)
        emit_safely('error', {'message': f'加入房间失败: {str(e)}'})

# Socket.IO开始游戏
@socketio.on('start_game')
def handle_start_game(data):
    try:
        sid = request.sid
        room_id = data.get('room_id')
        
        logger.info(f"开始游戏请求: 房间 {room_id}")
        
        # 检查房间
        if room_id not in rooms:
            emit_safely('error', {'message': '房间不存在'})
            return
        
        # 检查是否是房主
        host_id = None
        for player in rooms[room_id]['players']:
            if player.get('isHost'):
                host_id = player.get('id')
                break
        
        if host_id != sid:
            emit_safely('error', {'message': '只有房主可以开始游戏'})
            return
        
        # 检查玩家数量
        if len(rooms[room_id]['players']) < 2:
            emit_safely('error', {'message': '至少需要2名玩家才能开始游戏'})
            return
        
        # 更新房间状态
        rooms[room_id]['status'] = 'playing'
        
        # 通知所有玩家
        emit_safely('game_start', {
            'players': rooms[room_id]['players']
        }, to=room_id)
        
        logger.info(f"游戏在房间 {room_id} 中开始")
        
    except Exception as e:
        logger.error(f"开始游戏错误: {str(e)}", exc_info=True)
        emit_safely('error', {'message': f'开始游戏失败: {str(e)}'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"启动应用，端口: {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True, log_output=True)
