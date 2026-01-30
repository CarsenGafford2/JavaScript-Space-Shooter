# Voxel FPS Shooter

A 3D voxel-based first-person shooter game built with JavaScript and a custom 3D rendering engine.

## Features

- **Voxel-Based World**: Fully destructible environment made of voxel blocks
- **3D FPS Gameplay**: First-person perspective with smooth camera controls
- **Enemy AI**: Red voxel enemies that chase and attack the player
- **Shooting Mechanics**: Click to shoot enemies and destroy voxel structures
- **Intuitive Controls**: WASD movement, mouse look, spacebar to jump
- **Score System**: Earn points by destroying enemies (100 pts) and structures (10 pts)
- **Health System**: Avoid enemies or you'll take damage
- **Beautiful UI**: Gradient menu, HUD with stats, and crosshair

## Controls

- **WASD** - Move around the world
- **Mouse** - Look around (pointer lock)
- **Left Click** - Shoot
- **Space** - Jump
- **ESC** - Pause/Unpause

## How to Play

1. Open `index.html` in a modern web browser
2. Click "Click to Start" to begin
3. Move around and shoot the red enemies before they reach you
4. Destroy the brown/gray voxel structures for points
5. Try to survive as long as possible and get the highest score!

## Technical Details

- Built with vanilla JavaScript (no external dependencies)
- Custom lightweight 3D rendering engine (`engine3d.js`)
- Canvas-based 3D projection with depth sorting
- Raycasting for shooting mechanics and collision detection
- Responsive design that works on different screen sizes

## Screenshots

### Main Menu
![Main Menu](https://github.com/user-attachments/assets/9f76904a-c40c-4db9-8124-fa189612cbd2)

### Gameplay
![Gameplay](https://github.com/user-attachments/assets/de6105c0-e609-470e-a29d-c996072abac7)

### In Action
![In Action](https://github.com/user-attachments/assets/b7bb3623-5299-4bc4-889c-701cc087f5dd)

## Running Locally

Simply open `index.html` in your browser, or use a local web server:

```bash
# Using Python 3
python3 -m http.server 8080

# Using Node.js
npx http-server -p 8080
```

Then navigate to `http://localhost:8080` in your browser.

## License

MIT License - Feel free to use and modify!