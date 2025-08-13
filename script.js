/**
 * Build or Boom Card Creator
 * Modular JavaScript Architecture
 */

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const CONFIG = {
  SHAPE_SIZES: {
    // 1x1 unit shapes (80x80px = 4x4 grid units)
    'square': { width: 80, height: 80 },
    'triangle': { width: 80, height: 80 },
    'half-moon': { width: 80, height: 80 },
    'cone': { width: 80, height: 40 },
    // 3x1 unit shapes (240x80px = 12x4 grid units) 
    '2x4': { width: 240, height: 80 },
    'arch': { width: 240, height: 80 },
    'beam': { width: 240, height: 80 },
    'foreman': { width: 160, height: 160 },
    // Special cases
    'barrel-cylinder': { width: 80, height: 160 },
    'barrel-circle': { width: 80, height: 80 }
  },
  GRID_SIZE: 20,
  MOBILE_BREAKPOINT: 768,
  DRAG_THRESHOLD: 5,
  LONG_PRESS_DELAY: 500,
  CONTEXT_MENU_TIMEOUT: 100,
  PRINT_DIMENSIONS: { width: 600, height: 900, scale: 2 }
};

const SHAPE_NAMES = {
  '2x4': '2x4',
  'triangle': 'Triangle', 
  'arch': 'Arch',
  'barrel-cylinder': 'Barrel',
  'barrel-circle': 'Barrel',
  'half-moon': 'Half Moon',
  'cone': 'Cone',
  'beam': 'Beam',
  'square': 'Square',
  'foreman': 'The Foreman'
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const Utils = {
  isMobile() {
    return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
  },

  generateId() {
    return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  snapToGrid(value) {
    const snapped = Math.round(value / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    console.log(`Snapping ${value} to ${snapped} (grid: ${CONFIG.GRID_SIZE})`);
    return snapped;
  },

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};

// =============================================================================
// EVENT SYSTEM
// =============================================================================

class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
}

const eventBus = new EventEmitter();

// =============================================================================
// SHAPE MANAGEMENT
// =============================================================================

class ShapeFactory {
  static getDefinition(shapeType) {
    const paletteItem = document.querySelector(`[data-shape="${shapeType}"]`);
    if (!paletteItem) return null;
    
    const svg = paletteItem.querySelector('.shape-svg');
    if (!svg) return null;
    
    const shapeSize = CONFIG.SHAPE_SIZES[shapeType] || { width: 80, height: 80 };
    
    return {
      svg: svg.innerHTML,
      ...shapeSize
    };
  }

  static create(shapeType, x, y, container) {
    const shapeData = this.getDefinition(shapeType);
    if (!shapeData) return null;

    const id = Utils.generateId();
    const element = document.createElement('div');
    
    element.className = 'dropped-shape';
    element.id = id;
    element.dataset.shapeType = shapeType;
    
    // Position shape - allow full height usage and snap to grid
    const rawBoundedX = Math.max(0, Math.min(x, container.clientWidth - shapeData.width));
    const rawBoundedY = Math.max(0, y); // No upper bound - allow shapes to extend below container
    
    const snappedX = Utils.snapToGrid(rawBoundedX);
    const snappedY = Utils.snapToGrid(rawBoundedY);
    
    console.log(`Shape ${shapeType}: raw(${x}, ${y}) -> bounded(${rawBoundedX}, ${rawBoundedY}) -> snapped(${snappedX}, ${snappedY})`);
    
    element.style.left = `${snappedX}px`;
    element.style.top = `${snappedY}px`;

    // Create unique SVG with updated IDs
    const uniqueSvg = this.createUniqueSvg(shapeData.svg, id, shapeData);
    element.innerHTML = uniqueSvg;

    return element;
  }

  static createUniqueSvg(svgContent, id, { width, height }) {
    const updatedContent = svgContent
      .replace(/id="([^"]*Preview)"/g, `id="$1${id}"`)
      .replace(/url\\(#([^)]*Preview)\\)/g, `url(#$1${id})`)
      .replace(/id="(hatch\\w+)"/g, `id="$1${id}"`)
      .replace(/url\\(#(hatch\\w+)\\)/g, `url(#$1${id})`)
      .replace(/id="(archMask)"/g, `id="$1${id}"`)
      .replace(/url\\(#(archMask)\\)/g, `url(#$1${id})`);
    
    // Use appropriate viewBox based on shape dimensions
    const viewBoxWidth = width;
    const viewBoxHeight = height;
    
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">${updatedContent}</svg>`;
  }
}

class SupplyListManager {
  constructor() {
    this.container = document.getElementById('supply-list-content');
  }

  update() {
    const shapes = document.querySelectorAll('.dropped-shape');
    const counts = this.countShapes(shapes);
    this.render(counts);
  }

  countShapes(shapes) {
    const counts = {};
    shapes.forEach(shape => {
      const shapeType = shape.dataset.shapeType;
      const displayName = SHAPE_NAMES[shapeType] || 'Unknown';
      counts[displayName] = (counts[displayName] || 0) + 1;
    });
    return counts;
  }

  render(counts) {
    const html = Object.entries(counts)
      .map(([name, count]) => `
        <div class="supply-list-item">
          <span>${count} - ${name}</span>
        </div>
      `).join('');
    
    this.container.innerHTML = html;
  }
}

// =============================================================================
// DRAG & DROP SYSTEM  
// =============================================================================

class DragDropManager {
  constructor() {
    this.draggedElement = null;
    this.touchDraggedElement = null;
    this.touchStartPos = null;
    this.isDragging = false;
    this.init();
  }

  init() {
    this.setupPaletteItems();
    this.setupBuildArea();
  }

  setupPaletteItems() {
    const shapeItems = document.querySelectorAll('.shape-item');
    
    shapeItems.forEach(item => {
      // Mouse drag
      item.addEventListener('dragstart', e => this.handleDragStart(e));
      item.addEventListener('dragend', e => this.handleDragEnd(e));
      
      // Click/tap to add shape (mobile-friendly)
      item.addEventListener('click', e => this.handleTapToAdd(e));
      
      // Touch drag
      item.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
      item.addEventListener('touchmove', e => this.handleTouchMove(e), { passive: false });
      item.addEventListener('touchend', e => this.handleTouchEnd(e), { passive: false });
    });
  }

  setupBuildArea() {
    const buildArea = document.getElementById('build-area');
    
    buildArea.addEventListener('dragover', e => this.handleDragOver(e));
    buildArea.addEventListener('drop', e => this.handleDrop(e));
    buildArea.addEventListener('dragenter', e => this.handleDragEnter(e));
    buildArea.addEventListener('dragleave', e => this.handleDragLeave(e));
  }

  handleDragStart(e) {
    this.draggedElement = e.currentTarget;
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.shape);
    e.dataTransfer.effectAllowed = 'copy';
  }

  handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    this.draggedElement = null;
  }

  handleTouchStart(e) {
    this.touchDraggedElement = e.currentTarget;
    const touch = e.touches[0];
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    this.isDragging = false;
    e.currentTarget.style.opacity = '0.7';
    e.preventDefault();
  }

  handleTouchMove(e) {
    if (!this.touchDraggedElement) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartPos.x);
    const deltaY = Math.abs(touch.clientY - this.touchStartPos.y);
    
    // If moved more than threshold, consider it a drag
    if (deltaX > CONFIG.DRAG_THRESHOLD || deltaY > CONFIG.DRAG_THRESHOLD) {
      this.isDragging = true;
    }
    
    e.preventDefault();
  }

  handleTouchEnd(e) {
    if (!this.touchDraggedElement) return;
    
    // If it was a drag operation, handle the drop
    if (this.isDragging) {
      const touch = e.changedTouches[0];
      const buildArea = document.getElementById('build-area');
      const rect = buildArea.getBoundingClientRect();
      
      if (this.isOverBuildArea(touch, rect)) {
        const shapeType = this.touchDraggedElement.dataset.shape;
        const shapeSize = CONFIG.SHAPE_SIZES[shapeType] || { width: 80, height: 80 };
        const rawX = touch.clientX - rect.left - shapeSize.width / 2;
        const rawY = touch.clientY - rect.top - shapeSize.height / 2;
        
        const x = Utils.snapToGrid(rawX);
        const y = Utils.snapToGrid(rawY);
        
        this.createShape(shapeType, x, y, buildArea);
      }
    } else {
      // If it was just a tap (no dragging), handle tap-to-add directly
      this.handleTapToAddTouch(this.touchDraggedElement);
    }
    
    this.touchDraggedElement.style.opacity = '1';
    this.touchDraggedElement = null;
    this.touchStartPos = null;
    this.isDragging = false;
  }

  handleTapToAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const buildArea = document.getElementById('build-area');
    const shapeType = e.currentTarget.dataset.shape;
    
    if (!buildArea || !shapeType) return;
    
    // Get build area dimensions
    const rect = buildArea.getBoundingClientRect();
    
    // Place shape in center of build area
    const shapeSize = CONFIG.SHAPE_SIZES[shapeType] || { width: 80, height: 80 };
    const centerX = (rect.width / 2) - (shapeSize.width / 2);
    const centerY = (rect.height / 2) - (shapeSize.height / 2);
    
    // Add slight random offset so multiple taps don't stack exactly
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    
    const finalX = Utils.snapToGrid(centerX + offsetX);
    const finalY = Utils.snapToGrid(centerY + offsetY);
    
    this.createShape(shapeType, finalX, finalY, buildArea);
    
    // Provide visual feedback
    const targetElement = e.currentTarget;
    targetElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
      targetElement.style.transform = '';
    }, 150);
  }

  handleTapToAddTouch(element) {
    const buildArea = document.getElementById('build-area');
    const shapeType = element.dataset.shape;
    
    if (!buildArea || !shapeType) return;
    
    // Get build area dimensions
    const rect = buildArea.getBoundingClientRect();
    
    // Place shape in center of build area
    const shapeSize = CONFIG.SHAPE_SIZES[shapeType] || { width: 80, height: 80 };
    const centerX = (rect.width / 2) - (shapeSize.width / 2);
    const centerY = (rect.height / 2) - (shapeSize.height / 2);
    
    // Add slight random offset so multiple taps don't stack exactly
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    
    const finalX = Utils.snapToGrid(centerX + offsetX);
    const finalY = Utils.snapToGrid(centerY + offsetY);
    
    this.createShape(shapeType, finalX, finalY, buildArea);
    
    // Provide visual feedback
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 150);
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  }

  handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    const shapeType = e.dataTransfer.getData('text/plain');
    const rect = e.currentTarget.getBoundingClientRect();
    const shapeSize = CONFIG.SHAPE_SIZES[shapeType] || { width: 80, height: 80 };
    const rawX = e.clientX - rect.left - shapeSize.width / 2;
    const rawY = e.clientY - rect.top - shapeSize.height / 2;

    const x = Utils.snapToGrid(rawX);
    const y = Utils.snapToGrid(rawY);

    this.createShape(shapeType, x, y, e.currentTarget);
  }

  isOverBuildArea(touch, rect) {
    return touch.clientX >= rect.left && 
           touch.clientX <= rect.right &&
           touch.clientY >= rect.top && 
           touch.clientY <= rect.bottom;
  }

  createShape(shapeType, x, y, container) {
    const shape = ShapeFactory.create(shapeType, x, y, container);
    if (!shape) {
      console.log('Shape creation failed');
      return;
    }

    container.appendChild(shape);
    
    // Initialize shape behaviors and store reference to prevent garbage collection
    try {
      shape._controller = new ShapeController(shape, container);
    } catch (error) {
    }
    
    eventBus.emit('shapeAdded', { shape, shapeType });
  }
}

