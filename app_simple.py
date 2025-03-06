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
    
    # 检查房间是否已满
    max_players = rooms[room_id].get('max_players', 10)
    if len(rooms[room_id]['players']) >= max_players:
        return jsonify({"success": False, "message": f"房间已满({max_players}人)"})
    
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
        "players": rooms[room_id]['players'],
        "max_players": max_players
    })

@app.route('/api/create-room', methods=['POST'])
def api_create_room():
    data = request.json
    username = data.get('username')
    max_players = int(data.get('max_players', 10))
    
    # 验证玩家数量范围
    if max_players < 4:
        max_players = 4
    elif max_players > 10:
        max_players = 10
    
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
            'smallBlind': int(data.get('small_blind', 10)),
            'bigBlind': int(data.get('big_blind', 20)),
            'initialChips': int(data.get('initial_chips', 1000))
        },
        'max_players': max_players
    }
    
    return jsonify({
        "success": True,
        "room_id": room_id,
        "players": rooms[room_id]['players'],
        "max_players": max_players
    })

@socketio.on('connect')
def handle_connect():
    emit('connection_confirmed', {'status': 'connected'})

@socketio.on('create_room')
def handle_create_room(data):
    username = data.get('username')
    avatar = data.get('avatar', 'avatar1')
    max_players = int(data.get('max_players', 10))
    
    # 验证玩家数量范围
    if max_players < 4:
        max_players = 4
    elif max_players > 10:
        max_players = 10
    
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
            'smallBlind': int(data.get('smallBlind', 10)),
            'bigBlind': int(data.get('bigBlind', 20)),
            'initialChips': int(data.get('initialChips', 1000))
        },
        'max_players': max_players
    }
    
    join_room(room_id)
    
    emit('room_created', {
        'room_id': room_id,
        'players': rooms[room_id]['players'],
        'max_players': max_players
    })

@socketio.on('join_room')
def handle_join_room(data):
    username = data.get('username')
    room_id = data.get('room_id')
    avatar = data.get('avatar', 'avatar1')
    
    if not room_id in rooms:
        emit('error', {'message': '房间不存在'})
        return
    
    # 检查房间是否已满
    max_players = rooms[room_id].get('max_players', 10)
    if len(rooms[room_id]['players']) >= max_players:
        emit('error', {'message': f'房间已满({max_players}人)'})
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
        'players': rooms[room_id]['players'],
        'max_players': max_players
    })
    
    # 通知房间内其他人有新玩家加入
    emit('room_update', {
        'players': rooms[room_id]['players'],
        'max_players': max_players
    }, to=room_id, skip_sid=request.sid)

@socketio.on('start_game')
def handle_start_game(data):
    room_id = data.get('room_id')
    
    if not room_id in rooms:
        emit('error', {'message': '房间不存在'})
        return
    
    # 检查玩家数量是否满足最低要求
    if len(rooms[room_id]['players']) < 4:
        emit('error', {'message': '至少需要4名玩家才能开始游戏'})
        return
    
    emit('game_start', {}, to=room_id)
   
   发送游戏开始事件
        emit('game_start', {
            'players': rooms[room_id]['players'],
            'settings': rooms[room_id]['settings']
        }, to=room_id)
        
        print(f'Game started in room {room_id}')
        
    except Exception as e:
        print(f"Error in start_game: {str(e)}")
        emit('error', {'message': '开始游戏时发生错误'})

# 聊天功能
@socketio.on('chat_message')
def handle_chat_message(data):
    try:
        room_id = data.get('room')
        message = data.get('message')
        username = data.get('username')
        
        if not room_id or not message or not username:
            return
            
        # 检查房间是否存在
        if room_id not in rooms:
            emit('error', {'message': '房间不存在'})
            return
            
        # 检查消息长度
        if len(message) > 200:
            emit('error', {'message': '消息过长，请限制在200字符以内'})
            return
        
        # 过滤不适当内容（简单示例）
        if any(word in message.lower() for word in ['脏话1', '脏话2']):
            emit('error', {'message': '请文明聊天'}, room=request.sid)
            return
        
        # 添加时间戳
        timestamp = int(time.time() * 1000)
        
        # 更新房间活动时间
        last_activity[room_id] = time.time()
        
        # 发送消息给房间所有人
        emit('chat_message', {
            'username': username,
            'message': message,
            'timestamp': timestamp
        }, to=room_id)
        
        print(f'Chat message in room {room_id}: {username}: {message}')
        
    except Exception as e:
        print(f"Error in chat_message: {str(e)}")

# 处理表情动画
@socketio.on('send_emoji')
def handle_emoji(data):
    try:
        room_id = data.get('room')
        emoji = data.get('emoji')
        username = data.get('username')
        
        if not room_id or not emoji or not username:
            return
            
        # 检查房间是否存在
        if room_id not in rooms:
            return
            
        # 验证emoji是否在允许列表中
        allowed_emojis = ['😀', '😎', '🤔', '😂', '👍', '👎', '🎲', '🎯', '🎰', '💰', '💸', '🤑']
        if emoji not in allowed_emojis:
            return
        
        # 更新房间活动时间
        last_activity[room_id] = time.time()
        
        # 发送表情给房间所有人
        emit('emoji_animation', {
            'username': username,
            'emoji': emoji
        }, to=room_id)
        
    except Exception as e:
        print(f"Error in send_emoji: {str(e)}")

# 心跳检测，保持连接活跃
@socketio.on('ping')
def handle_ping():
    emit('pong')

@socketio.on('ping_server')
def handle_ping():
    emit('pong_client', {'timestamp': 'pong'})

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0')
