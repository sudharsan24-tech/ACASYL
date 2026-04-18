import * as THREE from 'three';
import { addDoorSet } from './buildingUtils.js';

export function buildCanteen(context, createNPC) {
    const cGrp = new THREE.Group();
    // Center-left map placement
    cGrp.position.set(-400, 0, -1400);

    const floorMat = new THREE.MeshStandardMaterial({color: 0xdddddd, roughness: 0.2}); 
    const glassMat = new THREE.MeshStandardMaterial({color: 0xffffff, transparent: true, opacity: 0.2});
    const woodMat = new THREE.MeshStandardMaterial({color: 0x8b5a2b, roughness: 0.9});

    // 1-STORY SPRAWLING GLASSHOUSE: 300x400 footprint
    const floor = new THREE.Mesh(new THREE.BoxGeometry(300, 2, 400), floorMat);
    floor.position.set(0, 0, 0); floor.receiveShadow = true; cGrp.add(floor); context.walkableFloors.push(floor);

    // Glass Outer Walls
    const wB = new THREE.Mesh(new THREE.BoxGeometry(300, 40, 2), glassMat); wB.position.set(0, 20, -199); cGrp.add(wB); context.objects.push(wB);
    const wL = new THREE.Mesh(new THREE.BoxGeometry(2, 40, 400), glassMat); wL.position.set(-149, 20, 0); cGrp.add(wL); context.objects.push(wL);
    const wR = new THREE.Mesh(new THREE.BoxGeometry(2, 40, 400), glassMat); wR.position.set(149, 20, 0); cGrp.add(wR); context.objects.push(wR);

    // Front Glass Wall (Split for Entrance)
    const wFL = new THREE.Mesh(new THREE.BoxGeometry(122, 40, 2), glassMat); wFL.position.set(-89, 20, 199); cGrp.add(wFL); context.objects.push(wFL);
    const wFR = new THREE.Mesh(new THREE.BoxGeometry(122, 40, 2), glassMat); wFR.position.set(89, 20, 199); cGrp.add(wFR); context.objects.push(wFR);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(300, 2, 400), floorMat);
    roof.position.set(0, 40, 0); roof.receiveShadow = true; cGrp.add(roof); context.walkableFloors.push(roof);
    const upperFront = new THREE.Mesh(new THREE.BoxGeometry(300, 14, 2), glassMat); upperFront.position.set(0, 47, 199); cGrp.add(upperFront); context.objects.push(upperFront);
    const upperBack = new THREE.Mesh(new THREE.BoxGeometry(300, 14, 2), glassMat); upperBack.position.set(0, 47, -199); cGrp.add(upperBack); context.objects.push(upperBack);
    const upperLeft = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 400), glassMat); upperLeft.position.set(-149, 47, 0); cGrp.add(upperLeft); context.objects.push(upperLeft);
    const upperRight = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 400), glassMat); upperRight.position.set(149, 47, 0); cGrp.add(upperRight); context.objects.push(upperRight);
    
    // Front Doors
    const doorMat = new THREE.MeshStandardMaterial({color: 0x8b5a2b});
    addDoorSet(cGrp, context, {
        position: new THREE.Vector3(0, 0, 199),
        axis: 'z',
        width: 50,
        height: 38,
        material: doorMat,
        frameMaterial: glassMat,
        openAngle: Math.PI / 4.6,
    });

    // Procedural Cafe Tables
    const tableGeo = new THREE.CylinderGeometry(8, 8, 2);
    const legGeo = new THREE.CylinderGeometry(1, 1, 15);
    for(let r=0; r<6; r++) {
        for(let c=0; c<4; c++) {
            const table = new THREE.Mesh(tableGeo, woodMat);
            table.position.set(-100 + c*60, 15, -150 + r*50);
            cGrp.add(table); context.objects.push(table);
            
            const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
            leg.position.set(-100 + c*60, 7.5, -150 + r*50);
            cGrp.add(leg);

            // 4 Chairs per table
            for(let ang=0; ang<Math.PI*2; ang+=Math.PI/2) {
                const chair = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 4), doorMat); // wooden chair
                chair.position.set(-100 + c*60 + Math.cos(ang)*15, 4, -150 + r*50 + Math.sin(ang)*15);
                cGrp.add(chair); context.objects.push(chair);
            }
        }
    }

    // Food Vendor Counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(200, 15, 20), new THREE.MeshStandardMaterial({color: 0xffffff}));
    counter.position.set(0, 7.5, -180); cGrp.add(counter); context.objects.push(counter);

    createNPC(-400, 0, -1580, "Cafeteria Vendor", "No food until the next patch. We only serve low-poly bytes for now.", 0xff00ff);

    return cGrp;
}
