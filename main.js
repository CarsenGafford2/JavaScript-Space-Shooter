// Game state
const gameState = {
    health: 100,
    score: 0,
    isPlaying: false,
    isPaused: false
};

// Three.js setup
let scene, camera, renderer;
let clock, delta;
let controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false
};

// Player
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
const PLAYER_HEIGHT = 2;
const PLAYER_SPEED = 20;
const JUMP_VELOCITY = 10;
const GRAVITY = 30;
let canJump = false;
let playerY = PLAYER_HEIGHT;

// World
const VOXEL_SIZE = 2;
const WORLD_SIZE = 30;
const voxels = [];
const voxelMeshes = new Map();

// Enemies
const enemies = [];
const ENEMY_SPEED = 3;
const ENEMY_SPAWN_INTERVAL = 5000;
let lastEnemySpawn = 0;

// Raycaster for shooting and collision
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Initialize the game
function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 0, 100);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = PLAYER_HEIGHT;

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Clock for delta time
    clock = new THREE.Clock();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create voxel world
    createVoxelWorld();

    // Event listeners
    setupEventListeners();

    // Start menu
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('restartButton').addEventListener('click', restartGame);

    // Start render loop
    animate();
}

// Create voxel-based world
function createVoxelWorld() {
    const voxelGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    
    // Ground layer
    for (let x = -WORLD_SIZE / 2; x < WORLD_SIZE / 2; x++) {
        for (let z = -WORLD_SIZE / 2; z < WORLD_SIZE / 2; z++) {
            const voxelMaterial = new THREE.MeshLambertMaterial({ 
                color: Math.random() > 0.5 ? 0x228B22 : 0x32CD32 
            });
            const voxel = new THREE.Mesh(voxelGeometry, voxelMaterial);
            voxel.position.set(x * VOXEL_SIZE, -VOXEL_SIZE / 2, z * VOXEL_SIZE);
            voxel.castShadow = true;
            voxel.receiveShadow = true;
            scene.add(voxel);
            
            const voxelData = {
                mesh: voxel,
                position: voxel.position.clone(),
                destructible: false
            };
            voxels.push(voxelData);
            voxelMeshes.set(voxel.uuid, voxelData);
        }
    }

    // Add some walls and structures
    createStructures();
}

// Create structures
function createStructures() {
    const voxelGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    const materials = [
        new THREE.MeshLambertMaterial({ color: 0x8B4513 }), // Brown
        new THREE.MeshLambertMaterial({ color: 0xA0522D }), // Sienna
        new THREE.MeshLambertMaterial({ color: 0x696969 })  // Gray
    ];

    // Create random structures
    for (let i = 0; i < 20; i++) {
        const height = Math.floor(Math.random() * 5) + 2;
        const x = Math.floor(Math.random() * WORLD_SIZE - WORLD_SIZE / 2);
        const z = Math.floor(Math.random() * WORLD_SIZE - WORLD_SIZE / 2);
        
        // Don't create structures too close to spawn
        if (Math.abs(x) < 3 && Math.abs(z) < 3) continue;

        for (let y = 0; y < height; y++) {
            const material = materials[Math.floor(Math.random() * materials.length)].clone();
            const voxel = new THREE.Mesh(voxelGeometry, material);
            voxel.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE + VOXEL_SIZE / 2, z * VOXEL_SIZE);
            voxel.castShadow = true;
            voxel.receiveShadow = true;
            scene.add(voxel);
            
            const voxelData = {
                mesh: voxel,
                position: voxel.position.clone(),
                destructible: true,
                health: 3
            };
            voxels.push(voxelData);
            voxelMeshes.set(voxel.uuid, voxelData);
        }
    }
}

// Create enemy
function createEnemy() {
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE * 1.5, VOXEL_SIZE);
    const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geometry, material);
    
    // Spawn at random edge of world
    const edge = Math.floor(Math.random() * 4);
    const offset = WORLD_SIZE / 2 * VOXEL_SIZE;
    switch (edge) {
        case 0: // North
            enemy.position.set(Math.random() * WORLD_SIZE * VOXEL_SIZE - offset, VOXEL_SIZE, offset);
            break;
        case 1: // South
            enemy.position.set(Math.random() * WORLD_SIZE * VOXEL_SIZE - offset, VOXEL_SIZE, -offset);
            break;
        case 2: // East
            enemy.position.set(offset, VOXEL_SIZE, Math.random() * WORLD_SIZE * VOXEL_SIZE - offset);
            break;
        case 3: // West
            enemy.position.set(-offset, VOXEL_SIZE, Math.random() * WORLD_SIZE * VOXEL_SIZE - offset);
            break;
    }
    
    enemy.castShadow = true;
    scene.add(enemy);
    
    enemies.push({
        mesh: enemy,
        health: 3,
        speed: ENEMY_SPEED
    });
}

