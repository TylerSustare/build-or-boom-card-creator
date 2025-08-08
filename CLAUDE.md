# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Build or Boom Card Creator** - a **mobile-first web application** for creating printable 4" x 6" blueprint-style cards. It's a client-side only web application built with vanilla HTML, CSS, and JavaScript designed primarily for mobile devices, where users tap shapes to add them to a blueprint card design, customize them with touch gestures, and save the cards as images.

**Primary Target**: Mobile devices (phones/tablets)  
**Secondary**: Desktop browsers with mouse interaction

## Architecture

### Core Components

The application uses a modular JavaScript architecture with several key managers:

- **ShapeFactory** (`script.js:113-163`): Creates and manages shape instances with unique SVG IDs
- **DragDropManager** (`script.js:202-389`): Handles all drag/drop interactions and touch events
- **ShapeController** (`script.js:395-579`): Controls individual shape behavior (movement, rotation, flipping)
- **ContextMenuManager** (`script.js:585-760`): Manages right-click/long-press context menus
- **SupplyListManager** (`script.js:165-196`): Updates the shape count display
- **DifficultyManager** (`script.js:766-821`): Controls difficulty levels and restrictions
- **PrintManager** (`script.js:900-981`): Handles printing and mobile image capture
- **EventEmitter** (`script.js:82-107`): Central event system for component communication

### Key Features

- **Mobile-First Interaction**: Tap shapes to add to card, touch drag to move, long-press for options
- **Touch Gestures**: Optimized for finger/touch interaction on mobile devices  
- **Shape Manipulation**: Tap to select, long-press for context menu with rotate, flip, delete
- **Mobile Image Capture**: Primary output method saves cards as PNG images on mobile
- **Grid Snapping**: 20px grid alignment for precise placement
- **Desktop Fallback**: Drag/drop and right-click support for desktop browsers
- **Difficulty Levels**: 3 difficulty settings (currently visual only)

### File Structure

- `index.html` - Main HTML structure with embedded CSS and Tailwind
- `script.js` - All JavaScript logic in modular classes
- `Dockerfile` - Nginx-based container for deployment
- `fly.toml` - Fly.io deployment configuration

## Development Commands

This is a static web application with no build process. Development commands:

### Local Development
```bash
# Serve locally (any static server)
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

### Deployment
```bash
# Deploy to Fly.io
fly deploy
```

### Docker
```bash
# Build and run locally
docker build -t card-creator .
docker run -p 8080:80 card-creator
```

## Code Patterns

### Adding New Shapes
1. Add shape definition to the shapes grid in `index.html` around line 287
2. Add shape name to `SHAPE_NAMES` constant in `script.js:20-31`
3. Ensure unique SVG patterns and IDs to avoid conflicts

### Event System
Uses a central `eventBus` for component communication:
- `shapeAdded` - Fired when shapes are created
- `shapeRemoved` - Fired when shapes are deleted
- `shapesCleared` - Fired when all shapes are cleared
- `showContextMenu` - Show context menu for a shape
- `hideContextMenu` - Hide any open context menu

### Mobile vs Desktop
The app detects mobile using `Utils.isMobile()` (checks `window.innerWidth <= 768`) and provides different UX:
- **Mobile (Primary)**: Tap to add shapes, touch drag to move, long-press for context menus, image capture for saving
- **Desktop (Fallback)**: Drag/drop with right-click context menus, browser printing

**Mobile Implementation**: Touch events are handled separately from click events. The `handleTouchEnd()` method detects taps vs drags and calls `handleTapToAddTouch()` directly for tap-to-add functionality, avoiding conflicts with click event handling.

### Shape Management
Each shape element gets a `ShapeController` instance stored as `element._controller`. This handles:
- Movement with grid snapping
- Rotation in 90-degree increments
- Horizontal/vertical flipping
- Click detection vs drag detection

## Important Technical Details

- **SVG Pattern Conflicts**: The `ShapeFactory.createUniqueSvg()` method ensures SVG pattern IDs are unique across instances
- **Touch Events**: Extensive touch event handling with `passive: false` for proper mobile interaction
- **Memory Management**: Shape controllers are stored as element properties to prevent garbage collection
- **Print Styles**: Custom CSS media queries optimize for 4" x 6" card printing
- **Grid System**: All positioning uses 20px grid snapping for alignment