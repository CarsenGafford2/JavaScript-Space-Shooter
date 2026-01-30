# 3D VOXEL SHOOTER ENGINE - COMPLETE DOCUMENTATION

## System Overview

This is a **production-ready, modular game engine** built with Three.js. It's designed for easy customization and expansion while maintaining clean separation of concerns.

---

## Module Breakdown

### 1. **physics.js** - Physics Engine
**Purpose:** Handle collision detection, physics simulation, and body management

**Key Methods:**
- `update(delta)` - Updates all physics bodies with gravity
- `addBody(body)` - Register physics body
- `removeBody(body)` - Unregister physics body
- `checkAABBCollision(box1, box2)` - AABB collision test
- `checkSphereCollision(pos1, r1, pos2, r2)` - Sphere collision test
- `rayBoxIntersection(rayOrigin, rayDir, box)` - Ray-box intersection
- `getVoxelBounds(position, size)` - Get voxel AABB
- `getSphereBounds(position, radius)` - Get sphere AABB

**Usage Pattern:**
```javascript
const physics = new PhysicsEngine();
physics.addBody({
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    dynamic: true,
    lifetime: undefined
});
physics.update(deltaTime);
```

**Customization:**
- Change gravity: `physics.gravity.y = -50`
- Adjust damping: `physics.damping = 0.95`
- Add custom collision layers for performance

---

### 2. **world.js** - World & Voxel Management
**Purpose:** Manage terrain, voxel creation/destruction, and voxel physics

**Key Methods:**
- `createVoxel(position, color, size, dynamic, health)` - Create voxel
- `removeVoxel(voxel)` - Remove voxel permanently
- `damageVoxel(voxel, damage)` - Apply damage and visual feedback
- `dropVoxel(voxel)` - Convert static to dynamic (falls)
- `isSupported(voxel)` - Check if voxel has ground beneath
- `applyGravity()` - Drop unsupported voxels
- `createGround(width, length, material)` - Create ground plane
- `createStructure(x, y, z, w, h, d, color)` - Build structure
- `clear()` - Remove all voxels

**Level System:**
```javascript
LEVELS.levelName = {
    name: "Display Name",
    build: function(world) {
        // Build level here
    }
};
```

**Built-in Levels:**
- `LEVELS.basic` - Training ground with scattered structures
- `LEVELS.maze` - Maze environment
- `LEVELS.arena` - Arena with colored pillars

**Customization:**
- Voxel size: Modify `0.5` in createVoxel calls
- Health values: 1 = fragile, 5 = tough
- Dynamic voxels fall with gravity automatically

---

### 3. **weapons.js** - Weapon System
**Purpose:** Extensible weapon framework for creating diverse weapons

**Core Classes:**

**Weapon (Base Class)**
```javascript
class Weapon {
    constructor(name, config = {})
    fire(origin, direction, projectiles, particles)
    createProjectile(origin, direction, projectiles, particles)
    refill()
    getAmmoText()
}
```

**Built-in Weapons:**
- **BulletWeapon** - Standard rifle (0.15s fire rate, 1 damage)
- **ShotgunWeapon** - 6 pellets per shot with spread
- **SniperWeapon** - High damage (5), slow fire rate (1.0s)
- **RocketWeapon** - Large projectiles with explosion

**WeaponManager:**
```javascript
const wm = new WeaponManager();
wm.addWeapon(weapon);
wm.switchWeapon(0);
wm.fire(origin, direction, projectiles, particles);
```

**Creating Custom Weapons:**
```javascript
class CustomWeapon extends Weapon {
    constructor() {
        super("Name", {
            fireRate: 0.1,          // Seconds between shots
            damage: 1,              // Damage per hit
            projectileSpeed: 50,    // Velocity
            projectileSize: 0.3,    // Visual size
            projectileColor: 0xff0000,  // RGB hex
            projectileLife: 10,     // Lifetime in seconds
            ammo: Infinity          // Ammo count
        });
    }
    
    createProjectile(origin, direction, projectiles, particles) {
        // Custom projectile creation logic
        projectiles.push(new Projectile(
            origin,
            direction,
            {
                speed: this.projectileSpeed,
                size: this.projectileSize,
                color: this.projectileColor,
                damage: this.damage,
                lifetime: this.projectileLife,
                weapon: this.name,
                explosion: false  // Enable for splash damage
            }
        ));
    }
}
```

