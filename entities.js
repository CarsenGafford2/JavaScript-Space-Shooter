// ============================================================================
// ENTITIES - Game entities (enemies, particles, etc)
// ============================================================================

class Particle {
    constructor(position, velocity, color, life = 0.5) {
        this.position = position.clone();
        this.velocity = velocity.clone();
        this.life = life;
        this.age = 0;

        const geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8,
            transparent: true
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
    }

    update(delta) {
        this.age += delta;
        this.velocity.y -= 40 * delta * 0.5;

        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.mesh.position.copy(this.position);

        const progress = this.age / this.life;
        this.mesh.material.opacity = 1 - progress;
        this.mesh.scale.multiplyScalar(0.95);

        return this.age < this.life;
    }

    destroy() {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

class Enemy {
    constructor(position, world) {
        this.position = position.clone();
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Vector3();
        this.health = 3;
        this.maxHealth = 3;
        this.group = new THREE.Group();
        this.voxels = [];
        this.lastDamageTime = 0;
        this.destroyed = false;
        this.world = world;
        this.speed = 8;

        // Create enemy from voxels
        const shape = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 1, y: 0, z: 1 },
            { x: 0, y: 1, z: 1 },
            { x: 1, y: 1, z: 1 },
            { x: 0.5, y: 2, z: 0.5 }
        ];

        shape.forEach((offset, index) => {
            const color = index === shape.length - 1 ? 0xff0000 : 0xdd0000;
            const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const material = new THREE.MeshStandardMaterial({
                color: color,
                metalness: 0.2,
                roughness: 0.8
            });

            const voxel = new THREE.Mesh(geometry, material);
            voxel.position.set(offset.x * 0.5, offset.y * 0.5, offset.z * 0.5);
            voxel.castShadow = true;
            voxel.receiveShadow = true;

            this.group.add(voxel);
            this.voxels.push({
                mesh: voxel,
                health: 1
            });
        });

        this.group.position.copy(this.position);
        this.group.castShadow = true;
    }

    update(delta, playerPos, particles) {
        if (this.destroyed) return false;

        // Move towards player
        const direction = new THREE.Vector3();
        direction.subVectors(playerPos, this.position);
        direction.y *= 0.3;
        direction.normalize();

        this.velocity.copy(direction).multiplyScalar(this.speed);
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.group.position.copy(this.position);

        // Animations
        this.group.rotation.y += delta * 0.5;
        this.group.rotation.z = Math.sin(Date.now() * 0.001) * 0.2;

        // Color based on health
        const healthRatio = this.health / this.maxHealth;
        this.voxels.forEach((voxel, idx) => {
            const baseColor = idx === this.voxels.length - 1 ? 0xff0000 : 0xdd0000;
            const c = new THREE.Color(baseColor);
            if (healthRatio < 0.5) {
                c.lerp(new THREE.Color(0x00ff00), 1 - healthRatio * 2);
            }
            voxel.mesh.material.color = c;
        });

        return true;
    }

    takeDamage(amount = 1, particles = null) {
        if (Date.now() - this.lastDamageTime < 100) return false;

        this.lastDamageTime = Date.now();
        this.health -= amount;

        // Create impact particles
        if (particles) {
            for (let i = 0; i < 5; i++) {
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 15,
                    Math.random() * 10,
                    (Math.random() - 0.5) * 15
                );
                particles.push(new Particle(this.position, velocity, 0xff6b00, 0.3));
            }
        }

        // Flash
        this.voxels.forEach(v => {
            v.mesh.material.emissive.setHex(0xffff00);
            setTimeout(() => {
                v.mesh.material.emissive.setHex(0x000000);
            }, 50);
        });

        if (this.health <= 0) {
            return true; // Dead
        }
        return false;
    }

    destroy(particles = null) {
        this.destroyed = true;

        // Explosion particles
        if (particles) {
            for (let i = 0; i < 20; i++) {
                const velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 20,
                    Math.random() * 15 + 5,
                    (Math.random() - 0.5) * 20
                );
                particles.push(new Particle(this.position, velocity, 0xff6b00, 0.8));
            }
        }

        if (this.group.parent) {
            this.group.parent.remove(this.group);
        }
        this.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }

    getDistance(playerPos) {
        return this.position.distanceTo(playerPos);
    }
}