// =============================================================================
// SHAPE BEHAVIOR CONTROLLER
// =============================================================================

class ShapeController {
  constructor(element, container) {
    this.element = element;
    this.container = container;
    this.isDragging = false;
    this.hasDragged = false;
    this.startPos = null;
    
    this.init();
  }

  init() {
    this.setupMovement();
    this.setupRotation();
    this.setupSelection();
  }

  setupMovement() {
    // Bind methods to preserve 'this' context
    this.boundHandleMove = this.handleMove.bind(this);
    this.boundHandleMoveEnd = this.handleMoveEnd.bind(this);
    
    // Get the actual shape elements (polygon, path, rect, circle, ellipse) within the SVG
    const shapeElements = this.element.querySelectorAll('svg polygon, svg path, svg rect, svg circle, svg ellipse');
    
    shapeElements.forEach(shapeEl => {
      // Mouse events on actual shape elements only
      shapeEl.addEventListener('mousedown', e => {
        this.handleMoveStart(e);
      });

      // Touch events on actual shape elements only
      shapeEl.addEventListener('touchstart', e => {
        this.handleMoveStart(e);
      }, { passive: false });
    });
  }

  setupRotation() {
    // Get the actual shape elements for context menu
    const shapeElements = this.element.querySelectorAll('svg polygon, svg path, svg rect, svg circle, svg ellipse');
    
    shapeElements.forEach(shapeEl => {
      shapeEl.addEventListener('contextmenu', e => {
        e.preventDefault();
        this.rotate();
      });
    });
  }