---

### 4. **entities.js** - Game Entities
**Purpose:** Define game objects like enemies and particles

**Enemy Class:**
```javascript
class Enemy {
    constructor(position, world)
    update(delta, playerPos, particles)
    takeDamage(amount, particles)
    destroy(particles)
    getDistance(playerPos)
}
```

**Enemy Configuration:**
- Health: 3 (default)
- Speed: 8 units/sec
- Size: 0.4 voxel units
- Made of 9 voxel pieces

**Particle Class:**
```javascript
class Particle {
    constructor(position, velocity, color, life)
    update(delta)
    destroy()
}
```

---

### 5. **main.js** - Game Loop & Logic
**Purpose:** Core game loop, input handling, collision detection, game state

**Key Game Functions:**
- `init()` - Initialize all systems
- `animate()` - Main render loop (60fps capped)
- `updatePlayer(delta)` - Player movement and camera
- `updateEnemies(delta)` - Spawn and update enemies
- `updateProjectiles(delta)` - Update bullets
- `updateParticles(delta)` - Update particles
- `checkCollisions()` - Collision detection & response
- `shoot()` - Fire weapon
- `startGame()` - Start gameplay
- `endGame()` - End gameplay
- `togglePause()` - Pause/unpause

**Game Constants:**
```javascript
const VOXEL_SIZE = 0.5;
const PLAYER_HEIGHT = 3;
const PLAYER_SPEED = 20;
const JUMP_VELOCITY = 15;
const PLAYER_RADIUS = 0.4;
const GRAVITY = 40;
const ENEMY_SPAWN_INTERVAL = 1500;
```

---

## Collision System Explained

### How It Works

**1. Projectile-Voxel Collision:**
- Uses distance check first (fast)
- Ray-casts for precise hits
- Damages voxel, creates particles, destroys projectile

**2. Player-Voxel Collision:**
- AABB (axis-aligned bounding box) collision
- Multiple check types:
  - Landing from above (gravity working)
  - Hitting from sides (push player away)
  - Hitting from below (block jump)

**3. Enemy-Player Collision:**
- Simple distance check
- Continuous damage when close
- Triggers game over condition

### Collision Response

```javascript
// When projectile hits voxel
world.damageVoxel(voxel, 1);
// Voxel health decreases
// If health <= 0, voxel is removed
// Adjacent voxels check for support
// Unsupported voxels fall (converted to dynamic)
```

---

## Physics System Details

### Gravity & Falling

**Static Voxels (Initial State):**
```javascript
world.createVoxel(position, color, size, false, health);
// false = static (doesn't move)
```

**Dynamic Voxels (After Breaking):**
- When voxel health reaches 0, it's removed
- Adjacent voxels lose support and fall
- `applyGravity()` converts static → dynamic

**Gravity Properties:**
- Constant downward force: 40 units/sec²
- Damping (air friction): 0.98 (1.0 = no friction)
- Applied probabilistically (10% per frame) for performance

### Player Physics

**Movement:**
- Max speed: 20 units/sec (PLAYER_SPEED)
- Acceleration: Instant
- Deceleration: Instant

**Jumping:**
- Initial velocity: 15 units/sec (JUMP_VELOCITY)
- Can only jump when on ground
- Resets jump on landing

**Collision:**
- Radius-based (0.4 units)
- Pushes away from voxels on contact
- Sticks to ground when landing

---

## Input System

**Keyboard Controls:**
| Key | Action |
|-----|--------|
| W/A/S/D | Movement |
| Space | Jump |
| 1-4 | Switch weapons |
| ESC | Pause |

**Mouse Controls:**
| Input | Action |
|-------|--------|
| Move | Look around |
| Click | Shoot |

**Locked Pointer:**
- Locks when starting game
- Releases on pause
- Can be manually requested

---

