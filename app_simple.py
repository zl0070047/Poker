from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
import random
import time  # 新增导入

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60)

# 游戏房间和活动跟踪
rooms = {}
last_activity = {}  # 新增活动跟踪字典

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/diagnose')
def diagnose():
    return render_template('diagnose.html')

@app.route('/api/join-room', methods=['POST'])
def api_join_room():
    data = request.json
    username = data.get('username')
    room_id = data.get('room_id')
    
    if not username or not room_id:
        return jsonify({"success": False, "message": "缺少用户名或房间号"})
    
    if room_id not in rooms:
        return jsonify({"success": False, "message": "房间不存在"})
    
    max_players = rooms[room_id].get('max_players', 10)
    if len(rooms[room_id]['players']) >= max_players:
        return jsonify({"success": False, "message": f"房间已满({max_players}人)"})
    
    for player in rooms[room_id]['players']:
        if player['username'] == username:
            return jsonify({"success": False, "message": "用户名已被使用"})
    
    new_player = {
        'username': username,
        'avatar': data.get('avatar', 'avatar1'),
        'isHost': False
    }
    
    rooms[room_id]['players'].append(new_player)
    last_activity[room_id] = time.time()  # 更新活动时间
    
    return jsonify({
        "success": True,
        "room_id": room_id,
        "players": rooms[room_id]['players'],
        "max_players": max_players
    })

@app.route('/api/create-room', methods=['POST'])
def api_create_room():
    data = request.json
    username = data.get('username')
    max_players = int(data.get('max_players', 10))
    
    if max_players < 4:
        max_players = 4
    elif max_players > 10:
        max_players = 10
    
    if not username:
        return jsonify({"success": False, "message": "缺少用户名"})
    
    room_id = str(random.randint(10000, 99999))
    
    rooms[room_id] = {
        'players': [{
            'username': username,
            'avatar': data.get('avatar', 'avatar1'),
            'isHost': True
        }],
        'settings': {
            'smallBlind': int(data.get('small_blind', 10)),
            'bigBlind': int(data.get('big_blind', 20)),
            'initialChips': int(data.get('initial_chips', 1000))
        },
        'max_players': max_players
    }
    last_activity[room_id] = time.time()  # 初始化活动时间
    
    return jsonify({
        "success": True,
        "room_id": room_id,
        "players": rooms[room_id]['players'],
        "max_players": max_players
    })

# SocketIO 事件处理
@socketio.on('connect')
def handle_connect():
    emit('connection_confirmed', {'status': 'connected'})

@socketio.on('create_room')
def handle_create_room(data):
    try:
        username = data.get('username')
        avatar = data.get('avatar', 'avatar1')
        max_players = int(data.get('max_players', 10))
        
        if max_players < 4:
            max_players = 4
        elif max_players > 10:
            max_players = 10
        
        room_id = str(random.randint(10000, 99999))
        
        rooms[room_id] = {
            'players': [{
                'username': username,
                'avatar': avatar,
                'isHost': True
            }],
            'settings': {
                'smallBlind': int(data.get('smallBlind', 10)),
                'bigBlind': int(data.get('bigBlind', 20)),
                'initialChips': int(data.get('initialChips', 1000))
            },
            'max_players': max_players
        }
        last_activity[room_id] = time.time()
        
        join_room(room_id)
        emit('room_created', {
            'room_id': room_id,
            'players': rooms[room_id]['players'],
            'max_players': max_players
        })
        
    except Exception as e:
        print(f"Error creating room: {str(e)}")
        emit('error', {'message': '创建房间失败'})

@socketio.on('join_room')
def handle_join_room(data):
    try:
        username = data.get('username')
        room_id = data.get('room_id')
        avatar = data.get('avatar', 'avatar1')
        
        if room_id not in rooms:
            emit('error', {'message': '房间不存在'})
            return
        
        max_players = rooms[room_id].get('max_players', 10)
        if len(rooms[room_id]['players']) >= max_players:
            emit('error', {'message': f'房间已满({max_players}人)'})
            return
        
        for player in rooms[room_id]['players']:
            if player['username'] == username:
                emit('error', {'message': '用户名已被使用'})
                return
        
        new_player = {
            'username': username,
            'avatar': avatar,
            'isHost': False
        }
        
        rooms[room_id]['players'].append(new_player)
        last_activity[room_id] = time.time()
        
        join_room(room_id)
        emit('room_joined', {
            'room_id': room_id,
            'players': rooms[room_id]['players'],
            'max_players': max_players
        })
        
        emit('room_update', {
            'players': rooms[room_id]['players'],
            'max_players': max_players
        }, to=room_id, skip_sid=request.sid)
        
    except Exception as e:
        print(f"Error joining room: {str(e)}")
        emit('error', {'message': '加入房间失败'})

@socketio.on('start_game')
def handle_start_game(data):
    try:
        room_id = data.get('room_id')
        
        if room_id not in rooms:
            emit('error', {'message': '房间不存在'})
            return
        
        if len(rooms[room_id]['players']) < 4:
            emit('error', {'message': '至少需要4名玩家才能开始游戏'})
            return
        
        # 发送游戏开始事件
        emit('game_start', {
            'players': rooms[room_id]['players'],
            'settings': rooms[room_id]['settings']
        }, to=room_id)
        
        print(f'Game started in room {room_id}')
        last_activity[room_id] = time.time()
        
    except Exception as e:
        print(f"Error starting game: {str(e)}")
        emit('error', {'message': '开始游戏失败'})

# 聊天功能
@socketio.on('chat_message')
def handle_chat_message(data):
    try:
        room_id = data.get('room')
        message = data.get('message')[:200]  # 限制消息长度
        username = data.get('username')
        
        if not all([room_id, message, username]):
            return
            
        if room_id not in rooms:
            return
            
        # 过滤敏感词
        banned_words = ['脏话1', '脏话2']
        if any(word in message.lower() for word in banned_words):
            emit('error', {'message': '请文明聊天'}, room=request.sid)
            return
        
        timestamp = int(time.time() * 1000)
        last_activity[room_id] = time.time()
        
        emit('chat_message', {
            'username': username,
            'message': message,
            'timestamp': timestamp
        }, to=room_id)
        
    except Exception as e:
        print(f"Chat error: {str(e)}")

# 房间清理线程
def cleanup_inactive_rooms():
    while True:
        try:
            now = time.time()
            inactive_rooms = []
            for room_id, last_active in last_activity.items():
                if now - last_active > 3600:  # 1小时无活动清理
                    inactive_rooms.append(room_id)
            
            for room_id in inactive_rooms:
                del rooms[room_id]
                del last_activity[room_id]
                print(f"Cleaned up room: {room_id}")
            
            time.sleep(300)  # 每5分钟检查一次
        except Exception as e:
            print(f"Cleanup error: {str(e)}")

# 启动清理线程
from threading import Thread
Thread(target=cleanup_inactive_rooms, daemon=True).start()

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