  setupSelection() {
    // Click/tap detection happens in handleMoveEnd when no drag occurred
  }

  handleMoveStart(e) {
    this.isDragging = true;
    this.hasDragged = false;
    this.startEvent = e;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    this.startX = clientX;
    this.startY = clientY;
    this.initialX = parseInt(this.element.style.left) || 0;
    this.initialY = parseInt(this.element.style.top) || 0;

    this.element.style.cursor = 'grabbing';
    this.element.style.zIndex = '100';
    
    // Add global listeners for this drag operation
    document.addEventListener('mousemove', this.boundHandleMove);
    document.addEventListener('mouseup', this.boundHandleMoveEnd);
    document.addEventListener('touchmove', this.boundHandleMove, { passive: false });
    document.addEventListener('touchend', this.boundHandleMoveEnd);
    
    e.preventDefault();
  }

  handleMove(e) {
    if (!this.isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;  
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - this.startX;
    const dy = clientY - this.startY;
    
    if (Math.abs(dx) > CONFIG.DRAG_THRESHOLD || Math.abs(dy) > CONFIG.DRAG_THRESHOLD) {
      this.hasDragged = true;
      
      // Calculate new position
      const rawX = this.initialX + dx;
      const rawY = this.initialY + dy;
      
      // Snap to grid
      const snappedX = Utils.snapToGrid(rawX);
      const snappedY = Utils.snapToGrid(rawY);
      
      // Allow shapes to use full height - only prevent going above container
      const shapeType = this.element.dataset.shapeType;
      const shapeSize = CONFIG.SHAPE_SIZES[shapeType] || { width: 80, height: 80 };
      const newX = Math.max(0, Math.min(snappedX, this.container.clientWidth - shapeSize.width));
      const newY = Math.max(0, snappedY); // No upper bound - allow shapes to extend below container

      this.element.style.left = `${newX}px`;
      this.element.style.top = `${newY}px`;
    }
    
    e.preventDefault();
  }

  handleMoveEnd() {
    if (this.isDragging) {
      this.isDragging = false;
      this.element.style.cursor = 'move';
      this.element.style.zIndex = '10';
      
      // Remove global listeners
      document.removeEventListener('mousemove', this.boundHandleMove);
      document.removeEventListener('mouseup', this.boundHandleMoveEnd);
      document.removeEventListener('touchmove', this.boundHandleMove);
      document.removeEventListener('touchend', this.boundHandleMoveEnd);
      
      if (!this.hasDragged && this.startEvent) {
        // This was a click/tap - handle selection and context menu
        this.handleClick();
      }
      
      this.hasDragged = false;
      this.startEvent = null;
    }
  }

  handleClick() {
    // Clear other selections
    document.querySelectorAll('.dropped-shape').forEach(shape => {
      shape.classList.remove('selected');
    });
    
    // Select this shape  
    this.element.classList.add('selected');
    
    // Show context menu
    let clientX, clientY;
    
    if (this.startEvent.type === 'touchstart') {
      // For touch events, use the original touch position stored during touchstart
      clientX = this.startX;
      clientY = this.startY;
    } else {
      // For mouse events
      clientX = this.startEvent.clientX;
      clientY = this.startEvent.clientY;
    }
    
    // Add small delay for mobile to ensure touch events are done
    setTimeout(() => {
      eventBus.emit('showContextMenu', {
        shape: this.element,
        x: clientX,
        y: clientY
      });
    }, 50);
  }

  rotate() {
    let currentRotation = parseInt(this.element.dataset.rotation || '0');
    currentRotation = (currentRotation + 90) % 360;
    this.element.dataset.rotation = currentRotation;

    const svg = this.element.querySelector('svg');
    svg.style.transform = `rotate(${currentRotation}deg)`;
    svg.style.transformOrigin = 'center center';
  }

  flip(direction) {
    const svg = this.element.querySelector('svg');
    let currentTransform = svg.style.transform || '';
    
    const rotateMatch = currentTransform.match(/rotate\\(([^)]+)\\)/);
    const scaleMatch = currentTransform.match(/scale\\(([^)]+)\\)/);
    
