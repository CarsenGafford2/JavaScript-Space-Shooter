// ============================================================================
// PHYSICS ENGINE - Handles collision detection and physics simulation
// ============================================================================

class PhysicsEngine {
    constructor() {
        this.bodies = [];
        this.gravity = new THREE.Vector3(0, -40, 0);
        this.damping = 0.98;
    }

    // Register a physics body
    addBody(body) {
        this.bodies.push(body);
        return body;
    }

    removeBody(body) {
        const idx = this.bodies.indexOf(body);
        if (idx !== -1) this.bodies.splice(idx, 1);
    }

    // Update all physics bodies
    update(delta) {
        this.bodies.forEach(body => {
            if (!body.dynamic) return;

            // Apply gravity
            body.velocity.add(this.gravity.clone().multiplyScalar(delta));

            // Apply damping (friction with air)
            body.velocity.multiplyScalar(this.damping);

            // Update position
            body.position.add(body.velocity.clone().multiplyScalar(delta));

            // Update mesh position
            if (body.mesh) {
                body.mesh.position.copy(body.position);
            }

            // Update group position if applicable
            if (body.group) {
                body.group.position.copy(body.position);
            }

            // Lifetime decay
            if (body.lifetime !== undefined) {
                body.lifetime -= delta;
            }
        });
    }

    // Simple AABB collision test
    checkAABBCollision(box1, box2) {
        const margin = 0.1;
        return (
            box1.min.x - margin < box2.max.x &&
            box1.max.x + margin > box2.min.x &&
            box1.min.y - margin < box2.max.y &&
            box1.max.y + margin > box2.min.y &&
            box1.min.z - margin < box2.max.z &&
            box1.max.z + margin > box2.min.z
        );
    }

    // Get bounding box for a voxel
    getVoxelBounds(position, size = 0.5) {
        const half = size / 2;
        return {
            min: position.clone().sub(new THREE.Vector3(half, half, half)),
            max: position.clone().add(new THREE.Vector3(half, half, half)),
            center: position.clone()
        };
    }

    // Get bounding box for a sphere (player, enemy)
    getSphereBounds(position, radius) {
        return {
            min: position.clone().sub(new THREE.Vector3(radius, radius, radius)),
            max: position.clone().add(new THREE.Vector3(radius, radius, radius)),
            center: position.clone(),
            radius: radius
        };
    }

    // Ray casting for more accurate collision
    rayCastToVoxels(origin, direction, maxDistance, voxels) {
        const hits = [];
        const rayEnd = origin.clone().add(direction.clone().multiplyScalar(maxDistance));

        voxels.forEach(voxel => {
            const bounds = this.getVoxelBounds(voxel.position, voxel.size);
            
            // Check if ray intersects voxel
            const t = this.rayBoxIntersection(origin, direction, bounds);
            if (t !== null && t >= 0 && t <= maxDistance) {
                hits.push({
                    voxel: voxel,
                    distance: t,
                    point: origin.clone().add(direction.clone().multiplyScalar(t))
                });
            }
        });

        return hits.sort((a, b) => a.distance - b.distance);
    }

    // Ray-box intersection test
    rayBoxIntersection(rayOrigin, rayDir, box) {
        const tMin = new THREE.Vector3(
            (box.min.x - rayOrigin.x) / (rayDir.x || 0.0001),
            (box.min.y - rayOrigin.y) / (rayDir.y || 0.0001),
            (box.min.z - rayOrigin.z) / (rayDir.z || 0.0001)
        );

        const tMax = new THREE.Vector3(
            (box.max.x - rayOrigin.x) / (rayDir.x || 0.0001),
            (box.max.y - rayOrigin.y) / (rayDir.y || 0.0001),
            (box.max.z - rayOrigin.z) / (rayDir.z || 0.0001)
        );

        let t1 = Math.min(tMin.x, tMax.x);
        let t2 = Math.min(tMin.y, tMax.y);
        let t3 = Math.min(tMin.z, tMax.z);
        let t4 = Math.max(tMin.x, tMax.x);
        let t5 = Math.max(tMin.y, tMax.y);
        let t6 = Math.max(tMin.z, tMax.z);

        const tNear = Math.max(t1, t2, t3);
        const tFar = Math.min(t4, t5, t6);

        if (tNear > tFar || tFar < 0) return null;
        return tNear >= 0 ? tNear : tFar;
    }

    // Distance check (faster for simple checks)
    checkSphereCollision(pos1, radius1, pos2, radius2) {
        return pos1.distanceTo(pos2) < (radius1 + radius2);
    }
}
