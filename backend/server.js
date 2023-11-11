const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./Routes/userRoutes');
const User = require('./model/User');
const Message = require('./model/Message');
 

const app = express();
const rooms = ['general', 'tech', 'marketing', 'PD'];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.use('/users', userRoutes);

const server = http.createServer(app);
const PORT =  5000;
const io = require('socket.io')(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Rooms API endpoint
app.get('/rooms', (req, res) => {
  res.json(rooms);
});

// Database connection
const MONGO_URI = 'mongodb://localhost:27017/chat-app';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
 
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
connection.once('open', () => {
  console.log('Connected to MongoDB');
});

// Utility functions for handling room messages
async function getLastMessageFromRoom(room) {
  return Message.aggregate([
    { $match: { to: room } },
    { $group: { _id: '$date', messageByDate: { $push: '$$ROOT' } } },
  ]);
}

function sortRoomMessageByDate(messages) {
  return messages.sort((a, b) => new Date(a._id) - new Date(b._id));
}

// Socket connection handling
function handleNewUser(socket) {
  socket.on('new-user', async () => {
    const members = await User.find();
    io.emit('new-user', members);
  });
}

function handleJoinRoom(socket) {
  socket.on('join-room', async (newRoom, previousRoom) => {
    socket.join(newRoom);
    socket.leave(previousRoom);
    const roomMessages = await getLastMessageFromRoom(newRoom);
    const sortedRoomMessages = sortRoomMessageByDate(roomMessages);
    io.to(newRoom).emit('room-messages', sortedRoomMessages);
  });
}

function handleMessageRoom(socket) {
  socket.on('message-room', async (room, content, sender, time, date) => {
    try {
      const newMessage = await Message.create({ content, from: sender, time, date, to: room });
      console.log('Received message-room event:', { room, content, sender, time, date });
      const roomMessages = await getLastMessageFromRoom(room);
      const sortedRoomMessages = sortRoomMessageByDate(roomMessages);
      io.to(room).emit('room-messages', sortedRoomMessages);
      socket.broadcast.emit('notifications', room);
    } catch (error) {
      console.error('Error handling message-room event:', error);
    }
  });
}


// Socket connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Event handlers
  handleNewUser(socket);
  handleJoinRoom(socket);
  handleMessageRoom(socket);

  app.set('socket', socket);
});


// Logout API endpoint
app.delete('/logout', async (req, res) => {
  try {
    const { _id, newMessages } = req.body;
    
    // Retrieve the socket reference from the request object
    const socket = req.app.get('socket');

    const user = await User.findById(_id);
    user.status = 'offline';
    user.newMessages = newMessages;
    await user.save();
    const members = await User.find();
    socket.broadcast.emit('new-user', members);
    res.status(200).send('User logout successful');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