    const rotation = rotateMatch ? rotateMatch[1] : '0deg';
    let scaleX = 1, scaleY = 1;
    
    if (scaleMatch) {
      const scaleValues = scaleMatch[1].split(',').map(v => parseFloat(v.trim()));
      scaleX = scaleValues[0] || 1;
      scaleY = scaleValues[1] || scaleX;
    }
    
    if (direction === 'horizontal') {
      scaleX *= -1;
      this.element.dataset.flippedH = scaleX < 0 ? 'true' : 'false';
    } else if (direction === 'vertical') {
      scaleY *= -1; 
      this.element.dataset.flippedV = scaleY < 0 ? 'true' : 'false';
    }
    
    svg.style.transform = `rotate(${rotation}) scale(${scaleX}, ${scaleY})`;
    svg.style.transformOrigin = 'center center';
  }

  destroy() {
    this.element.remove();
    eventBus.emit('shapeRemoved', { shape: this.element });
  }
}

// =============================================================================
// CONTEXT MENU SYSTEM
// =============================================================================

class ContextMenuManager {
  constructor() {
    this.menu = null;
    this.currentShape = null;
    this.init();
  }

  init() {
    eventBus.on('showContextMenu', data => this.show(data.shape, data.x, data.y));
  }

  show(shape, x, y) {
    this.hide();
    
    if (!this.menu) {
      this.menu = this.createMenu();
    }
    
    this.currentShape = shape;
    
    // Position menu
    this.menu.style.left = x + 'px';
    this.menu.style.top = y + 'px';
    
    // Adjust for screen bounds
    requestAnimationFrame(() => {
      const rect = this.menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = x, newY = y;
      
      if (rect.right > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }
      if (rect.bottom > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }
      
      this.menu.style.left = newX + 'px';
      this.menu.style.top = newY + 'px';
      this.menu.classList.add('show');
    });
    
    // Setup outside click
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
      document.addEventListener('touchstart', this.handleOutsideClick);
    }, CONFIG.CONTEXT_MENU_TIMEOUT);
  }

  hide() {
    if (this.menu) {
      this.menu.classList.remove('show');
      this.currentShape = null;
      
      document.removeEventListener('click', this.handleOutsideClick);
      document.removeEventListener('touchstart', this.handleOutsideClick);
    }
  }

  handleOutsideClick = (e) => {
    if (this.menu && !this.menu.contains(e.target) && !e.target.closest('.dropped-shape')) {
      this.hide();
    }
  }

  createMenu() {
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      min-width: 150px;
      padding: 8px 0;
    `;
    
    // Style the menu items
    const itemStyle = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      font-size: 14px;
      color: #333;
    `;
    
    menu.innerHTML = `
      <button class="context-menu-item" data-action="rotate" style="${itemStyle}">
        <svg class="context-menu-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
          <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6z"/>
          <path d="M18.76 7.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
        </svg>
        Rotate 90°
      </button>
      <button class="context-menu-item" data-action="flip-horizontal" style="${itemStyle}">
        <svg class="context-menu-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
          <path d="M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 2h2V3h-2v2zm4 14h2v-2h-2v2zm0-4h2v-2h-2v2zm0-4h2V9h-2v2z"/>
        </svg>
        Flip Horizontal
      </button>
      <button class="context-menu-item" data-action="flip-vertical" style="${itemStyle}">
        <svg class="context-menu-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
          <path d="M16 17h2v-2h-2v2zm1.5-10H16V5h1.5v2zm2.5 6V7.5h-2V9h2zm-13-6v2H5V7h2zm2.5 10H9v-2h1.5v2zM12 18.5v-2h-2v2h2zM9 5v2h2V5H9zm10 0V3c1.1 0 2 .9 2 2h-2zm0 12h2v-2h-2v2zm0-8h2V7h-2v2zm0 4h2v-2h-2v2zM5 21v-8H3v10c0 1.1.9 2 2 2h8v-2H5v-2z"/>
        </svg>
        Flip Vertical
      </button>
      <button class="context-menu-item destructive" data-action="delete" style="${itemStyle} color: #dc2626;">
        <svg class="context-menu-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px;">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Delete
      </button>
    `;
    
    menu.addEventListener('click', e => this.handleAction(e));
    document.body.appendChild(menu);
    
    return menu;
  }

  handleAction(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const button = e.target.closest('.context-menu-item');
    if (!button || !this.currentShape) return;
    
    const action = button.dataset.action;
    const shapeController = this.getShapeController(this.currentShape);
    
    switch (action) {
      case 'rotate':
        shapeController.rotate();
        break;
      case 'flip-horizontal':
        shapeController.flip('horizontal');
        break;
      case 'flip-vertical':
        shapeController.flip('vertical');
        break;
      case 'delete':
        shapeController.destroy();
        break;
    }
    
    this.hide();
  }

  getShapeController(element) {
    // Return a basic controller interface for the shape
    return {
      rotate: () => {
        let currentRotation = parseInt(element.dataset.rotation || '0');
        currentRotation = (currentRotation + 90) % 360;
        element.dataset.rotation = currentRotation;

        const svg = element.querySelector('svg');
        svg.style.transform = `rotate(${currentRotation}deg)`;
        svg.style.transformOrigin = 'center center';
      },
      flip: (direction) => {
        const svg = element.querySelector('svg');
        let currentTransform = svg.style.transform || '';
        
        const rotateMatch = currentTransform.match(/rotate\\(([^)]+)\\)/);
        const scaleMatch = currentTransform.match(/scale\\(([^)]+)\\)/);
        
        const rotation = rotateMatch ? rotateMatch[1] : '0deg';
        let scaleX = 1, scaleY = 1;
        
        if (scaleMatch) {
          const scaleValues = scaleMatch[1].split(',').map(v => parseFloat(v.trim()));
          scaleX = scaleValues[0] || 1;
          scaleY = scaleValues[1] || scaleX;
        }
        
        if (direction === 'horizontal') {
          scaleX *= -1;
        } else if (direction === 'vertical') {
          scaleY *= -1;
        }
        
        svg.style.transform = `rotate(${rotation}) scale(${scaleX}, ${scaleY})`;
        svg.style.transformOrigin = 'center center';
      },
      destroy: () => {
        element.remove();
        eventBus.emit('shapeRemoved');
      }
    };
  }
}

