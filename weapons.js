// ============================================================================
// WEAPON SYSTEM - Extensible weapon framework
// ============================================================================

class Weapon {
    constructor(name, config = {}) {
        this.name = name;
        this.fireRate = config.fireRate || 0.1;
        this.lastFireTime = 0;
        this.ammo = config.ammo || Infinity;
        this.maxAmmo = config.maxAmmo || Infinity;
        this.damage = config.damage || 1;
        this.projectileSpeed = config.projectileSpeed || 50;
        this.projectileSize = config.projectileSize || 0.3;
        this.projectileColor = config.projectileColor || 0xff6b00;
        this.projectileLife = config.projectileLife || 10;
        this.spread = config.spread || 0; // Bullet spread in radians
        this.scene = null;
        this.physics = null;
        this.world = null;
    }

    // Fire the weapon
    fire(origin, direction, projectiles, particles) {
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate * 1000) return false;
        if (this.ammo === 0) return false;

        this.lastFireTime = now;
        if (this.ammo !== Infinity) this.ammo--;

        this.createProjectile(origin, direction, projectiles, particles);
        return true;
    }

    // Create projectile - override in subclasses for custom behavior
    createProjectile(origin, direction, projectiles, particles) {
        const spreadDir = direction.clone();
        
        // Apply spread
        if (this.spread > 0) {
            const angle = (Math.random() - 0.5) * this.spread;
            const axis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            spreadDir.applyAxisAngle(axis, angle);
        }

        projectiles.push(new Projectile(
            origin.clone(),
            spreadDir,
            {
                speed: this.projectileSpeed,
                size: this.projectileSize,
                color: this.projectileColor,
                damage: this.damage,
                lifetime: this.projectileLife,
                weapon: this.name
            }
        ));
    }

    refill() {
        this.ammo = this.maxAmmo;
    }

    getAmmoText() {
        return this.ammo === Infinity ? "∞" : this.ammo;
    }
}

// Standard bullet weapon
class BulletWeapon extends Weapon {
    constructor(name = "Rifle", config = {}) {
        super(name, {
            fireRate: 0.15,
            damage: 1,
            projectileSpeed: 60,
            projectileSize: 0.25,
            projectileColor: 0xff6b00,
            projectileLife: 15,
            ammo: Infinity,
            ...config
        });
    }
}

// Shotgun - fires multiple projectiles
class ShotgunWeapon extends Weapon {
    constructor(name = "Shotgun", config = {}) {
        super(name, {
            fireRate: 0.5,
            damage: 2,
            projectileSpeed: 60,
            projectileSize: 0.4,
            projectileColor: 0xff4400,
            projectileLife: 10,
            ammo: Infinity,
            ...config
        });
        this.pelletsPerShot = config.pelletsPerShot || 6;
        this.spread = Math.PI / 6; // 30 degrees
    }

    createProjectile(origin, direction, projectiles, particles) {
        for (let i = 0; i < this.pelletsPerShot; i++) {
            const spreadDir = direction.clone();
            const angle = (Math.random() - 0.5) * this.spread;
            const axis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            spreadDir.applyAxisAngle(axis, angle);

            projectiles.push(new Projectile(
                origin.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.2)),
                spreadDir,
                {
                    speed: this.projectileSpeed,
                    size: this.projectileSize,
                    color: this.projectileColor,
                    damage: this.damage,
                    lifetime: this.projectileLife,
                    weapon: this.name
                }
            ));
        }
    }
}

// Sniper - single shot, high damage, slow fire rate
class SniperWeapon extends Weapon {
    constructor(name = "Sniper", config = {}) {
        super(name, {
            fireRate: 1.0,
            damage: 5,
            projectileSpeed: 100,
            projectileSize: 0.15,
            projectileColor: 0xffff00,
            projectileLife: 20,
            ammo: Infinity,
            ...config
        });
    }
}

// Rocket - large explosive projectiles
class RocketWeapon extends Weapon {
    constructor(name = "Rocket Launcher", config = {}) {
        super(name, {
            fireRate: 1.0,
            damage: 10,
            projectileSpeed: 40,
            projectileSize: 0.6,
            projectileColor: 0xff0000,
            projectileLife: 15,
            ammo: Infinity,
            ...config
        });
        this.explosionRadius = config.explosionRadius || 3;
    }

    createProjectile(origin, direction, projectiles, particles) {
        projectiles.push(new Projectile(
            origin.clone(),
            direction,
            {
                speed: this.projectileSpeed,
                size: this.projectileSize,
                color: this.projectileColor,
                damage: this.damage,
                lifetime: this.projectileLife,
                weapon: this.name,
                explosion: true,
                explosionRadius: this.explosionRadius
            }
        ));
    }
}

// Weapon manager
class WeaponManager {
    constructor() {
        this.weapons = [];
        this.currentWeaponIndex = 0;
    }

    addWeapon(weapon) {
        this.weapons.push(weapon);
        return weapon;
    }

    getCurrentWeapon() {
        return this.weapons[this.currentWeaponIndex] || null;
    }

    switchWeapon(index) {
        if (index >= 0 && index < this.weapons.length) {
            this.currentWeaponIndex = index;
            return true;
        }
        return false;
    }

    nextWeapon() {
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
    }

    previousWeapon() {
        this.currentWeaponIndex = (this.currentWeaponIndex - 1 + this.weapons.length) % this.weapons.length;
    }

    fire(origin, direction, projectiles, particles) {
        const weapon = this.getCurrentWeapon();
        return weapon ? weapon.fire(origin, direction, projectiles, particles) : false;
    }
}

// Projectile class
class Projectile {
    constructor(position, direction, config = {}) {
        this.position = position.clone();
        this.velocity = direction.clone().multiplyScalar(config.speed || 50);
        this.lifetime = config.lifetime || 10;
        this.age = 0;
        this.damage = config.damage || 1;
        this.size = config.size || 0.3;
        this.color = config.color || 0xff6b00;
        this.weapon = config.weapon || "unknown";
        this.explosion = config.explosion || false;
        this.explosionRadius = config.explosionRadius || 0;
        this.destroyed = false;

        // Create mesh
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        const material = new THREE.MeshStandardMaterial({
            color: this.color,
            emissive: this.color,
            emissiveIntensity: 0.5,
            metalness: 0.5,
            roughness: 0.5
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);
        this.mesh.castShadow = true;
    }

    update(delta) {
        this.age += delta;

        // Apply gravity
        this.velocity.y -= 40 * delta;

        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(delta));
        this.mesh.position.copy(this.position);

        // Rotate based on velocity
        this.mesh.rotation.x += this.velocity.z * delta * 0.01;
        this.mesh.rotation.z += this.velocity.x * delta * 0.01;

        // Out of bounds or lifetime expired
        if (this.age >= this.lifetime || this.position.y < -100) {
            return false;
        }

        return true;
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
