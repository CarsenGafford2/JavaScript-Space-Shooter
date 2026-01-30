// Simple 3D Engine for Voxel FPS
// This is a minimal THREE.js-compatible API for our voxel game

const THREE = {
    // Vector3 class
    Vector3: class {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        set(x, y, z) {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }

        clone() {
            return new THREE.Vector3(this.x, this.y, this.z);
        }

        copy(v) {
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
            return this;
        }

        add(v) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
            return this;
        }

        sub(v) {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
            return this;
        }

        subVectors(a, b) {
            this.x = a.x - b.x;
            this.y = a.y - b.y;
            this.z = a.z - b.z;
            return this;
        }

        multiplyScalar(s) {
            this.x *= s;
            this.y *= s;
            this.z *= s;
            return this;
        }

        normalize() {
            const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            if (length > 0) {
                this.x /= length;
                this.y /= length;
                this.z /= length;
            }
            return this;
        }

        length() {
            return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        }

        distanceTo(v) {
            const dx = this.x - v.x;
            const dy = this.y - v.y;
            const dz = this.z - v.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        }

        applyAxisAngle(axis, angle) {
            // Rotate around Y axis (simplified)
            if (axis.y === 1) {
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                const x = this.x * cos - this.z * sin;
                const z = this.x * sin + this.z * cos;
                this.x = x;
                this.z = z;
            }
            return this;
        }
    },

    // Vector2 class
    Vector2: class {
        constructor(x = 0, y = 0) {
            this.x = x;
            this.y = y;
        }
    },

    // Color class
    Color: class {
        constructor(hex) {
            this.r = 1;
            this.g = 1;
            this.b = 1;
            if (hex !== undefined) {
                this.setHex(hex);
            }
        }

        setHex(hex) {
            this.r = ((hex >> 16) & 255) / 255;
            this.g = ((hex >> 8) & 255) / 255;
            this.b = (hex & 255) / 255;
            return this;
        }

        getHex() {
            return (Math.floor(this.r * 255) << 16) + (Math.floor(this.g * 255) << 8) + Math.floor(this.b * 255);
        }

        setRGB(r, g, b) {
            this.r = r;
            this.g = g;
            this.b = b;
            return this;
        }
    },

    // Scene class
    Scene: class {
        constructor() {
            this.background = null;
            this.fog = null;
            this.children = [];
        }

        add(object) {
            this.children.push(object);
        }

        remove(object) {
            const index = this.children.indexOf(object);
            if (index !== -1) {
                this.children.splice(index, 1);
            }
        }
    },

    // Camera class
    PerspectiveCamera: class {
        constructor(fov, aspect, near, far) {
            this.fov = fov;
            this.aspect = aspect;
            this.near = near;
            this.far = far;
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Vector3();
        }

        updateProjectionMatrix() {
            // Placeholder - not needed for our simplified rendering
        }
    },

    // Renderer class
    WebGLRenderer: class {
        constructor(options = {}) {
            this.domElement = document.createElement('canvas');
            this.context = this.domElement.getContext('2d');
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.domElement.width = this.width;
            this.domElement.height = this.height;
            this.shadowMap = { enabled: false, type: null };
            
            // Store scene data for rendering
            this.voxels = [];
            this.enemies = [];
        }

        setSize(width, height) {
            this.width = width;
            this.height = height;
            this.domElement.width = width;
            this.domElement.height = height;
        }

        render(scene, camera) {
            const ctx = this.context;
            
            // Clear canvas
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(0, 0, this.width, this.height);

            // Simple 3D projection
            const objects = [];
            
            scene.children.forEach(obj => {
                if (obj.geometry && obj.visible !== false) {
                    // Calculate position relative to camera
                    const dx = obj.position.x - camera.position.x;
                    const dy = obj.position.y - camera.position.y;
                    const dz = obj.position.z - camera.position.z;

                    // Rotate based on camera rotation
                    const cosY = Math.cos(-camera.rotation.y);
                    const sinY = Math.sin(-camera.rotation.y);
                    const rotX = dx * cosY - dz * sinY;
                    const rotZ = dx * sinY + dz * cosY;

                    // Skip if behind camera
                    if (rotZ < 0.1) return;

                    // Project to screen space
                    const scale = 500 / rotZ;
                    const screenX = this.width / 2 + rotX * scale;
                    const screenY = this.height / 2 - (dy - camera.position.y) * scale;
                    const size = obj.geometry.size * scale;

                    objects.push({
                        x: screenX,
                        y: screenY,
                        size: size,
                        depth: rotZ,
                        color: obj.material.color,
                        type: obj.geometry.type
                    });
                }
            });

            // Sort by depth (painter's algorithm)
            objects.sort((a, b) => b.depth - a.depth);

            // Draw objects
            objects.forEach(obj => {
                ctx.fillStyle = `rgb(${Math.floor(obj.color.r * 255)}, ${Math.floor(obj.color.g * 255)}, ${Math.floor(obj.color.b * 255)})`;
                
                if (obj.type === 'box') {
                    // Draw as rectangle
                    ctx.fillRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
                    
                    // Add some shading
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(obj.x - obj.size / 2, obj.y - obj.size / 2, obj.size, obj.size);
                }
            });
        }
    },

    // Geometry classes
    BoxGeometry: class {
        constructor(width, height, depth) {
            this.width = width;
            this.height = height;
            this.depth = depth;
            this.size = Math.max(width, height, depth);
            this.type = 'box';
        }
    },

    // Material classes
    MeshLambertMaterial: class {
        constructor(options = {}) {
            this.color = options.color instanceof THREE.Color ? options.color : new THREE.Color(options.color || 0xffffff);
        }

        clone() {
            return new THREE.MeshLambertMaterial({ color: this.color.getHex() });
        }
    },

    // Mesh class
    Mesh: class {
        constructor(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Vector3();
            this.visible = true;
            this.castShadow = false;
            this.receiveShadow = false;
            this.uuid = Math.random().toString(36).substr(2, 9);
        }
    },

    // Light classes
    AmbientLight: class {
        constructor(color, intensity) {
            this.color = new THREE.Color(color);
            this.intensity = intensity;
            this.position = new THREE.Vector3();
        }
    },

    DirectionalLight: class {
        constructor(color, intensity) {
            this.color = new THREE.Color(color);
            this.intensity = intensity;
            this.position = new THREE.Vector3();
            this.shadow = {
                camera: { left: 0, right: 0, top: 0, bottom: 0 },
                mapSize: { width: 0, height: 0 }
            };
            this.castShadow = false;
        }
    },

    // Fog class
    Fog: class {
        constructor(color, near, far) {
            this.color = new THREE.Color(color);
            this.near = near;
            this.far = far;
        }
    },

    // Raycaster class
    Raycaster: class {
        constructor() {
            this.ray = {
                origin: new THREE.Vector3(),
                direction: new THREE.Vector3()
            };
        }

        setFromCamera(coords, camera) {
            // Create ray from camera center (simplified)
            this.ray.origin.copy(camera.position);
            
            // Calculate direction based on camera rotation
            const cosX = Math.cos(camera.rotation.x);
            const sinX = Math.sin(camera.rotation.x);
            const cosY = Math.cos(camera.rotation.y);
            const sinY = Math.sin(camera.rotation.y);
            
            this.ray.direction.set(
                -sinY * cosX,
                -sinX,
                -cosY * cosX
            );
        }

        intersectObjects(objects) {
            const intersects = [];
            
            objects.forEach(obj => {
                // Simple ray-box intersection
                const dx = obj.position.x - this.ray.origin.x;
                const dy = obj.position.y - this.ray.origin.y;
                const dz = obj.position.z - this.ray.origin.z;
                
                // Check if ray passes near the object
                const t = dx * this.ray.direction.x + dy * this.ray.direction.y + dz * this.ray.direction.z;
                
                if (t > 0) {
                    const px = this.ray.origin.x + this.ray.direction.x * t;
                    const py = this.ray.origin.y + this.ray.direction.y * t;
                    const pz = this.ray.origin.z + this.ray.direction.z * t;
                    
                    const size = obj.geometry ? obj.geometry.size / 2 : 2;
                    
                    if (Math.abs(px - obj.position.x) < size &&
                        Math.abs(py - obj.position.y) < size &&
                        Math.abs(pz - obj.position.z) < size) {
                        intersects.push({
                            distance: t,
                            object: obj,
                            point: new THREE.Vector3(px, py, pz)
                        });
                    }
                }
            });
            
            // Sort by distance
            intersects.sort((a, b) => a.distance - b.distance);
            
            return intersects;
        }
    },

    // Clock class
    Clock: class {
        constructor() {
            this.startTime = Date.now();
            this.oldTime = this.startTime;
        }

        getDelta() {
            const newTime = Date.now();
            const delta = (newTime - this.oldTime) / 1000;
            this.oldTime = newTime;
            return delta;
        }
    },

    // Constants
    PCFSoftShadowMap: 1
};