// =============================================================================
// DIFFICULTY SYSTEM
// =============================================================================

class DifficultyManager {
  constructor() {
    this.currentLevel = 1;
    this.hammersContainer = document.getElementById('difficulty-hammers');
    this.init();
  }

  init() {
    this.setupButtons();
    this.updateDisplay();
  }

  setupButtons() {
    const buttons = document.querySelectorAll('.difficulty-btn');
    const description = document.getElementById('difficulty-desc');
    
    const descriptions = {
      1: 'Easy: Use any shapes, no limits',
      2: 'Medium: Moderate challenge', 
      3: 'Hard: Maximum challenge'
    };
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const level = parseInt(btn.dataset.difficulty);
        
        // Update active button
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update difficulty
        this.currentLevel = level;
        description.textContent = descriptions[level];
        this.updateDisplay();
      });
    });
  }

  updateDisplay() {
    let hammerIcons = '';
    
    for (let i = 0; i < this.currentLevel; i++) {
      hammerIcons += `
        <svg class="difficulty-hammer w-6 h-6 lg:w-7 lg:h-7 opacity-90" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <g transform="rotate(45 16 16)" fill="none" stroke="white" stroke-width="1.5">
            <rect x="8" y="12" width="16" height="6" fill="white" />
            <rect x="6" y="10" width="4" height="10" fill="white" />
            <rect x="14" y="18" width="3" height="18" fill="#8B4513" />
          </g>
        </svg>
      `;
    }
    
    this.hammersContainer.innerHTML = hammerIcons;
  }
}

