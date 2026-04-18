import * as THREE from 'three';
import {
    addCollisionBox,
    addDoorSet,
    addWalkableBox,
    createStaircase,
    furnishSeminarHall,
} from './buildingUtils.js';

function addOfficeSuite(parent, context, options) {
    const {
        center,
        width,
        depth,
        floorY,
        nameMaterial,
        deskMaterial,
        chairMaterial,
        wallMaterial,
        glassMaterial,
    } = options;

    const roomHeight = 46;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    const zBack = center.z - halfDepth;

    addCollisionBox(parent, context, new THREE.Vector3(2, roomHeight, depth), new THREE.Vector3(center.x - halfWidth, floorY + (roomHeight / 2), center.z), wallMaterial);
    addCollisionBox(parent, context, new THREE.Vector3(2, roomHeight, depth), new THREE.Vector3(center.x + halfWidth, floorY + (roomHeight / 2), center.z), wallMaterial);
    addCollisionBox(parent, context, new THREE.Vector3((width / 2) - 20, roomHeight, 2), new THREE.Vector3(center.x - ((width / 4) + 10), floorY + (roomHeight / 2), zBack), wallMaterial);
    addCollisionBox(parent, context, new THREE.Vector3((width / 2) - 20, roomHeight, 2), new THREE.Vector3(center.x + ((width / 4) + 10), floorY + (roomHeight / 2), zBack), wallMaterial);
    addDoorSet(parent, context, {
        position: new THREE.Vector3(center.x, floorY, zBack),
        axis: 'z',
        width: 34,
        height: 40,
        material: nameMaterial,
        frameMaterial: glassMaterial,
        openAngle: Math.PI / 3.8,
    });

    const desk = new THREE.Mesh(new THREE.BoxGeometry(34, 10, 16), deskMaterial);
    desk.position.set(center.x, floorY + 5, center.z + 8);
    parent.add(desk);
    context.objects.push(desk);

    const chair = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), chairMaterial);
    chair.position.set(center.x, floorY + 4, center.z + 26);
    parent.add(chair);
    context.objects.push(chair);

    const credenza = new THREE.Mesh(new THREE.BoxGeometry(width - 36, 12, 12), deskMaterial);
    credenza.position.set(center.x, floorY + 6, center.z - 28);
    parent.add(credenza);
    context.objects.push(credenza);
}

