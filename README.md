# 3D Voxel Shooter - Modular Game Engine

A polished, well-structured 3D voxel-based shooter game with a modular architecture designed for easy customization and expansion.

## Architecture Overview

The engine is split into modular systems, each with a specific responsibility:

### **physics.js** - Physics Engine
Handles collision detection and physics simulation.

**Key Classes:**
- `PhysicsEngine` - Main physics system
  - `update(delta)` - Update all physics bodies
  - `checkAABBCollision(box1, box2)` - AABB collision detection
  - `getVoxelBounds(position, size)` - Get voxel bounding box
  - `getSphereBounds(position, radius)` - Get sphere bounding box
  - `rayCastToVoxels(origin, direction, maxDistance, voxels)` - Raycast
  - `rayBoxIntersection(rayOrigin, rayDir, box)` - Ray-box intersection

**Usage:**
```javascript
const physics = new PhysicsEngine();
physics.addBody(bodyObject);
physics.update(deltaTime);
```

---

### **world.js** - World & Voxel Management
Manages terrain, structures, and voxel destruction with proper physics.

**Key Classes:**
- `World` - Voxel world manager
  - `createVoxel(position, color, size, dynamic, health)` - Create voxel
  - `removeVoxel(voxel)` - Remove voxel
  - `damageVoxel(voxel, damage)` - Damage voxel
  - `dropVoxel(voxel)` - Make static voxel fall (physics)
  - `isSupported(voxel)` - Check if voxel has ground support
  - `applyGravity()` - Apply gravity to unsupported voxels
  - `createStructure(x, y, z, width, height, depth, color)` - Build structure

**Pre-built Levels:**
- `LEVELS.basic` - Training ground with structures
- `LEVELS.maze` - Maze-like level
- `LEVELS.arena` - Arena with colored structures

**Usage:**
```javascript
const world = new World(scene, physics, "levelName");
world.createGround(40, 40);
world.createStructure(0, 0, 0, 3, 5, 3);
LEVELS.basic.build(world);
```

---

### **weapons.js** - Weapon System
Extensible weapon framework for creating new weapons.

**Key Classes:**
- `Weapon` - Base weapon class
  - `fire(origin, direction, projectiles, particles)` - Fire weapon
  - `createProjectile()` - Override for custom behavior
  - `getAmmoText()` - Get ammo display

**Built-in Weapons:**
- `BulletWeapon` - Standard rifle
- `ShotgunWeapon` - Multiple projectiles with spread
- `SniperWeapon` - High damage, slow fire rate
- `RocketWeapon` - Explosive projectiles
- `Projectile` - Projectile physics and collision

- `WeaponManager` - Manage multiple weapons
  - `addWeapon(weapon)` - Add weapon
  - `switchWeapon(index)` - Switch weapon
  - `fire(origin, direction, projectiles, particles)` - Fire current weapon

**Creating Custom Weapons:**
```javascript
class FlamethrowerWeapon extends Weapon {
    constructor() {
        super("Flamethrower", {
            fireRate: 0.05,
            damage: 0.5,
            projectileSpeed: 30,
            projectileSize: 0.25,
            projectileColor: 0xff4400
        });
        this.pelletsPerShot = 20;
    }

    createProjectile(origin, direction, projectiles, particles) {
        for (let i = 0; i < this.pelletsPerShot; i++) {
            const spreadDir = direction.clone();
            const angle = (Math.random() - 0.5) * Math.PI / 4;
            spreadDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

            projectiles.push(new Projectile(
                origin.clone(),
                spreadDir,
                {
                    speed: this.projectileSpeed,
                    size: this.projectileSize,
                    color: this.projectileColor,
                    damage: this.damage,
                    lifetime: 2,
                    weapon: this.name
                }
            ));
        }
    }
}

weaponManager.addWeapon(new FlamethrowerWeapon());
```

---

### **entities.js** - Game Entities
Player enemies, particles, and other game entities.

**Key Classes:**
- `Enemy` - Enemy made of multiple voxels
  - `update(delta, playerPos, particles)` - Update enemy
  - `takeDamage(amount, particles)` - Take damage
  - `destroy(particles)` - Destroy enemy
  - `getDistance(playerPos)` - Distance to player

