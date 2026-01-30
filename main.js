// ============================================================================
// 3D VOXEL SHOOTER - Main Game Loop
// ============================================================================

// Constants
const VOXEL_SIZE = 0.5;
const PLAYER_HEIGHT = 3;
const PLAYER_SPEED = 20;
const JUMP_VELOCITY = 15;
const PLAYER_RADIUS = 0.4;
const GRAVITY = 40;
const ENEMY_SPAWN_INTERVAL = 1500;

// Game state
const gameState = {
    health: 100,
    maxHealth: 100,
    score: 0,
    wave: 1,
    isPlaying: false,
    isPaused: false,
    kills: 0,
    currentLevel: 'basic'
};

// Player state
const player = {
    position: new THREE.Vector3(0, PLAYER_HEIGHT, 0),
    velocity: new THREE.Vector3(),
    rotation: { x: 0, y: 0 },
    canJump: false,
    controls: {
        forward: false,
        backward: false,
        left: false,
        right: false
    }
};

// Engine instances
let scene, camera, renderer, clock;
let physics, world, weaponManager;
let lastEnemySpawn = 0;
let enemies = [];
let projectiles = [];
let particles = [];
let waveMultiplier = 1;

// Physics for voxel projectiles
class VoxelProjectile {
    constructor(position, direction, owner = 'player') {
        this.mesh = createVoxel(position, 0xff6b00, 0.3);
        this.position = position.clone();
        this.velocity = direction.clone().multiplyScalar(50);
        this.owner = owner;
        this.lifetime = 10;
        this.age = 0;
        scene.add(this.mesh);
    }

    update(delta) {
        this.age += delta;
        
        // Apply gravity
        this.velocity.y -= GRAVITY * delta;
        
        // Update position with physics
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.mesh.position.copy(this.position);
        
        // Rotate based on velocity
        this.mesh.rotation.x += this.velocity.z * delta * 0.01;
        this.mesh.rotation.z += this.velocity.x * delta * 0.01;
        
        return this.age < this.lifetime && this.position.y > -50;
    }

    destroy() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// Particle effect system
class Particle {
    constructor(position, velocity, color, life = 0.5) {
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.life = life;
        this.age = 0;
        
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshStandardMaterial({ 
            color: color,
            emissive: color,
            emissiveIntensity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }

    update(delta) {
        this.age += delta;
        this.velocity.y -= GRAVITY * delta * 0.5;
        
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.mesh.position.copy(this.position);
        
        const progress = this.age / this.life;
        this.mesh.material.opacity = 1 - progress;
        this.mesh.scale.multiplyScalar(0.95);
        
        return this.age < this.life;
    }

    destroy() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

// Enemy made of multiple voxels
class VoxelEnemy {
    constructor(position) {
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Vector3();
        this.health = 3;
        this.maxHealth = 3;
        this.group = new THREE.Group();
        this.voxels = [];
        this.lastDamageTime = 0;
        this.isDestroyed = false;
        
        // Create enemy shape from voxels (2x2x2 cube + extensions)
        const shape = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 1, y: 0, z: 1 },
            { x: 0, y: 1, z: 1 },
            { x: 1, y: 1, z: 1 },
            { x: 0.5, y: 2, z: 0.5 } // Eye
        ];
        
        shape.forEach((offset, index) => {
            const color = index === shape.length - 1 ? 0xff0000 : 0xdd0000;
            const voxel = createVoxel(new THREE.Vector3(0, 0, 0), color, 0.4);
            voxel.position.set(offset.x * VOXEL_SIZE, offset.y * VOXEL_SIZE, offset.z * VOXEL_SIZE);
            voxel.castShadow = true;
            voxel.receiveShadow = true;
            
            this.group.add(voxel);
            this.voxels.push({
                mesh: voxel,
                offset: offset,
                maxHealth: 1,
                health: 1
            });
        });
        
        this.group.position.copy(this.position);
        this.group.castShadow = true;
        scene.add(this.group);
    }

    update(delta) {
        if (this.isDestroyed) return false;

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(player.position, this.position);
        direction.y *= 0.5;
        direction.normalize();
        
        this.velocity.copy(direction).multiplyScalar(8);
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.group.position.copy(this.position);
        
        // Gentle rotation
        this.group.rotation.y += delta * 0.5;
        this.group.rotation.z = Math.sin(Date.now() * 0.001) * 0.2;
        
        // Color based on health
        const healthRatio = this.health / this.maxHealth;
        this.voxels.forEach((voxel, idx) => {
            const color = idx === this.voxels.length - 1 ? 0xff0000 : 0xdd0000;
            const c = new THREE.Color(color);
            if (healthRatio < 0.5) {
                c.lerp(new THREE.Color(0x00ff00), 1 - healthRatio * 2);
            }
            voxel.mesh.material.color = c;
        });
        
        return true;
    }

    takeDamage(amount = 1) {
        if (Date.now() - this.lastDamageTime < 100) return;
        
        this.lastDamageTime = Date.now();
        this.health -= amount;
        
        // Create impact particles
        const impactPos = this.position.clone();
        for (let i = 0; i < 5; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 15,
                Math.random() * 10,
                (Math.random() - 0.5) * 15
            );
            particles.push(new Particle(impactPos, velocity, 0xff6b00, 0.3));
        }
        
        // Flash
        this.voxels.forEach(v => {
            v.mesh.material.emissive.setHex(0xffff00);
            setTimeout(() => {
                v.mesh.material.emissive.setHex(0x000000);
            }, 50);
        });
        
        return this.health <= 0;
    }

