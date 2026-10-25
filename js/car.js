// High-quality showcase vehicle model with rotating wheels, steering & reactive brake lights
class ShowcaseCar {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        this.wheels = [];
        this.frontWheels = [];
        this.brakeLightMat = null;
        this.wheelRotation = 0;

        this.buildCar();
        this.scene.add(this.group);
    }

    buildCar() {
        // High-end automotive materials
        const paintMat = new THREE.MeshPhysicalMaterial({
            color: 0x0284c7, // Vibrant electric blue metallic
            metalness: 0.85,
            roughness: 0.2,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        const carbonMat = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            roughness: 0.5,
            metalness: 0.8
        });

        const glassMat = new THREE.MeshPhysicalMaterial({
            color: 0x0b1320,
            metalness: 0.9,
            roughness: 0.05,
            transmission: 0.4,
            transparent: true,
            opacity: 0.88
        });

        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            metalness: 0.95,
            roughness: 0.15
        });

        // 1. Lower Chassis & Front Splitter
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.2, 4.3), carbonMat);
        chassis.position.y = 0.25;
        chassis.castShadow = true;
        this.group.add(chassis);

        const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.4), carbonMat);
        splitter.position.set(0, 0.18, 2.2);
        this.group.add(splitter);

        // 2. Main Sculpted Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.48, 2.3), paintMat);
        body.position.set(0, 0.52, -0.1);
        body.castShadow = true;
        this.group.add(body);

        // Sloping Front Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.35, 1.8), paintMat);
        hood.position.set(0, 0.46, 1.35);
        hood.rotation.x = 0.08;
        hood.castShadow = true;
        this.group.add(hood);

        // Rear Trunk Deck
        const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.42, 1.4), paintMat);
        trunk.position.set(0, 0.52, -1.35);
        trunk.castShadow = true;
        this.group.add(trunk);

        // 3. Cabin & Glass Canopy
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.46, 1.8), glassMat);
        cabin.position.set(0, 0.88, -0.15);
        cabin.castShadow = true;
        this.group.add(cabin);

        // Roof panel
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 1.3), paintMat);
        roof.position.set(0, 1.12, -0.2);
        this.group.add(roof);

        // Side Mirrors
        [-0.92, 0.92].forEach(x => {
            const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.15), paintMat);
            mirror.position.set(x, 0.82, 0.65);
            mirror.castShadow = true;
            this.group.add(mirror);
        });

        // 4. Modern LED Headlights
        const headlightMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
        [-0.72, 0.72].forEach(x => {
            const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.08), headlightMat);
            lamp.position.set(x, 0.48, 2.16);
            this.group.add(lamp);

            // Forward headlight spot
            const spot = new THREE.SpotLight(0xffffff, 1.8, 45, Math.PI / 6, 0.3, 1.2);
            spot.position.set(x, 0.5, 2.2);
            const target = new THREE.Object3D();
            target.position.set(x, 0, 25);
            this.group.add(target);
            spot.target = target;
            this.group.add(spot);
        });

        // 5. Full-Width Rear OLED Taillight Strip
        this.brakeLightMat = new THREE.MeshStandardMaterial({
            color: 0x660005,
            emissive: 0xff0022,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        const taillight = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.09, 0.08), this.brakeLightMat);
        taillight.position.set(0, 0.62, -2.06);
        this.group.add(taillight);

        // 6. Wheels (Front steerable, all 4 spin)
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.85 });
        const rimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
        const caliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });

        const wheelPositions = [
            { name: 'FL', x: -0.98, y: 0.34, z: 1.35, isFront: true },
            { name: 'FR', x: 0.98, y: 0.34, z: 1.35, isFront: true },
            { name: 'RL', x: -1.0, y: 0.34, z: -1.35, isFront: false },
            { name: 'RR', x: 1.0, y: 0.34, z: -1.35, isFront: false }
        ];

        wheelPositions.forEach(cfg => {
            const wheelHolder = new THREE.Group();
            wheelHolder.position.set(cfg.x, cfg.y, cfg.z);

            const hub = new THREE.Group();
            wheelHolder.add(hub);

            // Rubber Tire
            const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 24), wheelMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            hub.add(tire);

            // Alloy Rim
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.31, 16), rimMat);
            rim.rotation.z = Math.PI / 2;
            hub.add(rim);

            // Brake Caliper
            const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.15), caliperMat);
            caliper.position.set(cfg.x > 0 ? -0.1 : 0.1, 0.1, 0.05);
            wheelHolder.add(caliper);

            this.group.add(wheelHolder);
            this.wheels.push({ holder: wheelHolder, hub });

            if (cfg.isFront) {
                this.frontWheels.push(wheelHolder);
            }
        });
    }

    update(dt, speed, steerAngle, throttle, isBraking) {
        // Front wheel steering angle
        this.frontWheels.forEach(w => {
            w.rotation.y = steerAngle;
        });

        // Wheel spin based on speed
        const wheelRadius = 0.34;
        const spinDelta = (speed / wheelRadius) * dt;
        this.wheelRotation += spinDelta;
        this.wheels.forEach(w => {
            w.hub.rotation.x = this.wheelRotation;
        });

        // Reactive brake light intensity
        if (this.brakeLightMat) {
            this.brakeLightMat.emissiveIntensity = isBraking ? 2.8 : 0.8;
            this.brakeLightMat.color.setHex(isBraking ? 0xff0022 : 0x660005);
        }
    }
}

window.ShowcaseCar = ShowcaseCar;