- `Particle` - Visual particle effects
  - `update(delta)` - Update particle
  - `destroy()` - Remove particle

**Usage:**
```javascript
const enemy = new Enemy(position, world);
enemy.update(delta, playerPos, particles);
```

---

### **main.js** - Game Loop & Logic
Main game loop, collision detection, and game state.

**Key Functions:**
- `init()` - Initialize game
- `animate()` - Main render loop
- `updatePlayer(delta)` - Update player movement
- `updateEnemies(delta)` - Update enemy spawning
- `updateProjectiles(delta)` - Update bullets
- `updateParticles(delta)` - Update particles
- `checkCollisions()` - Handle collisions with proper physics
- `shoot()` - Fire weapon
- `startGame()` - Start game
- `endGame()` - End game

---

## Features

✅ **True 3D Rendering** with proper perspective and full camera freedom (look up/down)
✅ **Voxel Physics** - Destructible voxels that fall with gravity when unsupported
✅ **Collision Detection** - AABB and ray-based collision for all entities
✅ **Multi-voxel Enemies** - Enemies made of individual voxels
✅ **Extensible Weapon System** - Easy to add new weapons and projectiles
✅ **Level System** - Pre-built levels, easy to create custom ones
✅ **Proper Physics** - Gravity, velocity, and realistic projectile trajectories
✅ **Particle Effects** - Impact and explosion particles
✅ **Professional Graphics** - Shadows, lighting, fog, and materials
✅ **Wave System** - Progressive difficulty with increasing enemy spawns

---

## How to Add New Weapons

1. Extend the `Weapon` class:
```javascript
class LaserWeapon extends Weapon {
    constructor() {
        super("Laser", {
            fireRate: 0.1,
            damage: 2,
            projectileSpeed: 100,
            projectileSize: 0.15,
            projectileColor: 0x00ff00,
            projectileLife: 20
        });
    }
}
```

2. Add to weapon manager in `init()`:
```javascript
weaponManager.addWeapon(new LaserWeapon());
```

3. Bind to key (in `setupInput()`):
```javascript
if (e.key === '3') {
    weaponManager.switchWeapon(4);
}
```

---

## How to Create Custom Levels

1. Add level definition to `LEVELS` in world.js:
```javascript
LEVELS.myLevel = {
    name: "My Custom Level",
    build: function(world) {
        world.createGround(50, 50);
        world.createStructure(5, 0, 5, 4, 3, 4, 0xff0000);
        world.createStructure(-10, 0, 10, 3, 5, 3, 0x0000ff);
    }
};
```

2. Load level in `init()`:
```javascript
gameState.currentLevel = 'myLevel';
LEVELS[gameState.currentLevel].build(world);
```

---

## Physics System Details

### Voxel Gravity
When voxels are destroyed, adjacent voxels that lose support automatically fall:
```javascript
world.applyGravity();
```

### Collision Detection
- Ray-casting for precise projectile collision
- AABB for player-voxel collisions
- Sphere-sphere for enemy interactions

### Player Collision
- Ground collision with proper landing
- Side collision pushing player away from voxels
- Ceiling collision blocking upward movement

---

## Controls

- **WASD** - Move
- **Mouse** - Look around (up/down/left/right)
- **Left Click** - Shoot
- **Space** - Jump
- **ESC** - Pause
- **Number Keys** - Switch weapons (1-4)

---

## Performance Optimization

- Voxels use mesh grouping for efficiency
- Collision checks optimized with spatial hashing
- Physics updates capped at 60fps
- Gravity applied probabilistically

---

## File Structure

```
├── index.html          # Game HTML
├── style.css           # UI styling
├── physics.js          # Physics engine
├── world.js            # World & voxel system
├── weapons.js          # Weapon system
├── entities.js         # Game entities
├── main.js             # Game loop & logic
└── README.md           # Documentation
```

---

## Customization Examples

### Increase Weapon Damage
```javascript
weaponManager.weapons[0].damage = 2;
```

### Change Enemy Health
```javascript
this.health = 10;
this.maxHealth = 10;
```

### Adjust Player Speed
```javascript
const PLAYER_SPEED = 30;
```

### Modify Level Difficulty
```javascript
ENEMY_SPAWN_INTERVAL = 1000;
```

---

## License

Free to use and modify.
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