// =============================================================================
// MOBILE UI SYSTEM
// =============================================================================

class MobileUIManager {
  constructor() {
    this.isCollapsed = false;
    this.init();
  }

  init() {
    this.setupCollapse();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    if (Utils.isMobile()) {
      this.collapseByDefault();
    } else {
      this.expandByDefault();
    }
  }

  expandByDefault() {
    const collapseBtn = document.getElementById('collapse-btn');
    const content = document.getElementById('collapsible-content');
    
    if (collapseBtn && content) {
      collapseBtn.classList.remove('collapsed');
      content.classList.remove('collapsed');
      this.isCollapsed = false;
    }
  }

  setupCollapse() {
    const collapseBtn = document.getElementById('collapse-btn');
    const content = document.getElementById('collapsible-content');
    
    if (!collapseBtn || !content) return;
    
    collapseBtn.addEventListener('click', () => {
      this.toggle();
    });
  }

  collapseByDefault() {
    const collapseBtn = document.getElementById('collapse-btn');
    const content = document.getElementById('collapsible-content');
    
    if (collapseBtn && content) {
      collapseBtn.classList.add('collapsed');
      content.classList.add('collapsed');
      this.isCollapsed = true;
    }
  }

  toggle() {
    const collapseBtn = document.getElementById('collapse-btn');
    const content = document.getElementById('collapsible-content');
    
    if (this.isCollapsed) {
      collapseBtn.classList.remove('collapsed');
      content.classList.remove('collapsed');
    } else {
      collapseBtn.classList.add('collapsed');
      content.classList.add('collapsed');
    }
    
    this.isCollapsed = !this.isCollapsed;
  }
}

