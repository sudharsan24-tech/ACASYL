import * as THREE from 'three';
import { addCollisionBox, addDoorSet, addWalkableBox, furnishClassroom } from './buildingUtils.js';

export function buildAcademicBlock(context, createNPC, config) {
    const {
        position,
        name,
        accent = 0x5d8b52,
    } = config;

    const block = new THREE.Group();
    block.position.copy(position);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd9d9d2, roughness: 0.9 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x9aa09d, roughness: 0.78 });
    const trimMaterial = new THREE.MeshStandardMaterial({ color: 0x6f777e, roughness: 0.74 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: 0xbfd9eb, transparent: true, opacity: 0.24 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x6c4c34, roughness: 0.82 });

    addWalkableBox(block, context, new THREE.Vector3(360, 2, 260), new THREE.Vector3(0, 0, 0), floorMaterial);
    addWalkableBox(block, context, new THREE.Vector3(360, 2, 260), new THREE.Vector3(0, 60, 0), floorMaterial, { walkableOnly: true });

    addCollisionBox(block, context, new THREE.Vector3(360, 58, 2), new THREE.Vector3(0, 29, -129), wallMaterial);
    addCollisionBox(block, context, new THREE.Vector3(152, 58, 2), new THREE.Vector3(-104, 29, 129), wallMaterial);
    addCollisionBox(block, context, new THREE.Vector3(152, 58, 2), new THREE.Vector3(104, 29, 129), wallMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 58, 260), new THREE.Vector3(-179, 29, 0), wallMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 58, 260), new THREE.Vector3(179, 29, 0), wallMaterial);
    addCollisionBox(block, context, new THREE.Vector3(360, 18, 2), new THREE.Vector3(0, 69, -129), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(360, 18, 2), new THREE.Vector3(0, 69, 129), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 18, 260), new THREE.Vector3(-179, 69, 0), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(2, 18, 260), new THREE.Vector3(179, 69, 0), trimMaterial);

    addCollisionBox(block, context, new THREE.Vector3(110, 58, 2), new THREE.Vector3(-90, 29, 0), trimMaterial);
    addCollisionBox(block, context, new THREE.Vector3(110, 58, 2), new THREE.Vector3(90, 29, 0), trimMaterial);

    for (const x of [-15, 15]) {
        for (const roomZ of [-64, 64]) {
            addCollisionBox(block, context, new THREE.Vector3(2, 58, 38), new THREE.Vector3(x, 29, roomZ - 36), trimMaterial);
            addCollisionBox(block, context, new THREE.Vector3(2, 58, 38), new THREE.Vector3(x, 29, roomZ + 36), trimMaterial);
        }
    }

    addCollisionBox(block, context, new THREE.Vector3(80, 18, 2), new THREE.Vector3(0, 58, 129), wallMaterial);
    addCollisionBox(block, context, new THREE.Vector3(4, 40, 2), new THREE.Vector3(-26, 20, 129), glassMaterial);
    addCollisionBox(block, context, new THREE.Vector3(4, 40, 2), new THREE.Vector3(26, 20, 129), glassMaterial);
    addDoorSet(block, context, {
        position: new THREE.Vector3(0, 0, 129),
        axis: 'z',
        width: 46,
        height: 40,
        material: doorMaterial,
        frameMaterial: trimMaterial,
        openAngle: Math.PI / 4.5,
    });

    // Classroom doors from the cross corridor.
    addDoorSet(block, context, { position: new THREE.Vector3(-15, 0, -64), axis: 'x', width: 32, height: 38, material: doorMaterial, frameMaterial: trimMaterial });
    addDoorSet(block, context, { position: new THREE.Vector3(15, 0, -64), axis: 'x', width: 32, height: 38, material: doorMaterial, frameMaterial: trimMaterial });
    addDoorSet(block, context, { position: new THREE.Vector3(-15, 0, 64), axis: 'x', width: 32, height: 38, material: doorMaterial, frameMaterial: trimMaterial });
    addDoorSet(block, context, { position: new THREE.Vector3(15, 0, 64), axis: 'x', width: 32, height: 38, material: doorMaterial, frameMaterial: trimMaterial });

    furnishClassroom(block, context, { center: new THREE.Vector3(-90, 0, -64), width: 150, depth: 110, floorY: 0, facing: 'north', accent });
    furnishClassroom(block, context, { center: new THREE.Vector3(90, 0, -64), width: 150, depth: 110, floorY: 0, facing: 'north', accent });
    furnishClassroom(block, context, { center: new THREE.Vector3(-90, 0, 64), width: 150, depth: 110, floorY: 0, facing: 'south', accent });
    furnishClassroom(block, context, { center: new THREE.Vector3(90, 0, 64), width: 150, depth: 110, floorY: 0, facing: 'south', accent });

    createNPC(position.x, 0, position.z + 108, `${name} Coordinator`, `${name} now has proper classroom doors, corridors, and finished roof lines.`, 0xf0cc76);

    return block;
}
