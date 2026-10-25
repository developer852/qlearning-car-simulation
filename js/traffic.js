// Traffic Vehicles (Autonomous AI Agents) for showcase demo
class TrafficManager {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];

        this.initTraffic();
    }

    createTrafficCar(colorHex, type = 'sedan') {
        const group = new THREE.Group();

        // Materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            roughness: 0.25,
            metalness: 0.8
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x111c24,
            roughness: 0.1,
            metalness: 0.9
        });
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0x1f242d,
            roughness: 0.5
        });
        const wheelMat = new THREE.MeshStandardMaterial({
            color: 0x151515,
            roughness: 0.8
        });
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.8,
            roughness: 0.2
        });

        // 1. Lower Body & Chassis
        const bodyL = (type === 'suv') ? 4.5 : 4.2;
        const bodyW = (type === 'suv') ? 2.0 : 1.9;
        const bodyH = (type === 'suv') ? 0.65 : 0.48;

        const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyL), bodyMat);
        baseMesh.position.y = 0.45;
        baseMesh.castShadow = true;
        group.add(baseMesh);

        // 2. Cabin / Greenhouse Roof
        const cabinL = (type === 'suv') ? 2.8 : 2.2;
        const cabinH = (type === 'suv') ? 0.65 : 0.5;
        const cabinW = bodyW * 0.86;
        const cabinZ = (type === 'suv') ? -0.2 : -0.25;

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinW, cabinH, cabinL), glassMat);
        cabin.position.set(0, 0.45 + bodyH / 2 + cabinH / 2 - 0.05, cabinZ);
        cabin.castShadow = true;
        group.add(cabin);

        // Roof panel
        const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinW * 0.95, 0.06, cabinL * 0.9), bodyMat);
        roof.position.set(0, cabin.position.y + cabinH / 2 + 0.02, cabinZ);
        group.add(roof);

        // 3. Headlights & Taillights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
        [-0.7, 0.7].forEach(x => {
            const h = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.08), headlightMat);
            h.position.set(x, 0.5, bodyL / 2 + 0.02);
            group.add(h);
        });

        // Rear Brake Light Bar
        const brakeLightMat = new THREE.MeshStandardMaterial({
            color: 0x660005,
            emissive: 0xff0022,
            emissiveIntensity: 0.6,
            roughness: 0.3
        });
        const brakeMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.9, 0.1, 0.06), brakeLightMat);
        brakeMesh.position.set(0, 0.55, -bodyL / 2 - 0.02);
        group.add(brakeMesh);

        // 4. Wheels
        const wheels = [];
        const wheelY = 0.34;
        const wheelX = bodyW / 2 + 0.04;
        const wheelZ = bodyL / 2 - 0.9;

        const wheelPositions = [
            [-wheelX, wheelY, wheelZ],
            [wheelX, wheelY, wheelZ],
            [-wheelX, wheelY, -wheelZ],
            [wheelX, wheelY, -wheelZ]
        ];

        wheelPositions.forEach(pos => {
            const wheelHolder = new THREE.Group();
            wheelHolder.position.set(pos[0], pos[1], pos[2]);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16), wheelMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelHolder.add(tire);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.29, 12), rimMat);
            rim.rotation.z = Math.PI / 2;
            wheelHolder.add(rim);

            group.add(wheelHolder);
            wheels.push(wheelHolder);
        });

        this.scene.add(group);

        return {
            group,
            brakeLightMat,
            wheels,
            radius: 1.7
        };
    }

    initTraffic() {
        // Vehicle configurations in different lanes
        // Lanes: Left Lane (-6m), Middle Lane (0m), Right Lane (+6m)
        const trafficConfigs = [
            { laneX: -6.0, z: 60,  speedKmh: 58, color: 0x2563eb, type: 'sedan' },  // Blue sedan
            { laneX: 6.0,  z: 90,  speedKmh: 65, color: 0xdc2626, type: 'suv' },    // Red SUV
            { laneX: 0.0,  z: 160, speedKmh: 50, color: 0xf3f4f6, type: 'sedan' },  // White sedan
            { laneX: -6.0, z: 280, speedKmh: 62, color: 0x10b981, type: 'sedan' },  // Green sedan
            { laneX: 6.0,  z: 360, speedKmh: 70, color: 0xf59e0b, type: 'suv' },    // Amber SUV
            { laneX: 0.0,  z: 460, speedKmh: 55, color: 0x475569, type: 'sedan' },  // Slate sedan
            { laneX: -6.0, z: 580, speedKmh: 64, color: 0x9333ea, type: 'sedan' },  // Purple sedan
            { laneX: 6.0,  z: 700, speedKmh: 68, color: 0x0284c7, type: 'suv' }     // Cyan SUV
        ];

        trafficConfigs.forEach(cfg => {
            const carData = this.createTrafficCar(cfg.color, cfg.type);
            const cruiseSpeed = (cfg.speedKmh / 3.6); // convert to m/s

            const vehicle = {
                group: carData.group,
                brakeLightMat: carData.brakeLightMat,
                wheels: carData.wheels,
                radius: carData.radius,
                laneX: cfg.laneX,
                position: carData.group.position,
                speed: cruiseSpeed,
                targetSpeed: cruiseSpeed,
                minSpeed: 0,
                isBraking: false,
                onCollision() {
                    this.speed = Math.max(0, this.speed - 5);
                }
            };
            this.vehicles.push(vehicle);

            // Set initial position
            carData.group.position.set(cfg.laneX, 0, cfg.z);
            carData.group.rotation.y = 0; // facing forward (+Z)
        });
    }

    update(dt, playerPosition, playerSpeed) {
        dt = Math.min(0.05, dt);

        for (let i = 0; i < this.vehicles.length; i++) {
            const v = this.vehicles[i];

            // 1. Check distance to player car in the same lane
            let mustBrake = false;
            const distToPlayerZ = playerPosition.z - v.position.z;
            const distToPlayerX = Math.abs(playerPosition.x - v.laneX);

            // If player is directly ahead within 18m in same lane
            if (distToPlayerZ > 0 && distToPlayerZ < 22 && distToPlayerX < 2.8) {
                if (v.speed > playerSpeed) {
                    mustBrake = true;
                }
            }

            // 2. Check distance to other traffic vehicles ahead in same lane
            for (let j = 0; j < this.vehicles.length; j++) {
                if (i === j) continue;
                const other = this.vehicles[j];
                const dz = other.position.z - v.position.z;
                const dx = Math.abs(other.laneX - v.laneX);

                if (dx < 1.5 && dz > 0 && dz < 18) {
                    if (v.speed > other.speed) {
                        mustBrake = true;
                    }
                }
            }

            // 3. Acceleration / Deceleration Logic
            if (mustBrake) {
                v.speed = Math.max(0, v.speed - 12 * dt);
                v.isBraking = true;
            } else {
                if (v.speed < v.targetSpeed) {
                    v.speed = Math.min(v.targetSpeed, v.speed + 6 * dt);
                }
                v.isBraking = false;
            }

            // 4. Update Position
            v.position.z += v.speed * dt;
            // Keep strictly aligned to lane center
            v.position.x = v.laneX;

            // 5. Wrap around road span (infinite roadway feel)
            // When traffic car gets too far ahead or behind player, wrap it
            const relativeZ = v.position.z - playerPosition.z;
            if (relativeZ > 450) {
                v.position.z = playerPosition.z - 250 - Math.random() * 80;
            } else if (relativeZ < -300) {
                v.position.z = playerPosition.z + 400 + Math.random() * 80;
            }

            // 6. Wheel Spin
            const wheelSpin = (v.speed / 0.34) * dt;
            v.wheels.forEach(w => {
                w.children[0].rotation.x += wheelSpin;
            });

            // 7. Brake light illumination
            v.brakeLightMat.emissiveIntensity = v.isBraking ? 2.5 : 0.6;
            v.brakeLightMat.color.setHex(v.isBraking ? 0xff0022 : 0x660005);
        }
    }

    getVehicles() {
        return this.vehicles;
    }
}

window.TrafficManager = TrafficManager;
