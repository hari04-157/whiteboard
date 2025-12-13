// Filename: server.js

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// This line serves all static files (HTML, CSS, client.js)
// from the same directory this server.js file is in.
app.use(express.static(__dirname)); 

// Listen for a new connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for 'drawing' events from any client
    socket.on('drawing', (data) => {
        // Broadcast that drawing data to *all other* connected clients
        socket.broadcast.emit('drawing', data);
    });

    // Listen for the clear-canvas event
    socket.on('clear-canvas', () => {
        // Broadcast the clear event to all other clients
        socket.broadcast.emit('clear-canvas');
    });

    // Listen for when a client disconnects
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});