## Customization Examples

### Example 1: Create a Gatling Gun
```javascript
class GatlingGun extends Weapon {
    constructor() {
        super("Gatling", {
            fireRate: 0.05,  // Very fast
            damage: 0.5,     // Low damage per shot
            projectileSpeed: 60,
            projectileSize: 0.2,
            projectileColor: 0xffaa00  // Gold
        });
    }
}
weaponManager.addWeapon(new GatlingGun());
```

### Example 2: Double Enemy Health Per Wave
```javascript
// In updateWaveIfNeeded():
gameState.wave++;
// Make enemies tougher
const newHealth = 3 + gameState.wave * 2;
// Apply to newly spawned enemies
```

### Example 3: Create Floating Island Level
```javascript
LEVELS.floatingIsland = {
    name: "Floating Islands",
    build: function(world) {
        // Main island
        world.createStructure(0, -5, 0, 10, 5, 10);
        
        // Floating platforms
        for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * 30;
            const z = (Math.random() - 0.5) * 30;
            const y = 10 + Math.random() * 10;
            world.createStructure(x, y, z, 3, 2, 3);
        }
    }
};
```

### Example 4: Explosive Voxels
```javascript
// In damageVoxel, check for nearby voxels and explode chain
damageVoxel(voxel, damage = 1) {
    voxel.health -= damage;
    
    if (voxel.health <= 0) {
        // Damage nearby voxels (chain reaction)
        this.voxels.forEach(other => {
            if (other.position.distanceTo(voxel.position) < 2) {
                this.damageVoxel(other, 1);
            }
        });
        
        this.removeVoxel(voxel);
    }
}
```

---

## Performance Optimization Tips

1. **Reduce Voxel Count:**
   - Smaller levels
   - Remove unnecessary structures
   - Use dynamic meshes

2. **Optimize Collision:**
   - Spatial partitioning (grid-based)
   - Only check nearby voxels
   - Use distance checks first

3. **Particle Management:**
   - Lower particle lifetime
   - Reduce particle count per hit
   - Reuse particle objects

4. **Physics Updates:**
   - Only apply gravity 10% of time
   - Cache bounding boxes
   - Use simplified collision shapes

5. **Rendering:**
   - Enable frustum culling
   - Use LOD for distant voxels
   - Batch similar meshes

---

## Debugging

**Log Active Objects:**
```javascript
console.log('Enemies:', enemies.length);
console.log('Projectiles:', projectiles.length);
console.log('Particles:', particles.length);
console.log('Voxels:', world.voxels.length);
```

**Check Physics:**
```javascript
console.log('Physics bodies:', physics.bodies.length);
console.log('Player velocity:', player.velocity);
console.log('Player position:', player.position);
```

**Collision Testing:**
```javascript
// Temporarily log collisions
if (hitSomething) {
    console.log('Hit voxel at:', voxel.position);
}
```

---

## File Structure

```
├── index.html              # Entry point
├── style.css               # UI styling
├── physics.js              # Physics engine (750 lines)
├── world.js                # World system (210 lines)
├── weapons.js              # Weapon system (350 lines)
├── entities.js             # Game entities (150 lines)
├── main.js                 # Game loop (760 lines)
├── QUICKSTART.js           # Quick reference examples
└── README.md               # This documentation
```

**Total: ~3000 lines of well-organized code**

---

## Extension Possibilities

- **Powerups:** Shield, rapid fire, slow-time
- **NPCs:** Friendly units, merchants
- **Crafting:** Combine voxels into weapons
- **Procedural Generation:** Random level generation
- **Multiplayer:** WebSocket-based networking
- **Sound:** Web Audio API integration
- **Touch Controls:** Mobile/tablet support
- **VR:** WebXR support

---

## License & Notes

This engine is free to use and modify for any purpose.

**Key Design Principles:**
1. **Modularity** - Each system is independent
2. **Extensibility** - Easy to add features
3. **Performance** - Optimized for real-time rendering
4. **Clarity** - Well-commented, readable code
5. **Flexibility** - Customizable without hacks

---

**Happy developing! 🚀**