// =============================================================================
// PRINT SYSTEM
// =============================================================================

class PrintManager {
  constructor() {
    this.init();
  }

  init() {
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
      printBtn.addEventListener('click', () => this.handlePrint());
    }
  }

  async handlePrint() {
    // Hide any open context menus
    eventBus.emit('hideContextMenu');
    
    if (Utils.isMobile()) {
      await this.captureAsImage();
    } else {
      window.print();
    }
  }

  async captureAsImage() {
    const card = document.querySelector('.blueprint-card');
    
    try {
      // Load html2canvas if needed
      if (typeof html2canvas === 'undefined') {
        await Utils.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      }
      
      const canvas = await html2canvas(card, {
        width: CONFIG.PRINT_DIMENSIONS.width,
        height: CONFIG.PRINT_DIMENSIONS.height,
        scale: CONFIG.PRINT_DIMENSIONS.scale,
        backgroundColor: '#4a90e2',
        logging: false
      });
      
      canvas.toBlob(blob => {
        this.saveImage(blob);
      }, 'image/png');
      
    } catch (error) {
      console.error('Error capturing card:', error);
      this.showFallbackInstructions();
    }
  }

  async saveImage(blob) {
    const filename = `build-or-boom-card-${Date.now()}.png`;
    
    // Try native sharing first
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Build or Boom Card'
          });
          return;
        }
      } catch (error) {
        // Fall through to download
      }
    }
    
    // Fallback to download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  showFallbackInstructions() {
    alert('To save this card:\\n\\n1. Take a screenshot of the card\\n2. Crop to just the blue card area\\n3. Save to your photos\\n\\nOr use a desktop browser for printing.');
  }
}

