import * as THREE from 'three';
import {
    addCollisionBox,
    addDoorSet,
    addWalkableBox,
    createStaircase,
    furnishSeminarHall,
} from './buildingUtils.js';

function buildLabRoom(parent, context, options) {
    const {
        center,
        width,
        depth,
        floorY,
        doorAxis = 'z',
        boardColor = 0x1f5c24,
        wallMaterial,
        trimMaterial,
        doorMaterial,
        benchMaterial,
        deviceMaterial,
        chairMaterial,
    } = options;

    const roomHeight = 46;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const backZ = center.z - halfDepth;

    addCollisionBox(parent, context, new THREE.Vector3(width, roomHeight, 2), new THREE.Vector3(center.x, floorY + (roomHeight / 2), backZ), wallMaterial);
    addCollisionBox(parent, context, new THREE.Vector3(2, roomHeight, depth), new THREE.Vector3(center.x - halfWidth, floorY + (roomHeight / 2), center.z), trimMaterial);
    addCollisionBox(parent, context, new THREE.Vector3(2, roomHeight, depth), new THREE.Vector3(center.x + halfWidth, floorY + (roomHeight / 2), center.z), trimMaterial);

    const frontWallZ = center.z + halfDepth;
    addCollisionBox(parent, context, new THREE.Vector3((width / 2) - 20, roomHeight, 2), new THREE.Vector3(center.x - ((width / 4) + 10), floorY + (roomHeight / 2), frontWallZ), trimMaterial);
    addCollisionBox(parent, context, new THREE.Vector3((width / 2) - 20, roomHeight, 2), new THREE.Vector3(center.x + ((width / 4) + 10), floorY + (roomHeight / 2), frontWallZ), trimMaterial);
    addDoorSet(parent, context, {
        position: new THREE.Vector3(center.x, floorY, frontWallZ),
        axis: doorAxis,
        width: 34,
        height: 38,
        material: doorMaterial,
        frameMaterial: trimMaterial,
        openAngle: Math.PI / 4.6,
    });

    const board = new THREE.Mesh(new THREE.BoxGeometry(72, 18, 2), new THREE.MeshStandardMaterial({ color: boardColor, roughness: 0.88 }));
    board.position.set(center.x, floorY + 22, backZ + 2);
    parent.add(board);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
            const bench = new THREE.Group();
            bench.position.set(center.x - 38 + (col * 76), floorY, center.z - 10 + (row * 26));
            parent.add(bench);

            const top = new THREE.Mesh(new THREE.BoxGeometry(28, 4, 16), benchMaterial);
            top.position.y = 8;
            bench.add(top);

            const device = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), deviceMaterial);
            device.position.set(0, 13, 0);
            bench.add(device);

            const chair = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), chairMaterial);
            chair.position.set(0, 4, 16);
            bench.add(chair);

            const collider = new THREE.Mesh(new THREE.BoxGeometry(32, 16, 32), new THREE.MeshBasicMaterial({ visible: false }));
            collider.position.set(0, 8, 8);
            bench.add(collider);
            context.objects.push(collider);
        }
    }
}

