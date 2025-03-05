from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, join_room, leave_room, emit
import random

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=60)

# 游戏房间
rooms = {}

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
    
    # 检查用户名是否已被使用
    for player in rooms[room_id]['players']:
        if player['username'] == username:
            return jsonify({"success": False, "message": "用户名已被使用"})
    
    # 添加玩家到房间
    new_player = {
        'username': username,
        'avatar': data.get('avatar', 'avatar1'),
        'isHost': False
    }
    
    rooms[room_id]['players'].append(new_player)
    
    return jsonify({
        "success": True,
        "room_id": room_id,
        "players": rooms[room_id]['players']
    })

@app.route('/api/create-room', methods=['POST'])
def api_create_room():
    data = request.json
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "缺少用户名"})
    
    # 生成房间ID
    room_id = str(random.randint(10000, 99999))
    
    # 创建房间
    rooms[room_id] = {
        'players': [{
            'username': username,
            'avatar': data.get('avatar', 'avatar1'),
            'isHost': True
        }],
        'settings': {
            'smallBlind': 10,
            'bigBlind': 20,
            'initialChips': 1000
        }
    }
    
    return jsonify({
        "success": True,
        "room_id": room_id,
        "players": rooms[room_id]['players']
    })

@socketio.on('connect')
def handle_connect():
    emit('connection_confirmed', {'status': 'connected'})

@socketio.on('create_room')
def handle_create_room(data):
    username = data.get('username')
    avatar = data.get('avatar', 'avatar1')
    
    # 生成房间ID
    room_id = str(random.randint(10000, 99999))
    
    # 创建房间
    rooms[room_id] = {
        'players': [{
            'username': username,
            'avatar': avatar,
            'isHost': True
        }],
        'settings': {
            'smallBlind': 10,
            'bigBlind': 20,
            'initialChips': 1000
        }
    }
    
    join_room(room_id)
    
    emit('room_created', {
        'room_id': room_id,
        'players': rooms[room_id]['players']
    })

@socketio.on('join_room')
def handle_join_room(data):
    username = data.get('username')
    room_id = data.get('room_id')
    avatar = data.get('avatar', 'avatar1')
    
    if not room_id in rooms:
        emit('error', {'message': '房间不存在'})
        return
    
    # 检查用户名是否已被使用
    for player in rooms[room_id]['players']:
        if player['username'] == username:
            emit('error', {'message': '用户名已被使用'})
            return
    
    # 添加玩家到房间
    new_player = {
        'username': username,
        'avatar': avatar,
        'isHost': False
    }
    
    rooms[room_id]['players'].append(new_player)
    
    join_room(room_id)
    
    # 通知该用户成功加入
    emit('room_joined', {
        'room_id': room_id,
        'players': rooms[room_id]['players']
    })
    
    # 通知房间内其他人有新玩家加入
    emit('room_update', {
        'players': rooms[room_id]['players']
    }, to=room_id, skip_sid=request.sid)

@socketio.on('start_game')
def handle_start_game(data):
    room_id = data.get('room_id')
    
    if not room_id in rooms:
        emit('error', {'message': '房间不存在'})
        return
    
    emit('game_start', {}, to=room_id)

@socketio.on('ping_server')
def handle_ping():
    emit('pong_client', {'timestamp': 'pong'})

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
