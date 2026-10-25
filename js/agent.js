// Autonomous Q-Learning Car Agent with Multi-Ray Laser Sensors and Visual Telemetry
class QLearningAgent {
    constructor(id, scene, brain, colorHex = 0x0284c7) {
        this.id = id;
        this.scene = scene;
        this.brain = brain;
        this.colorHex = colorHex;

        // Kinematics & Physics
        this.position = new THREE.Vector3(0, 0, 0);
        this.heading = 0; // 0 = pointing along +Z axis
        this.speed = 0;
        this.maxSpeed = 26; // ~94 km/h
        this.steerAngle = 0;
        this.maxSteerAngle = 0.52;
        this.radius = 1.8;

        // Raycast Rangefinder Sensors (5 angles: -45°, -20°, 0°, +20°, +45°)
        this.rayAngles = [-0.78, -0.35, 0.0, 0.35, 0.78];
        this.maxRayDist = 32.0;
        this.rayDistances = new Float32Array(5).fill(this.maxRayDist);

        // Q-Learning Agent State Lifecycle
        this.lastState = null;
        this.lastAction = 0;
        this.episodeReward = 0;
        this.aliveTime = 0;
        this.steps = 0;
        this.hasNearMiss = false;

        // 3D Visual Mesh & Sensor Laser Beams
        this.buildVisuals();
        this.reset();
    }

