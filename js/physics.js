// Clean, robust vehicle physics & collision detection for showcase demo
class VehiclePhysics {
    constructor(car) {
        this.car = car;

        // Position & Orientation (2D Ground Plane with Y-up)
        this.position = new THREE.Vector3(0, 0, 0);
        this.heading = 0; // Angle in radians (0 = along +Z axis)
        
        // Dynamics
        this.speed = 0;          // m/s
        this.maxForwardSpeed = 38; // ~137 km/h (realistic road speed)
        this.maxReverseSpeed = -10; // ~36 km/h
        this.accelRate = 18;      // m/s^2
        this.brakeRate = 28;      // m/s^2
        this.frictionDecel = 6.5; // Natural deceleration when coasting
        this.steerAngle = 0;      // Front wheel visual steer angle
        this.maxSteerAngle = 0.52;// ~30 degrees
        
        // Dimensions for collision (OBB/AABB)
        this.length = 4.4;
        this.width = 2.0;
        this.radius = 1.8;

        // Collision status
        this.isColliding = false;
        this.collisionWarning = false;
        this.collisionDistance = 999;
    }

    reset(x = 0, z = 0, heading = 0) {
        this.position.set(x, 0, z);
        this.heading = heading;
        this.speed = 0;
        this.steerAngle = 0;
        this.isColliding = false;
        this.updateCarTransform();
    }

    update(dt, inputs, obstacles, trafficVehicles) {
        // Clamp dt to avoid physics blowup on frame lag
        dt = Math.min(0.05, Math.max(0.001, dt));

        // 1. Acceleration / Throttle
        if (inputs.throttle > 0) {
            if (this.speed < 0) {
                // Braking while in reverse
                this.speed += this.brakeRate * dt;
            } else {
                // Accelerating forward
                const accelFactor = Math.max(0.15, 1.0 - (this.speed / this.maxForwardSpeed));
                this.speed += inputs.throttle * this.accelRate * accelFactor * dt;
            }
        } else if (inputs.brake > 0) {
            if (this.speed > 0.3) {
                // Braking while moving forward
                this.speed -= inputs.brake * this.brakeRate * dt;
                if (this.speed < 0) this.speed = 0;
            } else {
                // Reversing
                this.speed -= inputs.brake * (this.accelRate * 0.5) * dt;
                if (this.speed < this.maxReverseSpeed) this.speed = this.maxReverseSpeed;
            }
        } else {
            // Natural coasting friction
            if (Math.abs(this.speed) > 0.1) {
                const decel = this.frictionDecel * dt;
                if (this.speed > 0) {
                    this.speed = Math.max(0, this.speed - decel);
                } else {
                    this.speed = Math.min(0, this.speed + decel);
                }
            } else {
                this.speed = 0;
            }
        }

        // Handbrake
        if (inputs.handbrake) {
            const hBrake = this.brakeRate * 1.5 * dt;
            if (this.speed > 0) this.speed = Math.max(0, this.speed - hBrake);
            else if (this.speed < 0) this.speed = Math.min(0, this.speed + hBrake);
        }

        // 2. Steering & Yaw Rotation
        const targetSteer = -inputs.steer * this.maxSteerAngle;
        this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1.0, dt * 15);

        // Turn rate depends on speed (cannot turn when completely stopped)
        if (Math.abs(this.speed) > 0.05) {
            // Realistic bicycle car kinematic model: turnRate = (speed / wheelbase) * tan(steerAngle)
            const wheelbase = 2.7;
            const turnRate = (this.speed / wheelbase) * Math.tan(this.steerAngle);
            this.heading += turnRate * dt;
        }

        // Forward vector
        const fwdX = Math.sin(this.heading);
        const fwdZ = Math.cos(this.heading);

        // Compute proposed position
        const nextX = this.position.x + fwdX * this.speed * dt;
        const nextZ = this.position.z + fwdZ * this.speed * dt;

        // 3. Collision Detection with Obstacles and Traffic
        this.isColliding = false;
        this.collisionWarning = false;
        this.collisionDistance = 999;

        // Check proximity radar ahead of car
        const sensorRange = 18.0;
        const sensorPtX = this.position.x + fwdX * 5.0;
        const sensorPtZ = this.position.z + fwdZ * 5.0;

        // Check Obstacles
        if (obstacles && obstacles.length > 0) {
            for (let obs of obstacles) {
                const dx = nextX - obs.position.x;
                const dz = nextZ - obs.position.z;
                const distSq = dx * dx + dz * dz;
                const minDist = this.radius + obs.radius;

                // Sensor warning check
                const sensorDist = Math.hypot(sensorPtX - obs.position.x, sensorPtZ - obs.position.z);
                if (sensorDist < this.collisionDistance) {
                    this.collisionDistance = sensorDist;
                }
                if (sensorDist < sensorRange) {
                    this.collisionWarning = true;
                }

                // Physical collision check
                if (distSq < minDist * minDist) {
                    this.isColliding = true;
                    // Bump/bounce reaction
                    const dist = Math.sqrt(distSq) || 0.001;
                    const pushX = (dx / dist) * (minDist - dist);
                    const pushZ = (dz / dist) * (minDist - dist);
                    
                    this.position.x += pushX * 0.5;
                    this.position.z += pushZ * 0.5;
                    this.speed *= -0.25; // Gentle bounce

                    if (obs.onHit) {
                        obs.onHit(this.speed, fwdX, fwdZ);
                    }
                }
            }
        }

        // Check Traffic Vehicles
        if (trafficVehicles && trafficVehicles.length > 0) {
            for (let traffic of trafficVehicles) {
                const dx = nextX - traffic.position.x;
                const dz = nextZ - traffic.position.z;
                const distSq = dx * dx + dz * dz;
                const minDist = this.radius + traffic.radius;

                // Sensor warning check
                const sensorDist = Math.hypot(sensorPtX - traffic.position.x, sensorPtZ - traffic.position.z);
                if (sensorDist < this.collisionDistance) {
                    this.collisionDistance = sensorDist;
                }
                if (sensorDist < sensorRange) {
                    this.collisionWarning = true;
                }

                // Physical collision
                if (distSq < minDist * minDist) {
                    this.isColliding = true;
                    const dist = Math.sqrt(distSq) || 0.001;
                    const pushX = (dx / dist) * (minDist - dist);
                    const pushZ = (dz / dist) * (minDist - dist);

                    this.position.x += pushX * 0.6;
                    this.position.z += pushZ * 0.6;
                    this.speed = traffic.speed * 0.5; // Match traffic speed or bounce
                    traffic.onCollision();
                }
            }
        }

        // Road boundaries constraint (prevent driving off into empty void)
        const roadHalfWidth = 26; // 6-lane road with shoulders
        if (Math.abs(nextX) > roadHalfWidth) {
            this.speed *= 0.5;
            this.position.x = Math.sign(nextX) * roadHalfWidth;
        } else {
            this.position.x = nextX;
        }
        this.position.z = nextZ;

        // 4. Update 3D Visual Mesh Transform
        this.updateCarTransform();

        // 5. Update Car Visuals (Spin wheels, turn front wheels, brake light intensity)
        const isBraking = inputs.brake > 0.1 || (inputs.throttle === 0 && this.speed > 5);
        this.car.update(dt, this.speed, this.steerAngle, inputs.throttle, isBraking);
    }

    updateCarTransform() {
        this.car.group.position.set(this.position.x, 0, this.position.z);
        this.car.group.rotation.set(0, this.heading, 0);
    }
}

window.VehiclePhysics = VehiclePhysics;
