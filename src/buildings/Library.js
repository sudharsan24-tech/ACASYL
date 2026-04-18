import * as THREE from 'three';
import { addCollisionBox, addDoorSet, addWalkableBox, createStaircase } from './buildingUtils.js';

export function buildLibrary(context, createNPC) {
    const lGrp = new THREE.Group();
    // Right side deep map placement
    lGrp.position.set(700, 0, -1000);

    const stoneMat = new THREE.MeshStandardMaterial({color: 0xeeddaa, roughness: 0.9});
    const woodMat = new THREE.MeshStandardMaterial({color: 0x5c4033, roughness: 0.8});
    const glassMat = new THREE.MeshStandardMaterial({color: 0xd7e3ed, transparent: true, opacity: 0.26});

    // 3-STORY TITAN: 400x500 footprint
    const heights = [0, 60, 120];
    heights.forEach((y, index) => {
        addWalkableBox(lGrp, context, new THREE.Vector3(400, 2, 500), new THREE.Vector3(0, y, 0), stoneMat);

        // Physical Staircase steps to connect library floors safely
        if(index < 2) {
            const stX = index === 0 ? -150 : 150;
            addWalkableBox(lGrp, context, new THREE.Vector3(44, 2, 44), new THREE.Vector3(stX, y + 60, 100), stoneMat, { walkableOnly: true });
            createStaircase(lGrp, context, {
                position: new THREE.Vector3(stX, y, -100),
                axis: 'z',
                direction: 1,
                width: 44,
                steps: 30,
                stepRise: 2,
                stepRun: 6.66,
                material: stoneMat,
                addRailings: true,
            });
        }

        // Procedural Bookshelves
        for(let r=0; r<6; r++) {
            for(let c=0; c<6; c++) {
                const shelf = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 10), woodMat);
                shelf.position.set(-150 + c*60, y + 20, -150 + r*60);
                lGrp.add(shelf); context.objects.push(shelf);
            }
        }
    });

    // Solid outer walls with large windows removed for open library feel
    const wB = new THREE.Mesh(new THREE.BoxGeometry(400, 180, 2), stoneMat); wB.position.set(0, 90, -249); lGrp.add(wB); context.objects.push(wB);
    const wL = new THREE.Mesh(new THREE.BoxGeometry(2, 180, 500), stoneMat); wL.position.set(-199, 90, 0); lGrp.add(wL); context.objects.push(wL);
    const wR = new THREE.Mesh(new THREE.BoxGeometry(2, 180, 500), stoneMat); wR.position.set(199, 90, 0); lGrp.add(wR); context.objects.push(wR);
    addWalkableBox(lGrp, context, new THREE.Vector3(400, 2, 500), new THREE.Vector3(0, 180, 0), stoneMat, { walkableOnly: true });
    addCollisionBox(lGrp, context, new THREE.Vector3(400, 18, 2), new THREE.Vector3(0, 189, -249), stoneMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(400, 18, 2), new THREE.Vector3(0, 189, 249), stoneMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(2, 18, 500), new THREE.Vector3(-199, 189, 0), stoneMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(2, 18, 500), new THREE.Vector3(199, 189, 0), stoneMat);
    
    addCollisionBox(lGrp, context, new THREE.Vector3(130, 180, 2), new THREE.Vector3(-135, 90, 249), stoneMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(130, 180, 2), new THREE.Vector3(135, 90, 249), stoneMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(44, 110, 2), new THREE.Vector3(-48, 55, 249), glassMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(44, 110, 2), new THREE.Vector3(48, 55, 249), glassMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(80, 26, 2), new THREE.Vector3(0, 167, 249), stoneMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(44, 44, 2), new THREE.Vector3(-48, 122, 249), glassMat);
    addCollisionBox(lGrp, context, new THREE.Vector3(44, 44, 2), new THREE.Vector3(48, 122, 249), glassMat);
    addDoorSet(lGrp, context, {
        position: new THREE.Vector3(0, 0, 249),
        axis: 'z',
        width: 52,
        height: 42,
        material: woodMat,
        frameMaterial: stoneMat,
        openAngle: Math.PI / 4.6,
    });

    createNPC(700, 0, -800, "Head Librarian", "Silence in the library. All the world's knowledge is encapsulated in these procedural arrays.", 0xffaa00);

    return lGrp;
}
