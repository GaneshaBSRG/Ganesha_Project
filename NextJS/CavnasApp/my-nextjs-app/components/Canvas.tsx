import React, { useRef, useEffect, useState, useCallback } from 'react';

const Canvas = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [rectangles, setRectangles] = useState([]); // Array of rectangles
    const [currentRect, setCurrentRect] = useState(null); // Current rectangle being drawn
    const [selectedRectIndex, setSelectedRectIndex] = useState(null); // Index of selected rectangle
    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizingEdge, setResizingEdge] = useState(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

    // Load image
    useEffect(() => {
        const img = new Image();
        img.src = 'https://fastly.picsum.photos/id/17/2500/1667.jpg?hmac=HD-JrnNUZjFiP2UZQvWcKrgLoC_pc_ouUSWv8kHsJJY'; // Replace with your image path
        img.onload = () => setImage(img);
    }, []);

    // Convert mouse event to canvas coordinates
    const getCanvasCoordinates = (event) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (event.clientX - rect.left - offset.x) / scale;
        const y = (event.clientY - rect.top - offset.y) / scale;
        return { x, y };
    };

    // Draw image and rectangles
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Draw image
        if (image) {
            context.drawImage(image, offset.x, offset.y, image.width * scale, image.height * scale);
        }

        // Draw rectangles
        rectangles.forEach((rect, index) => {
            context.beginPath();
            context.rect(
                rect.x * scale + offset.x,
                rect.y * scale + offset.y,
                rect.width * scale,
                rect.height * scale
            );
            context.strokeStyle = index === selectedRectIndex ? 'red' : 'black';
            context.stroke();
        });
    }, [image, rectangles, scale, offset, selectedRectIndex]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Handle drawing a new rectangle
    const startDrawing = (event) => {
        if (event.button !== 0) return;
        const canvasCoords = getCanvasCoordinates(event);
        const rect = { x: canvasCoords.x, y: canvasCoords.y, width: 0, height: 0 };
        setCurrentRect(rect);
        setIsDrawing(true);
    };

    const updateDrawing = (event) => {
        if (!isDrawing) return;
        const canvasCoords = getCanvasCoordinates(event);
        const width = canvasCoords.x - currentRect.x;
        const height = canvasCoords.y - currentRect.y;
        setCurrentRect({ ...currentRect, width, height });
    };

    const finishDrawing = () => {
        if (!isDrawing) return;
        setRectangles([...rectangles, currentRect]);
        setIsDrawing(false);
        setCurrentRect(null);
    };

    // Handle selecting and moving a rectangle
    const selectRectangle = (event) => {
        const canvasCoords = getCanvasCoordinates(event);
        const foundRectIndex = rectangles.findIndex((rect) =>
            canvasCoords.x >= rect.x && canvasCoords.x <= rect.x + rect.width &&
            canvasCoords.y >= rect.y && canvasCoords.y <= rect.y + rect.height
        );
        setSelectedRectIndex(foundRectIndex);
    };

    const moveRectangle = (event) => {
        if (selectedRectIndex === null || isResizing) return;
        const canvasCoords = getCanvasCoordinates(event);
        let movedRect = { ...rectangles[selectedRectIndex] };
        if (isDrawing) {
            movedRect.x = canvasCoords.x;
            movedRect.y = canvasCoords.y;
        }
        let newRectangles = [...rectangles];
        newRectangles[selectedRectIndex] = movedRect;
        setRectangles(newRectangles);
    };

    // Handle resizing a rectangle
    const nearEdge = (mousePos, rect) => {
        const edgeThreshold = 10;
        const nearLeftEdge = Math.abs(mousePos.x - rect.x) < edgeThreshold;
        const nearRightEdge = Math.abs(mousePos.x - (rect.x + rect.width)) < edgeThreshold;
        const nearTopEdge = Math.abs(mousePos.y - rect.y) < edgeThreshold;
        const nearBottomEdge = Math.abs(mousePos.y - (rect.y + rect.height)) < edgeThreshold;

        if (nearLeftEdge) return 'left';
        if (nearRightEdge) return 'right';
        if (nearTopEdge) return 'top';
        if (nearBottomEdge) return 'bottom';
        return null;
    };

    const startResizing = (event) => {
        if (selectedRectIndex === null) return;
        const canvasCoords = getCanvasCoordinates(event);
        const rect = rectangles[selectedRectIndex];
        const edge = nearEdge(canvasCoords, rect);
        if (edge) {
            setIsResizing(true);
            setResizingEdge(edge);
        }
    };

    const resizeRectangle = (event) => {
        if (!isResizing || selectedRectIndex === null) return;
        const canvasCoords = getCanvasCoordinates(event);
        let rect = { ...rectangles[selectedRectIndex] };
        switch (resizingEdge) {
            case 'left':
                rect.width += rect.x - canvasCoords.x;
                rect.x = canvasCoords.x;
                break;
            case 'right':
                rect.width = canvasCoords.x - rect.x;
                break;
            case 'top':
                rect.height += rect.y - canvasCoords.y;
                rect.y = canvasCoords.y;
                break;
            case 'bottom':
                rect.height = canvasCoords.y - rect.y;
                break;
            default:
                break;
        }
        let newRectangles = [...rectangles];
        newRectangles[selectedRectIndex] = rect;
        setRectangles(newRectangles);
    };

    const endResizing = () => {
        setIsResizing(false);
        setResizingEdge(null);
    };

    // Handle panning
    const startPanning = (event) => {
        if (event.button !== 2) return; // Right click only
        setIsPanning(true);
        setLastPosition({ x: event.clientX, y: event.clientY });
    };

    const onPan = (event) => {
        if (!isPanning) return;
        const dx = event.clientX - lastPosition.x;
        const dy = event.clientY - lastPosition.y;
        setOffset({ x: offset.x + dx, y: offset.y + dy });
        setLastPosition({ x: event.clientX, y: event.clientY });
    };

    const endPanning = () => {
        setIsPanning(false);
    };

    // Zooming
    const handleScroll = useCallback((event) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Convert mouse position to canvas coordinates
        const canvasX = (mouseX - offset.x) / scale;
        const canvasY = (mouseY - offset.y) / scale;

        const delta = event.deltaY * -0.01;
        const newScale = Math.min(Math.max(1, scale + delta), 4); // Limiting scale between 1 and 4

        // Adjust offset to keep the mouse position stationary relative to the canvas
        const newOffsetX = mouseX - canvasX * newScale;
        const newOffsetY = mouseY - canvasY * newScale;

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });
    }, [scale, offset]);

    // Event listeners
    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', updateDrawing);
        canvas.addEventListener('mouseup', finishDrawing);
        canvas.addEventListener('mousedown', startPanning);
        window.addEventListener('mousemove', onPan);
        window.addEventListener('mouseup', endPanning);
        canvas.addEventListener('wheel', handleScroll);
        canvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent default right-click menu

        return () => {
            canvas.removeEventListener('mousedown', startDrawing);
            canvas.removeEventListener('mousemove', updateDrawing);
            canvas.removeEventListener('mouseup', finishDrawing);
            canvas.removeEventListener('mousedown', startPanning);
            window.removeEventListener('mousemove', onPan);
            window.removeEventListener('mouseup', endPanning);
            canvas.removeEventListener('wheel', handleScroll);
        };
    }, [handleScroll, startDrawing, updateDrawing, finishDrawing, startPanning, onPan, endPanning]);

    return <canvas ref={canvasRef} width={1600} height={800} />;
};

export default Canvas;