// =============================================================================
// CARD NAMING SYSTEM
// =============================================================================

class CardNamingManager {
  constructor() {
    this.input = document.getElementById('card-name');
    this.init();
  }

  init() {
    if (!this.input) return;
    
    this.input.addEventListener('input', e => {
      e.target.value = e.target.value.toUpperCase();
    });
    
    this.input.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });
  }
}

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

class KeyboardManager {
  constructor() {
    this.init();
  }

  init() {
    document.addEventListener('keydown', e => this.handleKeydown(e));
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'Escape':
        this.clearAllShapes();
        break;
      case 'Delete':
      case 'Backspace':
        this.deleteSelectedShape();
        break;
    }
  }

  clearAllShapes() {
    const buildArea = document.getElementById('build-area');
    const shapes = buildArea.querySelectorAll('.dropped-shape');
    shapes.forEach(shape => shape.remove());
    eventBus.emit('shapesCleared');
  }

  deleteSelectedShape() {
    const selected = document.querySelector('.dropped-shape.selected');
    if (selected) {
      selected.remove();
      eventBus.emit('shapeRemoved');
    }
  }
}

// =============================================================================
// APPLICATION CONTROLLER
// =============================================================================

class CardCreatorApp {
  constructor() {
    this.managers = {};
    this.init();
  }

  init() {
    // Initialize all managers
    this.managers.supplyList = new SupplyListManager();
    this.managers.dragDrop = new DragDropManager();
    this.managers.contextMenu = new ContextMenuManager();
    this.managers.difficulty = new DifficultyManager();
    this.managers.mobileUI = new MobileUIManager();
    this.managers.print = new PrintManager();
    this.managers.cardNaming = new CardNamingManager();
    this.managers.keyboard = new KeyboardManager();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Show initial instructions
    this.showInstructions();
  }

  setupEventListeners() {
    eventBus.on('shapeAdded', () => {
      this.managers.supplyList.update();
    });
    
    eventBus.on('shapeRemoved', () => {
      this.managers.supplyList.update();
    });
    
    eventBus.on('shapesCleared', () => {
      this.managers.supplyList.update();
    });
    
    eventBus.on('hideContextMenu', () => {
      this.managers.contextMenu.hide();
    });
    
    // Clear all button
    const clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.managers.keyboard.clearAllShapes();
      });
    }
  }

  showInstructions() {
    const instructions = `
Build or Boom Card Creator Instructions:

1. Drag shapes from the left panel onto the blue blueprint card
2. Move shapes around by clicking and dragging them
3. Long press (mobile) or right-click (desktop) any shape for options
4. Use the context menu to rotate, flip, or delete shapes
5. Click any shape to select it, then press Delete to remove
6. Enter a name for your card at the bottom
7. Press ESC to clear all shapes

Have fun building!
    `;
    console.log(instructions);
  }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  new CardCreatorApp();
});