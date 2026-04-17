import * as THREE from 'three';

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
    const wFL = new THREE.Mesh(new THREE.BoxGeometry(100, 40, 2), glassMat); wFL.position.set(-100, 20, 199); cGrp.add(wFL); context.objects.push(wFL);
    const wFR = new THREE.Mesh(new THREE.BoxGeometry(100, 40, 2), glassMat); wFR.position.set(100, 20, 199); cGrp.add(wFR); context.objects.push(wFR);
    
    // Front Doors
    const doorMat = new THREE.MeshStandardMaterial({color: 0x8b5a2b});
    const dL = new THREE.Mesh(new THREE.BoxGeometry(50, 40, 2), doorMat); dL.position.set(-25, 20, 190); dL.rotation.y = -Math.PI/4; cGrp.add(dL); context.objects.push(dL);
    const dR = new THREE.Mesh(new THREE.BoxGeometry(50, 40, 2), doorMat); dR.position.set(25, 20, 190); dR.rotation.y = Math.PI/4; cGrp.add(dR); context.objects.push(dR);

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