    destroy() {
        this.isDestroyed = true;
        
        // Explosion particles
        for (let i = 0; i < 20; i++) {
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                Math.random() * 15 + 5,
                (Math.random() - 0.5) * 20
            );
            particles.push(new Particle(this.position, velocity, 0xff6b00, 0.8));
        }
        
        scene.remove(this.group);
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    getDistance() {
        return this.position.distanceTo(player.position);
    }
}

// Create a single voxel mesh
function createVoxel(position, color, size = VOXEL_SIZE) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Material with better lighting
    const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.7,
        emissive: 0x000000
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
}

// Create world terrain
function createWorld() {
    const groundGroup = new THREE.Group();
    
    // Ground plane with voxels
    const gridSize = 20;
    for (let x = -gridSize; x <= gridSize; x++) {
        for (let z = -gridSize; z <= gridSize; z++) {
            const colors = [0x2d5016, 0x3d6b1f, 0x4a7c2a];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const voxel = createVoxel(
                new THREE.Vector3(x * VOXEL_SIZE, -VOXEL_SIZE / 2, z * VOXEL_SIZE),
                color,
                VOXEL_SIZE
            );
            groundGroup.add(voxel);
        }
    }
    
    scene.add(groundGroup);
    
    // Create some structures
    createStructures();
}

function createStructures() {
    const structures = [
        { x: 10, z: 10, width: 3, height: 5, depth: 3 },
        { x: -12, z: 5, width: 2, height: 4, depth: 4 },
        { x: 5, z: -15, width: 4, height: 6, depth: 2 },
        { x: -8, z: -10, width: 3, height: 3, depth: 3 },
        { x: 15, z: -8, width: 2, height: 5, depth: 3 }
    ];
    
    structures.forEach(struct => {
        for (let x = 0; x < struct.width; x++) {
            for (let y = 0; y < struct.height; y++) {
                for (let z = 0; z < struct.depth; z++) {
                    const colors = [0x8B4513, 0xA0522D, 0x696969];
                    const color = colors[Math.floor(Math.random() * colors.length)];
                    
                    const voxel = createVoxel(
                        new THREE.Vector3(
                            (struct.x + x) * VOXEL_SIZE,
                            y * VOXEL_SIZE,
                            (struct.z + z) * VOXEL_SIZE
                        ),
                        color,
                        VOXEL_SIZE
                    );
                    scene.add(voxel);
                }
            }
        }
    });
}


// Shoot projectile
function shoot() {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const projectile = new VoxelProjectile(
        camera.position.clone().add(direction.clone().multiplyScalar(2)),
        direction,
        'player'
    );
    projectiles.push(projectile);
}

