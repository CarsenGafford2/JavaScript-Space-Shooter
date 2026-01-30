// ============================================================================
// WORLD SYSTEM - Manages levels, terrain, and voxel maps
// ============================================================================

class World {
    constructor(scene, physics, name = "Default World") {
        this.scene = scene;
        this.physics = physics;
        this.name = name;
        this.voxels = [];
        this.voxelMap = new Map(); // For quick lookups by position hash
        this.staticVoxelGroup = new THREE.Group();
        this.dynamicVoxelGroup = new THREE.Group();
        scene.add(this.staticVoxelGroup);
        scene.add(this.dynamicVoxelGroup);
    }

    // Create voxel at position
    createVoxel(position, color, size = 0.5, dynamic = false, health = 1) {
        const geometry = new THREE.BoxGeometry(size, size, size);
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

        const voxel = {
            mesh: mesh,
            position: position.clone(),
            color: color,
            size: size,
            dynamic: dynamic,
            health: health,
            maxHealth: health,
            broken: false,
            velocity: new THREE.Vector3()
        };

        this.voxels.push(voxel);

        if (dynamic) {
            this.dynamicVoxelGroup.add(mesh);
            this.physics.addBody({
                mesh: mesh,
                position: position.clone(),
                velocity: new THREE.Vector3(),
                dynamic: true,
                lifetime: undefined,
                voxelRef: voxel
            });
        } else {
            this.staticVoxelGroup.add(mesh);
        }

        // Store in hash map for fast lookup
        const hash = this.hashPosition(position);
        this.voxelMap.set(hash, voxel);

        return voxel;
    }

    // Hash position for fast lookup
    hashPosition(pos) {
        const step = 0.5;
        const x = Math.round(pos.x / step);
        const y = Math.round(pos.y / step);
        const z = Math.round(pos.z / step);
        return `${x},${y},${z}`;
    }

    // Get voxel at position
    getVoxelAt(position, tolerance = 0.3) {
        const hash = this.hashPosition(position);
        return this.voxelMap.get(hash);
    }

    // Remove voxel
    removeVoxel(voxel) {
        if (voxel.broken) return;
        voxel.broken = true;

        const hash = this.hashPosition(voxel.position);
        this.voxelMap.delete(hash);

        if (voxel.dynamic) {
            this.dynamicVoxelGroup.remove(voxel.mesh);
        } else {
            this.staticVoxelGroup.remove(voxel.mesh);
        }

        voxel.mesh.geometry.dispose();
        voxel.mesh.material.dispose();

        const idx = this.voxels.indexOf(voxel);
        if (idx !== -1) this.voxels.splice(idx, 1);
    }

    // Damage voxel
    damageVoxel(voxel, damage = 1) {
        voxel.health -= damage;

        // Visual feedback - change color based on health
        const healthRatio = voxel.health / voxel.maxHealth;
        const c = new THREE.Color(voxel.color);
        if (healthRatio < 0.5) {
            c.lerp(new THREE.Color(0xff6600), 1 - healthRatio * 2);
        }
        voxel.mesh.material.color = c;

        if (voxel.health <= 0) {
            this.removeVoxel(voxel);
            return true; // Destroyed
        }
        return false;
    }

    // Make voxel fall (used when adjacent voxels are destroyed)
    dropVoxel(voxel) {
        if (voxel.dynamic) return;
        
        // Convert to dynamic voxel
        voxel.dynamic = true;
        this.staticVoxelGroup.remove(voxel.mesh);
        this.dynamicVoxelGroup.add(voxel.mesh);

        // Add physics body
        this.physics.addBody({
            mesh: voxel.mesh,
            position: voxel.position.clone(),
            velocity: new THREE.Vector3(),
            dynamic: true,
            lifetime: undefined,
            voxelRef: voxel
        });
    }

    // Check if voxel is supported (has ground beneath it)
    isSupported(voxel) {
        const below = voxel.position.clone().sub(new THREE.Vector3(0, voxel.size + 0.01, 0));
        const voxelBelow = this.getVoxelAt(below);
        
        return voxelBelow !== undefined && !voxelBelow.broken && !voxelBelow.dynamic;
    }

    // Apply gravity to floating voxels
    applyGravity() {
        this.voxels.forEach(voxel => {
            if (voxel.dynamic || voxel.broken) return;

            if (!this.isSupported(voxel)) {
                this.dropVoxel(voxel);
            }
        });
    }

    // Build default ground level
    createGround(width = 40, length = 40, material = 0x2d5016) {
        for (let x = -width / 2; x < width / 2; x++) {
            for (let z = -length / 2; z < length / 2; z++) {
                const colors = [0x2d5016, 0x3d6b1f, 0x4a7c2a];
                const color = colors[Math.floor(Math.random() * colors.length)];
                
                this.createVoxel(
                    new THREE.Vector3(x * 0.5, -0.25, z * 0.5),
                    color,
                    0.5,
                    false,
                    999 // Unbreakable ground
                );
            }
        }
    }

    // Build structures
    createStructure(baseX, baseY, baseZ, width, height, depth, color = 0x8B4513) {
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let z = 0; z < depth; z++) {
                    const colors = [0x8B4513, 0xA0522D, 0x696969, color];
                    const c = colors[Math.floor(Math.random() * colors.length)];
                    
                    this.createVoxel(
                        new THREE.Vector3(
                            (baseX + x) * 0.5,
                            baseY + y * 0.5,
                            (baseZ + z) * 0.5
                        ),
                        c,
                        0.5,
                        false,
                        2 // Destructible
                    );
                }
            }
        }
    }

    // Clear all voxels
    clear() {
        this.voxels.forEach(voxel => {
            if (voxel.dynamic) {
                this.dynamicVoxelGroup.remove(voxel.mesh);
            } else {
                this.staticVoxelGroup.remove(voxel.mesh);
            }
            voxel.mesh.geometry.dispose();
            voxel.mesh.material.dispose();
        });
        this.voxels = [];
        this.voxelMap.clear();
    }

    update(delta) {
        // Apply gravity periodically (not every frame for performance)
        if (Math.random() < 0.1) {
            this.applyGravity();
        }
    }
}

// Pre-built level definitions
const LEVELS = {
    basic: {
        name: "Training Ground",
        build: function(world) {
            world.createGround(40, 40);
            world.createStructure(10, 0, 10, 3, 5, 3);
            world.createStructure(-12, 0, 5, 2, 4, 4);
            world.createStructure(5, 0, -15, 4, 6, 2);
            world.createStructure(-8, 0, -10, 3, 3, 3);
            world.createStructure(15, 0, -8, 2, 5, 3);
        }
    },

    maze: {
        name: "Voxel Maze",
        build: function(world) {
            world.createGround(50, 50);
            // Create maze-like structures
            for (let i = 0; i < 5; i++) {
                const x = (i - 2) * 8;
                world.createStructure(x, 0, 0, 2, 4, 20);
                world.createStructure(x + 3, 0, -10, 2, 3, 10);
            }
        }
    },

    arena: {
        name: "Arena",
        build: function(world) {
            world.createGround(60, 60);
            // Central structures
            world.createStructure(0, 0, 0, 4, 3, 4, 0xffaa00);
            world.createStructure(10, 0, 10, 3, 4, 3, 0xff0000);
            world.createStructure(-10, 0, 10, 3, 4, 3, 0x0000ff);
            world.createStructure(10, 0, -10, 3, 4, 3, 0x00ff00);
            world.createStructure(-10, 0, -10, 3, 4, 3, 0xffff00);
        }
    }
};
