import os
import logging
import random
import string
import time
from flask import Flask, render_template, request, jsonify, Response
from flask_socketio import SocketIO, emit, join_room, leave_room

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# 初始化Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'poker_secret_key')

# 初始化SocketIO
socketio = SocketIO(app, 
                   cors_allowed_origins="*", 
                   async_mode='eventlet',
                   ping_timeout=60,
                   ping_interval=25)

# 存储游戏房间信息
rooms = {}
player_sessions = {}

# 主页路由
@app.route('/')
def index():
    logger.info("加载主页")
    return render_template('index.html')

# 健康检查路由
@app.route('/health')
def health_check():
    return jsonify({"status": "ok", "rooms": len(rooms)})

# 静态文件诊断
@app.route('/test-static')
def test_static():
    """测试静态文件是否正确配置"""
    try:
        css_path = os.path.join(app.static_folder, 'css', 'style.css')
        js_path = os.path.join(app.static_folder, 'js', 'main.js')
        
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

# Socket.IO连接事件
@socketio.on('connect')
def handle_connect():
    logger.info(f'客户端连接: {request.sid}')
    emit('connection_confirmed', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info(f'客户端断开连接: {request.sid}')
    
    # 处理玩家离开逻辑
    for room_id in list(rooms.keys()):
        room = rooms[room_id]
        players = room['players']
        
        for i, player in enumerate(players):
            if player['id'] == request.sid:
                players.pop(i)
                logger.info(f"玩家 {player['username']} 离开房间 {room_id}")
                
                # 如果房间空了，删除它
                if not players:
                    del rooms[room_id]
                    logger.info(f"房间 {room_id} 已删除(空)")
                # 否则更新其他玩家
                else:
                    emit('player_left', {
                        'username': player['username'],
                        'players': players
                    }, to=room_id)
                
                break

# 测试连接
@socketio.on('ping_server')
def handle_ping():
    logger.info(f"收到ping: {request.sid}")
    emit('pong_client', {
        'timestamp': time.time(),
        'status': 'ok'
    })

# 创建房间
@socketio.on('create_room')
def create_room(data):
    try:
        logger.info(f"创建房间请求: {data}")
        username = data.get('username')
        avatar = data.get('avatar', 'avatar1')
        
        # 生成房间ID
        room_id = ''.join(random.choice(string.digits) for _ in range(6))
        
        # 创建房间
        rooms[room_id] = {
            'players': [],
            'host': request.sid,
            'status': 'waiting',
            'settings': {
                'small_blind': int(data.get('small_blind', 10)),
                'big_blind': int(data.get('big_blind', 20)),
                'all_in_rounds': int(data.get('all_in_rounds', 3)),
                'initial_chips': int(data.get('initial_chips', 1000))
            }
        }
        
        # 添加玩家
        player = {
            'id': request.sid,
            'username': username,
            'avatar': avatar,
            'chips': rooms[room_id]['settings']['initial_chips'],
            'isHost': True
        }
        rooms[room_id]['players'].append(player)
        
        # 加入Socket.IO房间
        join_room(room_id)
        
        # 发送确认
        response_data = {
            'room_id': room_id,
            'players': rooms[room_id]['players'],
            'settings': rooms[room_id]['settings']
        }
        logger.info(f"发送room_created事件: {room_id}")
        emit('room_created', response_data)
        
    except Exception as e:
        logger.error(f"创建房间错误: {str(e)}", exc_info=True)
        emit('error', {'message': f'创建房间失败: {str(e)}'})

# 加入房间
@socketio.on('join_room')
def join_game_room(data):
    try:
        logger.info(f"加入房间请求: {data}")
        room_id = data.get('room_id')
        username = data.get('username')
        avatar = data.get('avatar', 'avatar1')
        
        # 检查房间是否存在
        if room_id not in rooms:
            logger.warning(f"尝试加入不存在的房间: {room_id}")
            emit('error', {'message': '房间不存在'})
            return
        
        # 检查游戏是否已开始
        if rooms[room_id]['status'] != 'waiting':
            emit('error', {'message': '游戏已开始，无法加入'})
            return
        
        # 检查名称是否已被使用
        for player in rooms[room_id]['players']:
            if player['username'] == username:
                emit('error', {'message': '该用户名已被使用'})
                return
        
        # 添加玩家
        player = {
            'id': request.sid,
            'username': username,
            'avatar': avatar,
            'chips': rooms[room_id]['settings']['initial_chips'],
            'isHost': False
        }
        rooms[room_id]['players'].append(player)
        
        # 加入Socket.IO房间
        join_room(room_id)
        
        # 发送确认
        emit('room_joined', {
            'room_id': room_id,
            'players': rooms[room_id]['players'],
            'settings': rooms[room_id]['settings']
        })
        
        # 通知其他玩家
        emit('room_update', {
            'players': rooms[room_id]['players']
        }, to=room_id)
        
        logger.info(f"玩家 {username} 加入房间 {room_id}")
        
    except Exception as e:
        logger.error(f"加入房间错误: {str(e)}", exc_info=True)
        emit('error', {'message': f'加入房间失败: {str(e)}'})

# 开始游戏
@socketio.on('start_game')
def start_game(data):
    try:
        logger.info(f"开始游戏请求: {data}")
        room_id = data.get('room_id')
        
        # 检查房间
        if room_id not in rooms:
            emit('error', {'message': '房间不存在'})
            return
        
        # 检查是否是房主
        if rooms[room_id]['host'] != request.sid:
            emit('error', {'message': '只有房主可以开始游戏'})
            return
        
        # 检查玩家数量
        if len(rooms[room_id]['players']) < 2:
            emit('error', {'message': '至少需要2名玩家才能开始游戏'})
            return
        
        # 更新房间状态
        rooms[room_id]['status'] = 'playing'
        
        # 通知所有玩家
        emit('game_start', {
            'players': rooms[room_id]['players'],
            'settings': rooms[room_id]['settings']
        }, to=room_id)
        
        logger.info(f"游戏在房间 {room_id} 中开始")
        
    except Exception as e:
        logger.error(f"开始游戏错误: {str(e)}", exc_info=True)
        emit('error', {'message': f'开始游戏失败: {str(e)}'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"启动应用，端口: {port}")
    socketio.run(app, host='0.0.0.0', port=port)
