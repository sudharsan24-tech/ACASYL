import * as THREE from 'three';
import {
    addCollisionBox,
    addDoorSet,
    addWalkableBox,
    createStaircase,
} from './buildingUtils.js';

export function buildComputerCore(context, createNPC) {
    const block = new THREE.Group();
    block.position.set(-700, 0, -160);
    const sideEntryZ = 118;

    const shellMaterial = new THREE.MeshStandardMaterial({ color: 0x424852, roughness: 0.38, metalness: 0.26 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x171c22, roughness: 0.36, metalness: 0.12 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x1f6bb0, transparent: true, opacity: 0.26 });
    const stairMaterial = new THREE.MeshStandardMaterial({ color: 0x66727d, roughness: 0.7, metalness: 0.16 });
    const deskMaterial = new THREE.MeshStandardMaterial({ color: 0x6b7279, roughness: 0.72 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x35414a, roughness: 0.7, metalness: 0.3 });
    const monitorMaterial = new THREE.MeshStandardMaterial({ color: 0x101214, emissive: 0x0a3766, emissiveIntensity: 0.68 });
    const serverMaterial = new THREE.MeshStandardMaterial({ color: 0x24282e, roughness: 0.58, metalness: 0.18, emissive: 0x09111f, emissiveIntensity: 0.4 });

    addWalkableBox(block, context, new THREE.Vector3(460, 2, 420), new THREE.Vector3(0, 0, 0), floorMaterial);
    addWalkableBox(block, context, new THREE.Vector3(240, 2, 420), new THREE.Vector3(-110, 70, 0), floorMaterial);
    addWalkableBox(block, context, new THREE.Vector3(120, 2, 220), new THREE.Vector3(170, 70, -70), floorMaterial);
    addWalkableBox(block, context, new THREE.Vector3(460, 2, 420), new THREE.Vector3(0, 140, 0), floorMaterial, { walkableOnly: true });

    // Outer shell with actual entrance doors and full upper walls.
    for (const level of [0, 70]) {
        addCollisionBox(block, context, new THREE.Vector3(460, 68, 2), new THREE.Vector3(0, level + 34, -209), shellMaterial);
        addCollisionBox(block, context, new THREE.Vector3(2, 68, 420), new THREE.Vector3(-229, level + 34, 0), shellMaterial);
        if (level === 0) {
            addCollisionBox(block, context, new THREE.Vector3(2, 68, 300), new THREE.Vector3(229, level + 34, -60), shellMaterial);
            addCollisionBox(block, context, new THREE.Vector3(2, 68, 64), new THREE.Vector3(229, level + 34, 178), shellMaterial);
            addCollisionBox(block, context, new THREE.Vector3(2, 26, 56), new THREE.Vector3(229, level + 55, sideEntryZ), shellMaterial);
        } else {
            addCollisionBox(block, context, new THREE.Vector3(2, 68, 420), new THREE.Vector3(229, level + 34, 0), shellMaterial);
        }
    }

    addCollisionBox(block, context, new THREE.Vector3(170, 68, 2), new THREE.Vector3(-145, 34, 209), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(170, 68, 2), new THREE.Vector3(145, 34, 209), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(90, 18, 2), new THREE.Vector3(0, 58, 209), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(20, 40, 2), new THREE.Vector3(-35, 20, 209), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(20, 40, 2), new THREE.Vector3(35, 20, 209), glassMaterial);
    addDoorSet(block, context, {
        position: new THREE.Vector3(0, 0, 209),
        axis: 'z',
        width: 52,
        height: 40,
        material: doorMaterial,
        frameMaterial: shellMaterial,
        openAngle: Math.PI / 4.2,
    });

    addDoorSet(block, context, {
        position: new THREE.Vector3(229, 0, sideEntryZ),
        axis: 'x',
        width: 52,
        height: 40,
        material: doorMaterial,
        frameMaterial: shellMaterial,
        openAngle: Math.PI / 4.4,
    });

    addCollisionBox(block, context, new THREE.Vector3(460, 30, 2), new THREE.Vector3(0, 122, 209), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(160, 34, 2), new THREE.Vector3(-145, 88, 209), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(160, 34, 2), new THREE.Vector3(145, 88, 209), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(70, 34, 2), new THREE.Vector3(0, 88, 209), glassMaterial);

    addCollisionBox(block, context, new THREE.Vector3(460, 18, 2), new THREE.Vector3(0, 149, -209), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(460, 18, 2), new THREE.Vector3(0, 149, 209), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 18, 420), new THREE.Vector3(-229, 149, 0), shellMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 18, 420), new THREE.Vector3(229, 149, 0), shellMaterial);

    // Completely open stair core. No pillars, no interior blocking walls.
    createStaircase(block, context, {
        position: new THREE.Vector3(165, 0, -110),
        axis: 'z',
        direction: 1,
        width: 84,
        steps: 18,
        stepRise: 3.9,
        stepRun: 10,
        material: stairMaterial,
        landingSize: new THREE.Vector3(92, 2, 30),
        addRailings: true,
    });

    // Server floor
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 4; col++) {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(16, 34, 26), serverMaterial);
            rack.position.set(-145 + (col * 52), 17, -150 + (row * 52));
            block.add(rack);
            context.objects.push(rack);
        }
    }

    // Open computing lab upstairs
    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
            const station = new THREE.Group();
            station.position.set(-165 + (col * 64), 70, -120 + (row * 60));
            block.add(station);

            const desk = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 22), deskMaterial);
            desk.position.set(0, 8, 0);
            station.add(desk);

            const monitor = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 2), monitorMaterial);
            monitor.position.set(0, 18, -7);
            station.add(monitor);

            const chair = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshStandardMaterial({ color: 0x2d3136, roughness: 0.72 }));
            chair.position.set(0, 4, 17);
            station.add(chair);

            const collider = new THREE.Mesh(new THREE.BoxGeometry(34, 18, 36), new THREE.MeshBasicMaterial({ visible: false }));
            collider.position.set(0, 9, 8);
            station.add(collider);
            context.objects.push(collider);

            const hit = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ visible: false }));
            hit.position.set(0, 18, -7);
            hit.userData = { interactive: true, id: 'PC Terminal', dialog: 'Open the mission console.' };
            station.add(hit);
            if (context.interactiveMeshes) context.interactiveMeshes.push(hit);
        }
    }

    const labBoard = new THREE.Mesh(new THREE.BoxGeometry(140, 20, 2), new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.35 }));
    labBoard.position.set(-95, 100, -208);
    block.add(labBoard);

    const codeWall = new THREE.Mesh(new THREE.BoxGeometry(92, 20, 2), new THREE.MeshStandardMaterial({ color: 0x0f1f31, emissive: 0x0b2954, emissiveIntensity: 0.5 }));
    codeWall.position.set(132, 100, -208);
    block.add(codeWall);

    createNPC(-700, 0, -230, 'Server Admin', 'The circulation core is open now. No phantom walls, no stray pillars, no stair blockage.', 0x00aaff);
    createNPC(-610, 70, -40, 'Tech Guru', 'This lab now reads like a real computing block instead of a collision maze.', 0x00ffaa);
    createNPC(-560, 0, -40, 'CS Professor', 'Computer Science access is locked until Electronics is complete.', 0x7bdcff);

    return block;
}