export function buildAdminBlock(context, createNPC) {
    const block = new THREE.Group();
    block.position.set(700, 0, -160);

    const shellMaterial = new THREE.MeshStandardMaterial({ color: 0xe5d7c7, roughness: 0.9 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0xcbb8a2, roughness: 0.88 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x909596, roughness: 0.74 });
    const stairMaterial = new THREE.MeshStandardMaterial({ color: 0x707780, roughness: 0.7 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xc8dcea, transparent: true, opacity: 0.28 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x6a4630, roughness: 0.82 });
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.84 });
    const chairMaterial = new THREE.MeshStandardMaterial({ color: 0x32373b, roughness: 0.72 });

    const floorLevels = [0, 70, 140];
    const shellHeight = 68;
    const buildingWidth = 720;
    const buildingDepth = 460;
    const frontZ = 229;
    const backZ = -229;

    for (const level of floorLevels) {
        addWalkableBox(block, context, new THREE.Vector3(buildingWidth, 2, buildingDepth), new THREE.Vector3(0, level, 0), floorMaterial);

        addCollisionBox(block, context, new THREE.Vector3(buildingWidth, shellHeight, 2), new THREE.Vector3(0, level + (shellHeight / 2), backZ), shellMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, shellHeight, buildingDepth), new THREE.Vector3(-(buildingWidth / 2) + 1, level + (shellHeight / 2), 0), shellMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, shellHeight, buildingDepth), new THREE.Vector3((buildingWidth / 2) - 1, level + (shellHeight / 2), 0), shellMaterial);

        if (level === 0) {
            addCollisionBox(block, context, new THREE.Vector3(300, shellHeight, 2), new THREE.Vector3(-210, level + (shellHeight / 2), frontZ), shellMaterial);
            addCollisionBox(block, context, new THREE.Vector3(300, shellHeight, 2), new THREE.Vector3(210, level + (shellHeight / 2), frontZ), shellMaterial);
            addCollisionBox(block, context, new THREE.Vector3(88, 18, 2), new THREE.Vector3(0, level + 58, frontZ), shellMaterial);
            addCollisionBox(block, context, new THREE.Vector3(33, 40, 2), new THREE.Vector3(-43.5, level + 20, frontZ), glassMaterial);
            addCollisionBox(block, context, new THREE.Vector3(33, 40, 2), new THREE.Vector3(43.5, level + 20, frontZ), glassMaterial);
            addDoorSet(block, context, {
                position: new THREE.Vector3(0, level, frontZ),
                axis: 'z',
                width: 54,
                height: 40,
                material: doorMaterial,
                frameMaterial: trimMaterial,
                openAngle: Math.PI / 4.5,
            });
        } else {
            addCollisionBox(block, context, new THREE.Vector3(210, 34, 2), new THREE.Vector3(-245, level + 18, frontZ), glassMaterial);
            addCollisionBox(block, context, new THREE.Vector3(210, 34, 2), new THREE.Vector3(245, level + 18, frontZ), glassMaterial);
            addCollisionBox(block, context, new THREE.Vector3(100, 34, 2), new THREE.Vector3(0, level + 18, frontZ), glassMaterial);
            addCollisionBox(block, context, new THREE.Vector3(buildingWidth, 30, 2), new THREE.Vector3(0, level + 52, frontZ), shellMaterial);
        }
    }

    addWalkableBox(block, context, new THREE.Vector3(buildingWidth, 2, buildingDepth), new THREE.Vector3(0, 210, 0), floorMaterial, { walkableOnly: true });
    addCollisionBox(block, context, new THREE.Vector3(buildingWidth, 16, 2), new THREE.Vector3(0, 218, backZ), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(buildingWidth, 16, 2), new THREE.Vector3(0, 218, frontZ), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 16, buildingDepth), new THREE.Vector3(-(buildingWidth / 2) + 1, 218, 0), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 16, buildingDepth), new THREE.Vector3((buildingWidth / 2) - 1, 218, 0), trimMaterial);

    // Open stair bays with no intermediate pillars or blocking walls.
    for (const stairX of [-250, 250]) {
        createStaircase(block, context, {
            position: new THREE.Vector3(stairX, 0, -70),
            axis: 'z',
            direction: 1,
            width: 76,
            steps: 18,
            stepRise: 3.9,
            stepRun: 10,
            material: stairMaterial,
            landingSize: new THREE.Vector3(86, 2, 26),
            addRailings: true,
        });
        createStaircase(block, context, {
            position: new THREE.Vector3(stairX, 70, -70),
            axis: 'z',
            direction: 1,
            width: 76,
            steps: 18,
            stepRise: 3.9,
            stepRun: 10,
            material: stairMaterial,
            landingSize: new THREE.Vector3(86, 2, 26),
            addRailings: true,
        });
    }

    // Ground floor admin offices.
    addOfficeSuite(block, context, {
        center: new THREE.Vector3(-165, 0, 140),
        width: 180,
        depth: 115,
        floorY: 0,
        nameMaterial: doorMaterial,
        deskMaterial,
        chairMaterial,
        wallMaterial: trimMaterial,
        glassMaterial,
    });
    addOfficeSuite(block, context, {
        center: new THREE.Vector3(165, 0, 140),
        width: 180,
        depth: 115,
        floorY: 0,
        nameMaterial: doorMaterial,
        deskMaterial,
        chairMaterial,
        wallMaterial: trimMaterial,
        glassMaterial,
    });

    furnishSeminarHall(block, context, { center: new THREE.Vector3(0, 0, -95), width: 520, depth: 180, floorY: 0, accent: 0x244f2a });
    furnishSeminarHall(block, context, { center: new THREE.Vector3(0, 0, 20), width: 240, depth: 110, floorY: 0, accent: 0x29592b });
    furnishSeminarHall(block, context, { center: new THREE.Vector3(0, 0, -105), width: 560, depth: 180, floorY: 70, accent: 0x1f4f28 });
    furnishSeminarHall(block, context, { center: new THREE.Vector3(0, 0, 115), width: 560, depth: 160, floorY: 70, accent: 0x24582d });
    furnishSeminarHall(block, context, { center: new THREE.Vector3(0, 0, -105), width: 560, depth: 180, floorY: 140, accent: 0x214e29 });
    furnishSeminarHall(block, context, { center: new THREE.Vector3(0, 0, 115), width: 560, depth: 160, floorY: 140, accent: 0x2a5c31 });

    const receptionDesk = new THREE.Mesh(new THREE.BoxGeometry(90, 12, 24), deskMaterial);
    receptionDesk.position.set(0, 6, 78);
    block.add(receptionDesk);
    context.objects.push(receptionDesk);

    createNPC(535, 0, -20, 'Administrative Officer', 'The administration wing is organized around clear circulation, open stair bays, and secure office rooms.', 0xff0000);
    createNPC(865, 0, -20, 'Principal', 'A real academic block should feel ordered, legible, and calm. This one now does.', 0xffaa00);
    createNPC(700, 70, -260, 'Seminar Coordinator', 'These seminar halls are designed for talks, reviews, and department briefings.', 0x00d7ff);

    return block;
}