export function buildElectronicsCore(context, createNPC) {
    const block = new THREE.Group();
    block.position.set(-700, 0, -1000);

    const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x6f757b, roughness: 0.52 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x434a52, roughness: 0.5, metalness: 0.2 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x34383d, roughness: 0.44 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x7fdac6, transparent: true, opacity: 0.25 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x33383c, roughness: 0.62, metalness: 0.32 });
    const stairMaterial = new THREE.MeshStandardMaterial({ color: 0x68727b, roughness: 0.68 });
    const benchMaterial = new THREE.MeshStandardMaterial({ color: 0xc8ccd4, roughness: 0.72 });
    const deviceMaterial = new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0x7d1010, emissiveIntensity: 0.45 });
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x26292d, roughness: 0.74 });

    const width = 520;
    const depth = 500;
    const frontZ = 249;
    const backZ = -249;

    addWalkableBox(block, context, new THREE.Vector3(width, 2, depth), new THREE.Vector3(0, 0, 0), floorMaterial);
    addWalkableBox(block, context, new THREE.Vector3(width, 2, depth), new THREE.Vector3(0, 70, 0), floorMaterial);
    addWalkableBox(block, context, new THREE.Vector3(width, 2, depth), new THREE.Vector3(0, 140, 0), floorMaterial, { walkableOnly: true });
    addWalkableBox(block, context, new THREE.Vector3(96, 2, 340), new THREE.Vector3(0, 0.2, 25), trimMaterial);
    addWalkableBox(block, context, new THREE.Vector3(96, 2, 340), new THREE.Vector3(0, 70.2, 25), trimMaterial);

    for (const level of [0, 70]) {
        addCollisionBox(block, context, new THREE.Vector3(width, 68, 2), new THREE.Vector3(0, level + 34, backZ), shellMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, 68, depth), new THREE.Vector3(-259, level + 34, 0), shellMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, 68, depth), new THREE.Vector3(259, level + 34, 0), shellMaterial);
    }

    addCollisionBox(block, context, new THREE.Vector3(215, 68, 2), new THREE.Vector3(-152.5, 34, frontZ), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(215, 68, 2), new THREE.Vector3(152.5, 34, frontZ), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(82, 18, 2), new THREE.Vector3(0, 58, frontZ), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(20, 40, 2), new THREE.Vector3(-35, 20, frontZ), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(20, 40, 2), new THREE.Vector3(35, 20, frontZ), glassMaterial);
    addDoorSet(block, context, {
        position: new THREE.Vector3(0, 0, frontZ),
        axis: 'z',
        width: 50,
        height: 40,
        material: doorMaterial,
        frameMaterial: shellMaterial,
        openAngle: Math.PI / 4.6,
    });

    addCollisionBox(block, context, new THREE.Vector3(width, 26, 2), new THREE.Vector3(0, 118, frontZ), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(180, 30, 2), new THREE.Vector3(-150, 86, frontZ), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(180, 30, 2), new THREE.Vector3(150, 86, frontZ), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(90, 30, 2), new THREE.Vector3(0, 86, frontZ), glassMaterial);

    addCollisionBox(block, context, new THREE.Vector3(width, 18, 2), new THREE.Vector3(0, 149, backZ), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(width, 18, 2), new THREE.Vector3(0, 149, frontZ), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 18, depth), new THREE.Vector3(-259, 149, 0), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 18, depth), new THREE.Vector3(259, 149, 0), trimMaterial);

    createStaircase(block, context, {
        position: new THREE.Vector3(200, 0, -115),
        axis: 'z',
        direction: 1,
        width: 70,
        steps: 18,
        stepRise: 3.9,
        stepRun: 10,
        material: stairMaterial,
        landingSize: new THREE.Vector3(78, 2, 28),
        addRailings: false,
    });

    // Ground floor subject labs
    buildLabRoom(block, context, {
        center: new THREE.Vector3(-140, 0, -120),
        width: 180,
        depth: 150,
        floorY: 0,
        wallMaterial: shellMaterial,
        trimMaterial,
        doorMaterial,
        benchMaterial,
        deviceMaterial,
        chairMaterial,
        boardColor: 0x1d5722,
    });
    buildLabRoom(block, context, {
        center: new THREE.Vector3(140, 0, -120),
        width: 180,
        depth: 150,
        floorY: 0,
        wallMaterial: shellMaterial,
        trimMaterial,
        doorMaterial,
        benchMaterial,
        deviceMaterial,
        chairMaterial,
        boardColor: 0x245b21,
    });
    buildLabRoom(block, context, {
        center: new THREE.Vector3(-140, 0, 120),
        width: 180,
        depth: 150,
        floorY: 0,
        wallMaterial: shellMaterial,
        trimMaterial,
        doorMaterial,
        benchMaterial,
        deviceMaterial,
        chairMaterial,
        boardColor: 0x1f5424,
    });
    buildLabRoom(block, context, {
        center: new THREE.Vector3(140, 0, 120),
        width: 180,
        depth: 150,
        floorY: 0,
        wallMaterial: shellMaterial,
        trimMaterial,
        doorMaterial,
        benchMaterial,
        deviceMaterial,
        chairMaterial,
        boardColor: 0x205629,
    });

    // Upper lecture halls
    furnishSeminarHall(block, context, { center: new THREE.Vector3(-95, 0, -20), width: 220, depth: 210, floorY: 70, accent: 0x244f2a });
    furnishSeminarHall(block, context, { center: new THREE.Vector3(95, 0, -20), width: 220, depth: 210, floorY: 70, accent: 0x234f2f });

    // Upper hall room shells with doors
    for (const hallX of [-95, 95]) {
        addCollisionBox(block, context, new THREE.Vector3(220, 46, 2), new THREE.Vector3(hallX, 93, -125), trimMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, 46, 210), new THREE.Vector3(hallX - 110, 93, -20), trimMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, 46, 210), new THREE.Vector3(hallX + 110, 93, -20), trimMaterial);
        addCollisionBox(block, context, new THREE.Vector3(80, 46, 2), new THREE.Vector3(hallX - 52, 93, 85), trimMaterial);
        addCollisionBox(block, context, new THREE.Vector3(80, 46, 2), new THREE.Vector3(hallX + 52, 93, 85), trimMaterial);
        addDoorSet(block, context, {
            position: new THREE.Vector3(hallX, 70, 85),
            axis: 'z',
            width: 34,
            height: 38,
            material: doorMaterial,
            frameMaterial: trimMaterial,
            openAngle: Math.PI / 4.6,
        });
    }

    const mentorKiosk = new THREE.Group();
    mentorKiosk.position.set(20, 0, 170);
    block.add(mentorKiosk);

    const kioskBody = new THREE.Mesh(
        new THREE.BoxGeometry(18, 28, 18),
        new THREE.MeshStandardMaterial({ color: 0x20272d, roughness: 0.48, metalness: 0.3 })
    );
    kioskBody.position.set(0, 14, 0);
    mentorKiosk.add(kioskBody);
    context.objects.push(kioskBody);

    const kioskScreen = new THREE.Mesh(
        new THREE.BoxGeometry(12, 10, 2),
        new THREE.MeshStandardMaterial({ color: 0x092542, emissive: 0x1355a1, emissiveIntensity: 0.8 })
    );
    kioskScreen.position.set(0, 22, -8);
    mentorKiosk.add(kioskScreen);

    const mentorHit = new THREE.Mesh(new THREE.BoxGeometry(18, 24, 18), new THREE.MeshBasicMaterial({ visible: false }));
    mentorHit.position.set(0, 14, 0);
    mentorHit.userData = {
        interactive: true,
        id: 'BEE Mentor Console',
        dialog: 'Structured BEE tutor ready.',
        hoverLabel: 'BEE Mentor AI',
        labelOffsetY: 18,
    };
    mentorKiosk.add(mentorHit);
    if (context.interactiveMeshes) context.interactiveMeshes.push(mentorHit);
    if (window.interactiveObjects) window.interactiveObjects['BEE Mentor Console'] = mentorHit;

    createNPC(-700, 0, -800, 'Electronics Professor', 'This block is now split into separate subject labs and lecture halls with controlled access.', 0xff0000);
    createNPC(-840, 0, -905, 'Lab Incharge', 'Ground floor rooms now operate as dedicated electronics labs instead of one open collision hall.', 0xffaa00);
    createNPC(-620, 70, -980, 'Lecture Hall Assistant', 'Once staff briefing is complete, use the BEE Mentor AI kiosk for the first structured lesson.', 0x00d7ff);

    return block;
}
