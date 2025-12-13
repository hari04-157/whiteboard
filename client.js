// Filename: client.js

// 1. Connect to the Socket.IO server
const socket = io();

// 2. Setup the canvas
const canvas = document.getElementById('whiteboard-canvas');
const ctx = canvas.getContext('2d');

// --- NEW: Resize canvas to fit its container ---
function resizeCanvas() {
    const container = document.querySelector('.drawing-area');
    // Subtract margins
    canvas.width = container.clientWidth - 30;
    canvas.height = container.clientHeight - 30;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial size

// 3. Setup drawing variables
let drawing = false;
let lastX = 0;
let lastY = 0;

// --- NEW: Dynamic Tool State ---
let currentTool = 'pencil';
let currentColor = '#000000';
let currentWidth = 5;

// --- NEW: Get All Tool Elements ---
const toolButtons = {
    pen: document.getElementById('tool-pen'),
    pencil: document.getElementById('tool-pencil'),
    brush: document.getElementById('tool-brush'),
    eraser: document.getElementById('tool-eraser')
};
const clearTool = document.getElementById('tool-clear');
const strokeSlider = document.getElementById('stroke-slider');
const colorSwatches = document.querySelectorAll('.color-swatch');

// --- NEW: UI Update Functions ---
function updateSelectedTool(selectedTool) {
    currentTool = selectedTool;
    // Remove 'selected' from all buttons
    Object.values(toolButtons).forEach(button => button.classList.remove('selected'));
    // Add 'selected' to the clicked button
    toolButtons[selectedTool].classList.add('selected');
}

function updateSelectedColor(selectedColor) {
    currentColor = selectedColor;
    // Remove 'selected-color' from all swatches
    colorSwatches.forEach(swatch => swatch.classList.remove('selected-color'));
    // Add 'selected-color' to the clicked swatch
    document.getElementById(selectedColor).classList.add('selected-color');
}

// Set initial selected tool and color on load
updateSelectedTool(currentTool);
updateSelectedColor(currentColor);


// 4. The Master Drawing Function
// This function can draw ANY tool, based on the data it receives.
// This is much cleaner than the old version.
function drawLine(data) {
    const { x1, y1, x2, y2, tool, color, width } = data;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Set tool properties
    switch (tool) {
        case 'pen':
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            break;
        case 'pencil':
            ctx.globalAlpha = 0.7; // Pencil is slightly transparent
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            break;
        case 'brush':
            ctx.globalAlpha = 0.3; // Brush is very transparent
            ctx.strokeStyle = color;
            ctx.lineWidth = width * 2; // Brush is wider
            break;
        case 'eraser':
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ffffff'; // Eraser is just white
            ctx.lineWidth = width * 3; // Eraser is much wider
            break;
    }

    // Draw the path
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// 5. Local Event Listeners
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;

    const currentX = e.offsetX;
    const currentY = e.offsetY;

    // Create the data packet
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

    // Send to server for others
    socket.emit('drawing', drawData);

    // Update the last position
    lastX = currentX;
    lastY = currentY;
});

canvas.addEventListener('mouseup', () => {
    drawing = false;
});
canvas.addEventListener('mouseout', () => {
    drawing = false;
});

// --- NEW: Tool Listeners ---
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
        // Bonus: Switch back to pen when a color is picked
        updateSelectedTool('pen'); 
    });
});

clearTool.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear-canvas');
});

// 6. Listen for data from the server
socket.on('drawing', (data) => {
    // This is a drawing from ANOTHER user.
    // We just pass their data to our master draw function.
    drawLine(data);
});

socket.on('clear-canvas', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});