// Check projectile-voxel collisions with proper physics
function checkCollisions() {
    // Projectile-voxel collisions
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        let hitSomething = false;

        // Check world voxels
        for (let j = world.voxels.length - 1; j >= 0; j--) {
            const voxel = world.voxels[j];
            const distance = projectile.position.distanceTo(voxel.position);

            if (distance < (voxel.size / 2 + projectile.size / 2 + 0.3)) {
                // Hit voxel
                hitSomething = true;
                world.damageVoxel(voxel, 1);

                // Create particles at impact
                const dir = projectile.velocity.clone().normalize();
                for (let k = 0; k < 8; k++) {
                    const particleVel = dir.clone()
                        .add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5))
                        .multiplyScalar(Math.random() * 10 + 5);
                    particles.push(new Particle(projectile.position.clone(), particleVel, 0xff6b00, 0.4));
                }

                gameState.score += 5;
                break;
            }
        }

        if (hitSomething) {
            projectile.destroy();
            projectiles.splice(i, 1);
            continue;
        }

        // Check enemy collisions
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const distance = projectile.position.distanceTo(enemy.position);

            if (distance < 2) {
                const isDead = enemy.takeDamage(1);

                if (isDead) {
                    enemy.destroy();
                    enemies.splice(j, 1);
                    gameState.score += 100 * gameState.wave;
                    gameState.kills++;
                    updateWaveIfNeeded();
                }

                projectile.destroy();
                projectiles.splice(i, 1);
                hitSomething = true;
                break;
            }
        }
    }

    // Check player-ground collision
    const groundVoxels = world.voxels.filter(v => !v.dynamic && !v.broken);
    const playerBounds = physics.getSphereBounds(player.position, PLAYER_RADIUS);

    let onGround = false;
    groundVoxels.forEach(voxel => {
        const voxelBounds = physics.getVoxelBounds(voxel.position, voxel.size);

        if (physics.checkAABBCollision(playerBounds, voxelBounds)) {
            const overlapY = voxelBounds.max.y - playerBounds.min.y;

            // If coming from above, land on voxel
            if (player.velocity.y <= 0 && overlapY < PLAYER_RADIUS * 2) {
                player.position.y = voxelBounds.max.y + PLAYER_RADIUS;
                player.velocity.y = 0;
                player.canJump = true;
                onGround = true;
            }
            // Collide from sides or below
            else if (player.velocity.y > 0) {
                player.position.y = voxelBounds.min.y - PLAYER_RADIUS;
                player.velocity.y = 0;
            }
            // Side collision - push player out
            else {
                const dx = player.position.x - voxel.position.x;
                const dz = player.position.z - voxel.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist > 0) {
                    const push = (voxel.size / 2 + PLAYER_RADIUS) - dist + 0.1;
                    player.position.x += (dx / dist) * push;
                    player.position.z += (dz / dist) * push;
                }
            }
        }
    });

    if (!onGround && player.position.y <= PLAYER_HEIGHT) {
        player.position.y = PLAYER_HEIGHT;
        player.velocity.y = 0;
        player.canJump = true;
    }

    // Enemy-player collision (damage)
    enemies.forEach((enemy, idx) => {
        const distance = enemy.getDistance();

        if (distance < 2) {
            gameState.health -= 0.5; // Continuous damage

            const indicator = document.getElementById('damageIndicator');
            indicator.classList.add('active');
            setTimeout(() => indicator.classList.remove('active'), 100);

            updateHUD();

            if (gameState.health <= 0) {
                endGame();
            }
        }
    });
}

function updateWaveIfNeeded() {
    const enemiesToKillForWave = 5 + gameState.wave * 2;
    if (gameState.kills % enemiesToKillForWave === 0) {
        gameState.wave++;
        waveMultiplier = 1 + (gameState.wave - 1) * 0.3;
        updateHUD();
    }
}

// Spawn enemy
function spawnEnemy() {
    const angle = Math.random() * Math.PI * 2;
    const distance = 25;
    const position = new THREE.Vector3(
        Math.cos(angle) * distance,
        VOXEL_SIZE * 2,
        Math.sin(angle) * distance
    );

    enemies.push(new VoxelEnemy(position));
}

// Update player
function updatePlayer(delta) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    // Get move direction
    const moveDir = new THREE.Vector3();
    if (player.controls.forward) moveDir.z -= 1;
    if (player.controls.backward) moveDir.z += 1;
    if (player.controls.left) moveDir.x -= 1;
    if (player.controls.right) moveDir.x += 1;

    // Normalize and apply speed
    if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
        moveDir.multiplyScalar(PLAYER_SPEED * delta);
        player.position.add(moveDir);
    }

    // Apply gravity
    player.velocity.y -= GRAVITY * delta;
    player.position.y += player.velocity.y * delta;

    // Update camera
    camera.position.copy(player.position);
    camera.position.y += 0.6;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.rotation.y;
    camera.rotation.x = player.rotation.x;
}

// Update projectiles
function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const projectile = projectiles[i];
        if (!projectile.update(delta)) {
            projectile.destroy();
            projectiles.splice(i, 1);
        }
    }
}