    buildVisuals() {
        this.group = new THREE.Group();

        // 1. Car Body
        const bodyMat = new THREE.MeshStandardMaterial({
            color: this.colorHex,
            metalness: 0.85,
            roughness: 0.22
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            metalness: 0.9,
            roughness: 0.1
        });
        const carbonMat = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.5
        });

        // Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.44, 4.2), bodyMat);
        chassis.position.y = 0.45;
        chassis.castShadow = true;
        this.group.add(chassis);

        // Cabin
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 2.0), glassMat);
        cabin.position.set(0, 0.8, -0.2);
        cabin.castShadow = true;
        this.group.add(cabin);

        // Roof
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 1.4), bodyMat);
        roof.position.set(0, 1.04, -0.2);
        this.group.add(roof);

        // Front Splitter
        const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.08, 0.4), carbonMat);
        splitter.position.set(0, 0.18, 2.15);
        this.group.add(splitter);

        // Headlights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-0.7, 0.7].forEach(x => {
            const h = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), headlightMat);
            h.position.set(x, 0.48, 2.12);
            this.group.add(h);
        });

        // Taillights
        this.brakeLightMat = new THREE.MeshStandardMaterial({
            color: 0x660005,
            emissive: 0xff0022,
            emissiveIntensity: 0.8
        });
        const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 0.06), this.brakeLightMat);
        taillight.position.set(0, 0.55, -2.12);
        this.group.add(taillight);

        // Wheels
        this.wheels = [];
        this.frontWheels = [];
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.9 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });

        const wheelCoords = [
            [-0.96, 0.32, 1.35, true],
            [0.96, 0.32, 1.35, true],
            [-0.98, 0.32, -1.35, false],
            [0.98, 0.32, -1.35, false]
        ];

        wheelCoords.forEach(([x, y, z, isFront]) => {
            const holder = new THREE.Group();
            holder.position.set(x, y, z);

            const hub = new THREE.Group();
            holder.add(hub);

            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 16), wheelMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            hub.add(tire);

            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.27, 12), rimMat);
            rim.rotation.z = Math.PI / 2;
            hub.add(rim);

            this.group.add(holder);
            this.wheels.push(hub);
            if (isFront) this.frontWheels.push(holder);
        });

        // Overhead Agent ID Banner / Marker
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(4, 4, 120, 56);
        ctx.strokeStyle = `#${this.colorHex.toString(16).padStart(6, '0')}`;
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 120, 56);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`AI #${this.id}`, 64, 32);

        const badgeTex = new THREE.CanvasTexture(canvas);
        const badgeMat = new THREE.SpriteMaterial({ map: badgeTex, depthTest: false });
        const badge = new THREE.Sprite(badgeMat);
        badge.position.set(0, 2.3, 0);
        badge.scale.set(2.2, 1.1, 1);
        this.group.add(badge);

        // Visual Laser Sensor Lines (rendered in front of car)
        this.sensorLines = [];
        this.sensorGeoms = [];
        for (let i = 0; i < 5; i++) {
            const geom = new THREE.BufferGeometry();
            const positions = new Float32Array(6); // 2 vertices: start & end
            geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const mat = new THREE.LineBasicMaterial({
                color: 0x22c55e,
                transparent: true,
                opacity: 0.65,
                linewidth: 2
            });

            const line = new THREE.Line(geom, mat);
            line.frustumCulled = false;
            this.scene.add(line);

            this.sensorLines.push(line);
            this.sensorGeoms.push(geom);
        }

        this.scene.add(this.group);
    }

    reset(startZ = null) {
        // Safe lane spawn coordinates (-6m, 0m, +6m)
        const lanes = [-6.0, 0.0, 6.0];
        const chosenLane = lanes[Math.floor(Math.random() * lanes.length)];

        // Stagger spawn along Z axis
        const z = (startZ !== null) ? startZ : (-20 - this.id * 35);
        this.position.set(chosenLane, 0, z);
        this.heading = 0; // facing forward (+Z)
        this.speed = 10 + Math.random() * 6; // Initial roll
        this.steerAngle = 0;
        this.episodeReward = 0;
        this.aliveTime = 0;
        this.steps = 0;
        this.hasNearMiss = false;
        this.lastState = null;

        this.updateTransform();
    }

    // Fast 2D Rangefinder Raycast against Obstacles, Traffic, Road Curbs and Other Agents
    computeSensors(obstacles, trafficVehicles, otherAgents) {
        const originX = this.position.x;
        const originZ = this.position.z;
        const carHeading = this.heading;

        const roadHalfWidth = 12.0; // Left & Right curbs at X = -12 and X = +12

        for (let i = 0; i < 5; i++) {
            const angle = carHeading + this.rayAngles[i];
            const rayDirX = Math.sin(angle);
            const rayDirZ = Math.cos(angle);

            let closestDist = this.maxRayDist;

            // 1. Raycast against Left & Right Road Curbs (plane X = -12 and X = +12)
            if (Math.abs(rayDirX) > 0.001) {
                // Left curb (X = -roadHalfWidth)
                const tLeft = (-roadHalfWidth - originX) / rayDirX;
                if (tLeft > 0 && tLeft < closestDist) {
                    closestDist = tLeft;
                }
                // Right curb (X = +roadHalfWidth)
                const tRight = (roadHalfWidth - originX) / rayDirX;
                if (tRight > 0 && tRight < closestDist) {
                    closestDist = tRight;
                }
            }

            // 2. Analytical 2D Ray-Circle check against Obstacles
            if (obstacles) {
                for (let obs of obstacles) {
                    const vx = obs.position.x - originX;
                    const vz = obs.position.z - originZ;
                    const t = vx * rayDirX + vz * rayDirZ;
                    if (t > 0 && t < closestDist) {
                        const perpSq = (vx * vx + vz * vz) - (t * t);
                        const rSq = (obs.radius + 0.3) * (obs.radius + 0.3);
                        if (perpSq <= rSq) {
                            const hitDist = t - Math.sqrt(Math.max(0, rSq - perpSq));
                            if (hitDist > 0 && hitDist < closestDist) {
                                closestDist = hitDist;
                            }
                        }
                    }
                }
            }

            // 3. Analytical 2D Ray-Circle check against Traffic Vehicles
            if (trafficVehicles) {
                for (let v of trafficVehicles) {
                    const vx = v.position.x - originX;
                    const vz = v.position.z - originZ;
                    const t = vx * rayDirX + vz * rayDirZ;
                    if (t > 0 && t < closestDist) {
                        const perpSq = (vx * vx + vz * vz) - (t * t);
                        const rSq = (v.radius + 0.4) * (v.radius + 0.4);
                        if (perpSq <= rSq) {
                            const hitDist = t - Math.sqrt(Math.max(0, rSq - perpSq));
                            if (hitDist > 0 && hitDist < closestDist) {
                                closestDist = hitDist;
                            }
                        }
                    }
                }
            }

            // 4. Analytical Ray-Circle check against Other Agents
            if (otherAgents) {
                for (let agent of otherAgents) {
                    if (agent.id === this.id) continue;
                    const vx = agent.position.x - originX;
                    const vz = agent.position.z - originZ;
                    const t = vx * rayDirX + vz * rayDirZ;
                    if (t > 0 && t < closestDist) {
                        const perpSq = (vx * vx + vz * vz) - (t * t);
                        const rSq = (agent.radius + 0.3) * (agent.radius + 0.3);
                        if (perpSq <= rSq) {
                            const hitDist = t - Math.sqrt(Math.max(0, rSq - perpSq));
                            if (hitDist > 0 && hitDist < closestDist) {
                                closestDist = hitDist;
                            }
                        }
                    }
                }
            }

            this.rayDistances[i] = Math.max(0.1, Math.min(this.maxRayDist, closestDist));

            // Update visual laser beam
            this.updateLaserVisual(i, originX, originZ, rayDirX, rayDirZ, this.rayDistances[i]);
        }
    }

    updateLaserVisual(rayIdx, originX, originZ, dirX, dirZ, dist) {
        const geom = this.sensorGeoms[rayIdx];
        const line = this.sensorLines[rayIdx];
        const pos = geom.attributes.position;

        const startY = 0.45;
        // Bumper forward offset ~2.1m
        const bumperX = originX + dirX * 1.5;
        const bumperZ = originZ + dirZ * 1.5;

        pos.setXYZ(0, bumperX, startY, bumperZ);
        pos.setXYZ(1, bumperX + dirX * dist, startY, bumperZ + dirZ * dist);
        pos.needsUpdate = true;

        // Dynamic laser color: Green (safe) -> Yellow (warning) -> Red (critical danger)
        if (dist < 6.5) {
            line.material.color.setHex(0xef4444); // Red
            line.material.opacity = 0.85;
        } else if (dist < 15.0) {
            line.material.color.setHex(0xf59e0b); // Amber
            line.material.opacity = 0.65;
        } else {
            line.material.color.setHex(0x10b981); // Emerald Green
            line.material.opacity = 0.4;
        }
    }

    // High-performance State Discretization (~400 unique states)
    getDiscretizedState() {
        // 1. Lane bucket: Road ranges from X: -12 to +12
        // Normal lanes centered at -6, 0, +6
        let laneBucket = 'C';
        if (this.position.x < -8.5) laneBucket = 'L_OFF';
        else if (this.position.x < -3.5) laneBucket = 'L1';
        else if (this.position.x <= 3.5) laneBucket = 'C';
        else if (this.position.x <= 8.5) laneBucket = 'R1';
        else laneBucket = 'R_OFF';

        // 2. Heading alignment (heading relative to road axis 0)
        let headBucket = 'S'; // Straight
        const h = this.heading;
        if (h < -0.16) headBucket = 'L'; // Turning left
        else if (h > 0.16) headBucket = 'R'; // Turning right

        // 3. Proximity zones (Left [0,1], Center [2], Right [3,4])
        const leftMin = Math.min(this.rayDistances[0], this.rayDistances[1]);
        const centerDist = this.rayDistances[2];
        const rightMin = Math.min(this.rayDistances[3], this.rayDistances[4]);

        const proxBucket = (d) => (d < 6.5 ? '0' : (d < 16.0 ? '1' : '2'));
        const lP = proxBucket(leftMin);
        const cP = proxBucket(centerDist);
        const rP = proxBucket(rightMin);

        // 4. Speed level
        let spdBucket = 'M';
        if (this.speed < 6.0) spdBucket = 'L';
        else if (this.speed > 18.0) spdBucket = 'H';

        return `${laneBucket}_${headBucket}_L${lP}C${cP}R${rP}_${spdBucket}`;
    }

    // Execute Selected Action
    applyAction(action, dt) {
        // Actions:
        // 0: Accelerate Forward
        // 1: Steer Left + Gas
        // 2: Steer Right + Gas
        // 3: Brake / Decelerate
        // 4: Hard Steer Left
        // 5: Hard Steer Right
        let throttle = 0;
        let brake = 0;
        let steerTarget = 0;

        switch (action) {
            case 0: // Forward
                throttle = 1.0;
                steerTarget = 0;
                break;
            case 1: // Steer Left + Gas
                throttle = 0.85;
                steerTarget = 0.35;
                break;
            case 2: // Steer Right + Gas
                throttle = 0.85;
                steerTarget = -0.35;
                break;
            case 3: // Brake
                brake = 1.0;
                steerTarget = 0;
                break;
            case 4: // Hard Steer Left
                throttle = 0.4;
                steerTarget = 0.65;
                break;
            case 5: // Hard Steer Right
                throttle = 0.4;
                steerTarget = -0.65;
                break;
        }

        // Apply throttle / brake
        if (throttle > 0) {
            const powerCurve = Math.max(0.15, 1.0 - (this.speed / this.maxSpeed));
            this.speed += throttle * 16.0 * powerCurve * dt;
        } else if (brake > 0) {
            this.speed = Math.max(0, this.speed - 24.0 * dt);
        } else {
            this.speed = Math.max(0, this.speed - 5.0 * dt);
        }

        // Smooth steering
        this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1.0, dt * 14.0);

        // Kinematic yaw rotation
        if (this.speed > 0.05) {
            const wheelbase = 2.7;
            const turnRate = (this.speed / wheelbase) * Math.tan(this.steerAngle);
            this.heading += turnRate * dt;
        }

        // Forward motion
        const fwdX = Math.sin(this.heading);
        const fwdZ = Math.cos(this.heading);
        this.position.x += fwdX * this.speed * dt;
        this.position.z += fwdZ * this.speed * dt;

        // Front wheels visual steer
        this.frontWheels.forEach(w => w.rotation.y = this.steerAngle);

        // Spin wheels
        const wheelSpin = (this.speed / 0.33) * dt;
        this.wheels.forEach(hub => hub.rotation.x += wheelSpin);

        // Brake light intensity
        this.brakeLightMat.emissiveIntensity = (brake > 0.1 || action === 3) ? 2.8 : 0.8;
    }

    // Step Q-Learning Cycle
    step(dt, obstacles, trafficVehicles, otherAgents) {
        this.steps++;
        this.aliveTime += dt;

        // 1. Compute Sensors
        this.computeSensors(obstacles, trafficVehicles, otherAgents);

        // 2. Current State
        const currentState = this.getDiscretizedState();

        // 3. Update Q-learning with previous experience: (s, a, r, s')
        if (this.lastState !== null) {
            const reward = this.calculateReward();
            this.episodeReward += reward;

            const isCollision = this.checkCollision(obstacles, trafficVehicles, otherAgents);
            const isOffroad = Math.abs(this.position.x) > 11.5;
            const isTerminal = isCollision || isOffroad;

            this.brain.update(this.lastState, this.lastAction, reward, currentState, isTerminal);

            if (isTerminal) {
                if (isCollision) this.brain.totalCollisions++;
                this.brain.endEpisode(this.episodeReward);
                // Respawn agent
                this.reset();
                return;
            }
        }

        // 4. Select Action via Epsilon-Greedy Policy
        const action = this.brain.selectAction(currentState);

        // 5. Apply Kinematics
        this.applyAction(action, dt);
        this.updateTransform();

        // Store for next step
        this.lastState = currentState;
        this.lastAction = action;
    }

    calculateReward() {
        let reward = 0;

        // 1. Reward for forward velocity (promotes driving forward efficiently)
        reward += (this.speed / this.maxSpeed) * 2.2;

        // 2. Lane keeping reward (drives in legitimate lanes)
        const posX = Math.abs(this.position.x);
        if (posX <= 8.5) {
            reward += 1.2; // Inside valid lane boundaries
            // Bonus for near lane center (-6, 0, +6)
            const dLane = Math.min(Math.abs(this.position.x + 6), Math.abs(this.position.x), Math.abs(this.position.x - 6));
            if (dLane < 0.8) reward += 0.8;
        } else {
            // Straddling road shoulder or edge
            reward -= 4.0;
        }

        // 3. Proximity Danger Penalty
        const centerDist = this.rayDistances[2];
        const minRay = Math.min(...this.rayDistances);

        if (minRay < 5.0) {
            reward -= 7.0; // Very high proximity danger!
            this.hasNearMiss = true;
        } else if (minRay < 12.0) {
            reward -= 2.5; // Warning zone
            this.hasNearMiss = true;
        } else if (this.hasNearMiss && minRay > 18.0) {
            // Successfully navigated past an obstacle!
            reward += 12.0;
            this.hasNearMiss = false;
            this.brain.totalAvoidances++;
        }

        // 4. Discourage stopping / reverse in the middle of highway
        if (this.speed < 2.0) {
            reward -= 3.0;
        }

        return reward;
    }

    checkCollision(obstacles, trafficVehicles, otherAgents) {
        // Physical bounding circle collision
        const myX = this.position.x;
        const myZ = this.position.z;

        // Check Obstacles
        if (obstacles) {
            for (let obs of obstacles) {
                const distSq = (myX - obs.position.x) ** 2 + (myZ - obs.position.z) ** 2;
                const minDist = this.radius + obs.radius;
                if (distSq < minDist * minDist) {
                    obs.onHit(this.speed, Math.sin(this.heading), Math.cos(this.heading));
                    return true;
                }
            }
        }

        // Check Traffic
        if (trafficVehicles) {
            for (let v of trafficVehicles) {
                const distSq = (myX - v.position.x) ** 2 + (myZ - v.position.z) ** 2;
                const minDist = this.radius + v.radius;
                if (distSq < minDist * minDist) {
                    v.onCollision();
                    return true;
                }
            }
        }

        // Check Other Q-Agents
        if (otherAgents) {
            for (let agent of otherAgents) {
                if (agent.id === this.id) continue;
                const distSq = (myX - agent.position.x) ** 2 + (myZ - agent.position.z) ** 2;
                const minDist = this.radius + agent.radius;
                if (distSq < minDist * minDist) {
                    return true;
                }
            }
        }

        return false;
    }

    updateTransform() {
        this.group.position.copy(this.position);
        this.group.rotation.set(0, this.heading, 0);
    }

    dispose() {
        this.scene.remove(this.group);
        this.sensorLines.forEach(l => this.scene.remove(l));
    }
}

window.QLearningAgent = QLearningAgent;
