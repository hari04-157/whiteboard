// Filename: client.js

// 1. Connect to the Socket.IO server
const socket = io();

// 2. Setup the canvas
const canvas = document.getElementById('whiteboard-canvas');
const ctx = canvas.getContext('2d');

// --- Resize canvas to fit its container ---
function resizeCanvas() {
    const container = document.querySelector('.drawing-area');
    // Set exact pixel size to match display size prevents blurriness
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
// Small delay to ensure layout is ready
setTimeout(resizeCanvas, 100); 

// 3. Setup drawing variables
let drawing = false;
let lastX = 0;
let lastY = 0;

// --- Dynamic Tool State ---
let currentTool = 'pencil';
let currentColor = '#000000';
let currentWidth = 5;

// --- Get All Tool Elements ---
const toolButtons = {
    pen: document.getElementById('tool-pen'),
    pencil: document.getElementById('tool-pencil'),
    brush: document.getElementById('tool-brush'),
    eraser: document.getElementById('tool-eraser')
};
const clearTool = document.getElementById('tool-clear');
const strokeSlider = document.getElementById('stroke-slider');
const colorSwatches = document.querySelectorAll('.color-swatch');

// --- UI Update Functions ---
function updateSelectedTool(selectedTool) {
    currentTool = selectedTool;
    Object.values(toolButtons).forEach(button => button.classList.remove('selected'));
    toolButtons[selectedTool].classList.add('selected');
}

function updateSelectedColor(selectedColor) {
    currentColor = selectedColor;
    colorSwatches.forEach(swatch => swatch.classList.remove('selected-color'));
    document.getElementById(selectedColor).classList.add('selected-color');
}

// Set initial state
updateSelectedTool(currentTool);
updateSelectedColor(currentColor);

// 4. The Master Drawing Function
function drawLine(data) {
    const { x1, y1, x2, y2, tool, color, width } = data;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    switch (tool) {
        case 'pen':
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            break;
        case 'pencil':
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            break;
        case 'brush':
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = color;
            ctx.lineWidth = width * 2;
            break;
        case 'eraser':
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = width * 3;
            break;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// 5. HELPER: Get Coordinates for Mouse OR Touch
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    
    // Check for touch event
    if (e.touches && e.touches.length > 0) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    // Fallback to mouse event
    return {
        x: e.offsetX,
        y: e.offsetY
    };
}

// 6. Universal Event Handlers
function startDrawing(e) {
    // Prevent scrolling on touch devices
    if(e.type === 'touchstart') {
        // e.preventDefault(); // Sometimes needed, but touch-action in CSS handles most
    }
    
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x;
    lastY = pos.y;
}

function moveDrawing(e) {
    if (!drawing) return;
    
    // Important: Prevent scrolling while dragging finger
    if(e.type === 'touchmove') {
        e.preventDefault();
    }

    const pos = getPos(e);
    const currentX = pos.x;
    const currentY = pos.y;

    const drawData = {
        x1: lastX,
        y1: lastY,
        x2: currentX,
        y2: currentY,
        tool: currentTool,
        color: currentColor,
        width: currentWidth
    };

    // Draw locally
    drawLine(drawData);

    // Send to server
    socket.emit('drawing', drawData);

    lastX = currentX;
    lastY = currentY;
}

function stopDrawing(e) {
    drawing = false;
}

// 7. Attach Listeners (Mouse & Touch)
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('touchstart', startDrawing, { passive: false });

canvas.addEventListener('mousemove', moveDrawing);
canvas.addEventListener('touchmove', moveDrawing, { passive: false });

canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);
canvas.addEventListener('touchend', stopDrawing);
canvas.addEventListener('touchcancel', stopDrawing);

// --- Tool Listeners ---
Object.keys(toolButtons).forEach(toolName => {
    toolButtons[toolName].addEventListener('click', () => {
        updateSelectedTool(toolName);
    });
});

strokeSlider.addEventListener('input', (e) => {
    currentWidth = e.target.value;
});

colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        updateSelectedColor(swatch.id);
        updateSelectedTool('pen'); 
    });
});

clearTool.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear-canvas');
});

// 8. Listen for data from server
socket.on('drawing', (data) => {
    drawLine(data);
});

socket.on('clear-canvas', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});