// Setup event listeners
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameState.isPlaying) return;
        
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                controls.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                controls.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                controls.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                controls.moveRight = true;
                break;
            case 'Space':
                if (canJump) {
                    velocity.y = JUMP_VELOCITY;
                    canJump = false;
                }
                break;
            case 'Escape':
                togglePause();
                break;
        }
    });

    document.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                controls.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                controls.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                controls.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                controls.moveRight = false;
                break;
        }
    });

    // Mouse controls
    document.addEventListener('click', () => {
        if (gameState.isPlaying && !gameState.isPaused) {
            shoot();
        }
    });

    // Pointer lock for mouse look
    let isPointerLocked = false;
    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });

    document.addEventListener('mousemove', (e) => {
        if (isPointerLocked && gameState.isPlaying && !gameState.isPaused) {
            const movementX = e.movementX || 0;
            const movementY = e.movementY || 0;

            camera.rotation.y -= movementX * 0.002;
            camera.rotation.x -= movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    });

    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Start game
function startGame() {
    document.getElementById('menu').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    gameState.isPlaying = true;
    gameState.health = 100;
    gameState.score = 0;
    updateHUD();
    
    // Request pointer lock
    renderer.domElement.requestPointerLock();
}

// Restart game
function restartGame() {
    // Clean up enemies
    enemies.forEach(enemy => scene.remove(enemy.mesh));
    enemies.length = 0;
    
    // Reset player position
    camera.position.set(0, PLAYER_HEIGHT, 0);
    camera.rotation.set(0, 0, 0);
    velocity.set(0, 0, 0);
    playerY = PLAYER_HEIGHT;
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Start game
    startGame();
}

// Toggle pause
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (gameState.isPaused) {
        document.exitPointerLock();
    } else {
        renderer.domElement.requestPointerLock();
    }
}

// Shoot
function shoot() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // Check for enemy hits
    const enemyMeshes = enemies.map(e => e.mesh);
    const enemyIntersects = raycaster.intersectObjects(enemyMeshes);
    
    if (enemyIntersects.length > 0) {
        const hitMesh = enemyIntersects[0].object;
        const enemy = enemies.find(e => e.mesh === hitMesh);
        if (enemy) {
            enemy.health--;
            
            // Flash enemy red
            const originalColor = enemy.mesh.material.color.getHex();
            enemy.mesh.material.color.setHex(0xffaaaa);
            setTimeout(() => {
                if (enemy.mesh.material) {
                    enemy.mesh.material.color.setHex(originalColor);
                }
            }, 100);
            
            if (enemy.health <= 0) {
                scene.remove(enemy.mesh);
                enemies.splice(enemies.indexOf(enemy), 1);
                gameState.score += 100;
                updateHUD();
            }
        }
        return;
    }
    
    // Check for voxel hits
    const voxelMeshesArray = Array.from(voxelMeshes.values()).map(v => v.mesh);
    const voxelIntersects = raycaster.intersectObjects(voxelMeshesArray);
    
    if (voxelIntersects.length > 0) {
        const hitMesh = voxelIntersects[0].object;
        const voxelData = voxelMeshes.get(hitMesh.uuid);
        
        if (voxelData && voxelData.destructible) {
            voxelData.health--;
            
            // Change color based on health
            const healthPercent = voxelData.health / 3;
            const color = new THREE.Color();
            color.setRGB(1, healthPercent, healthPercent);
            voxelData.mesh.material.color = color;
            
            if (voxelData.health <= 0) {
                scene.remove(voxelData.mesh);
                voxelMeshes.delete(hitMesh.uuid);
                voxels.splice(voxels.indexOf(voxelData), 1);
                gameState.score += 10;
                updateHUD();
            }
        }
    }
}

// Update player movement
function updatePlayer(delta) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    // Apply gravity
    velocity.y -= GRAVITY * delta;

    // Get movement direction
    direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
    direction.x = Number(controls.moveRight) - Number(controls.moveLeft);
    direction.normalize();

    // Apply movement
    const moveVector = new THREE.Vector3();
    
    if (controls.moveForward || controls.moveBackward) {
        moveVector.z = direction.z * PLAYER_SPEED * delta;
    }
    if (controls.moveLeft || controls.moveRight) {
        moveVector.x = direction.x * PLAYER_SPEED * delta;
    }

    // Rotate movement vector to match camera rotation
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);

    // Apply movement
    camera.position.add(moveVector);

    // Apply vertical velocity
    playerY += velocity.y * delta;

    // Ground collision
    if (playerY <= PLAYER_HEIGHT) {
        playerY = PLAYER_HEIGHT;
        velocity.y = 0;
        canJump = true;
    }

    camera.position.y = playerY;

    // World boundaries
    const halfWorld = WORLD_SIZE / 2 * VOXEL_SIZE;
    camera.position.x = Math.max(-halfWorld, Math.min(halfWorld, camera.position.x));
    camera.position.z = Math.max(-halfWorld, Math.min(halfWorld, camera.position.z));
}

// Update enemies
function updateEnemies(delta) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    // Spawn enemies
    if (Date.now() - lastEnemySpawn > ENEMY_SPAWN_INTERVAL) {
        createEnemy();
        lastEnemySpawn = Date.now();
    }

    // Update enemy positions
    enemies.forEach(enemy => {
        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, enemy.mesh.position);
        direction.y = 0;
        direction.normalize();

        enemy.mesh.position.add(direction.multiplyScalar(enemy.speed * delta));

        // Check if enemy reached player
        const distance = camera.position.distanceTo(enemy.mesh.position);
        if (distance < 3) {
            gameState.health -= 10;
            updateHUD();
            
            // Remove enemy
            scene.remove(enemy.mesh);
            enemies.splice(enemies.indexOf(enemy), 1);
            
            if (gameState.health <= 0) {
                gameOver();
            }
        }
    });
}

// Update HUD
function updateHUD() {
    document.getElementById('healthValue').textContent = Math.max(0, gameState.health);
    document.getElementById('scoreValue').textContent = gameState.score;
}

// Game over
function gameOver() {
    gameState.isPlaying = false;
    document.getElementById('hud').style.display = 'none';
    document.getElementById('gameOver').style.display = 'flex';
    document.getElementById('finalScore').textContent = gameState.score;
    document.exitPointerLock();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    delta = clock.getDelta();

    updatePlayer(delta);
    updateEnemies(delta);

    renderer.render(scene, camera);
}

// Start the game when page loads
window.addEventListener('load', init);