// Update enemies
function updateEnemies(delta) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    // Spawn new enemies
    if (Date.now() - lastEnemySpawn > ENEMY_SPAWN_INTERVAL / waveMultiplier) {
        spawnEnemy();
        lastEnemySpawn = Date.now();
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update(delta);
    }
}

// Update particles
function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update(delta)) {
            particles[i].destroy();
            particles.splice(i, 1);
        }
    }
}

// Update HUD
function updateHUD() {
    document.getElementById('healthValue').textContent = Math.max(0, Math.floor(gameState.health));
    document.getElementById('scoreValue').textContent = gameState.score;
    document.getElementById('waveNumber').textContent = gameState.wave;
}

// Event listeners
function setupInput() {
    document.addEventListener('keydown', (e) => {
        if (!gameState.isPlaying) return;
        
        switch (e.code) {
            case 'KeyW': player.controls.forward = true; break;
            case 'KeyS': player.controls.backward = true; break;
            case 'KeyA': player.controls.left = true; break;
            case 'KeyD': player.controls.right = true; break;
            case 'Space':
                if (player.canJump) {
                    player.velocity.y = JUMP_VELOCITY;
                    player.canJump = false;
                }
                break;
            case 'Escape': togglePause(); break;
            // Weapon switching
            case 'Digit1': weaponManager.switchWeapon(0); break;
            case 'Digit2': weaponManager.switchWeapon(1); break;
            case 'Digit3': weaponManager.switchWeapon(2); break;
            case 'Digit4': weaponManager.switchWeapon(3); break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW': player.controls.forward = false; break;
            case 'KeyS': player.controls.backward = false; break;
            case 'KeyA': player.controls.left = false; break;
            case 'KeyD': player.controls.right = false; break;
        }
    });

    // Mouse look
    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== renderer.domElement) return;
        if (!gameState.isPlaying || gameState.isPaused) return;

        player.rotation.y -= e.movementX * 0.005;
        player.rotation.x -= e.movementY * 0.005;
        player.rotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, player.rotation.x));
    });

    // Shooting
    document.addEventListener('click', () => {
        if (gameState.isPlaying && !gameState.isPaused) {
            shoot();
        } else if (!gameState.isPlaying && document.getElementById('menu').style.display === 'none') {
            renderer.domElement.requestPointerLock();
        }
    });

    // Menu buttons
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Game functions
function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    gameState.isPlaying = true;
    gameState.health = gameState.maxHealth;
    gameState.score = 0;
    gameState.wave = 1;
    gameState.kills = 0;
    waveMultiplier = 1;
    
    player.position.set(0, PLAYER_HEIGHT, 0);
    player.velocity.set(0, 0, 0);
    player.rotation = { x: 0, y: 0 };
    
    enemies.length = 0;
    projectiles.length = 0;
    particles.length = 0;
    
    updateHUD();
    renderer.domElement.requestPointerLock();
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    startGame();
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        document.exitPointerLock();
    } else {
        renderer.domElement.requestPointerLock();
    }
}

function endGame() {
    gameState.isPlaying = false;
    document.getElementById('hud').style.display = 'none';
    document.getElementById('gameOver').style.display = 'flex';
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalWave').textContent = gameState.wave;
    document.exitPointerLock();
}

// Initialize
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 80, 120);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    // Clock
    clock = new THREE.Clock();

    // Initialize engine systems
    physics = new PhysicsEngine();
    world = new World(scene, physics, gameState.currentLevel);
    weaponManager = new WeaponManager();

    // Add weapons
    weaponManager.addWeapon(new BulletWeapon("Rifle"));
    weaponManager.addWeapon(new ShotgunWeapon("Shotgun"));
    weaponManager.addWeapon(new SniperWeapon("Sniper"));
    weaponManager.addWeapon(new RocketWeapon("Rocket Launcher"));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0005;
    scene.add(directionalLight);

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x4a7c2a, 0.4);
    scene.add(hemiLight);

    // Create world
    LEVELS[gameState.currentLevel].build(world);

    // Setup input
    setupInput();

    // Start render loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.016); // Cap at 60fps

    if (gameState.isPlaying && !gameState.isPaused) {
        updatePlayer(delta);
        updateEnemies(delta);
        updateProjectiles(delta);
        updateParticles(delta);
        physics.update(delta);
        world.update(delta);
        checkCollisions();
    }

    renderer.render(scene, camera);
}

// Start when page loads
window.addEventListener('load', init);
