import * as THREE from 'three';

export function buildElectronicsCore(context, createNPC) {
    const bGrp = new THREE.Group();
    // Left side deep map placement
    bGrp.position.set(-700, 0, -1000);

    const metalMat = new THREE.MeshStandardMaterial({color: 0x777777, roughness: 0.5});
    const floorMat = new THREE.MeshStandardMaterial({color: 0x333333, roughness: 0.4}); 
    const glassMat = new THREE.MeshStandardMaterial({color: 0x00ff88, transparent: true, opacity: 0.3});

    // Footprint: 500x500
    const floorGeo = new THREE.BoxGeometry(500, 2, 500);
    const fl1 = new THREE.Mesh(floorGeo, floorMat);
    fl1.position.set(0, 0, 0); fl1.receiveShadow = true; bGrp.add(fl1); context.walkableFloors.push(fl1);

    // Front Glass Wall (Split for Entrance)
    const gWallL = new THREE.Mesh(new THREE.BoxGeometry(200, 80, 2), glassMat);
    gWallL.position.set(-150, 40, 249); bGrp.add(gWallL); context.objects.push(gWallL);
    const gWallR = new THREE.Mesh(new THREE.BoxGeometry(200, 80, 2), glassMat);
    gWallR.position.set(150, 40, 249); bGrp.add(gWallR); context.objects.push(gWallR);

    // Front Iron Double Doors
    const doorMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8});
    const cDoorL = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 2), doorMat); cDoorL.position.set(-12.5, 20, 240); cDoorL.rotation.y = -Math.PI/4; bGrp.add(cDoorL); context.objects.push(cDoorL);
    const cDoorR = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 2), doorMat); cDoorR.position.set(12.5, 20, 240); cDoorR.rotation.y = Math.PI/4; bGrp.add(cDoorR); context.objects.push(cDoorR);

    // Back Outer Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(500, 80, 2), metalMat);
    backWall.position.set(0, 40, -249); bGrp.add(backWall); context.objects.push(backWall);

    // Left/Right Outer Walls
    const lw = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 500), metalMat);
    lw.position.set(-249, 40, 0); bGrp.add(lw); context.objects.push(lw);
    const rw = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 500), metalMat);
    rw.position.set(249, 40, 0); bGrp.add(rw); context.objects.push(rw);

    // ======================================
    // GROUND FLOOR: CIRCUIT LABS
    // ======================================
    const benchGeo = new THREE.BoxGeometry(30, 10, 15);
    const benchMat = new THREE.MeshStandardMaterial({color: 0xccccdd});
    // Multi-meter devices
    const deviceGeo = new THREE.BoxGeometry(5, 5, 5);
    const deviceMat = new THREE.MeshStandardMaterial({color: 0xaa2222, emissive: 0xff0000, emissiveIntensity: 0.2});

    const chairMat = new THREE.MeshStandardMaterial({color: 0x222222});

    for(let r=0; r<8; r++) {
        for(let c=0; c<10; c++) {
            const bench = new THREE.Mesh(benchGeo, benchMat);
            bench.position.set(-200 + c*45, 5, -200 + r*50);
            bGrp.add(bench); context.objects.push(bench);
            
            const device = new THREE.Mesh(deviceGeo, deviceMat);
            device.position.set(-200 + c*45, 12.5, -200 + r*50);
            bGrp.add(device); context.objects.push(device);

            // Lab Chair
            const chair = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), chairMat);
            chair.position.set(-200 + c*45, 3, -190 + r*50); bGrp.add(chair); context.objects.push(chair);
        }
    }

    // Huge Smartboards at the front
    const boardMat = new THREE.MeshStandardMaterial({color: 0x013005}); // Chalkboard
    const bd1 = new THREE.Mesh(new THREE.BoxGeometry(100, 20, 2), boardMat); bd1.position.set(-100, 40, -248); bGrp.add(bd1);
    const bd2 = new THREE.Mesh(new THREE.BoxGeometry(100, 20, 2), boardMat); bd2.position.set(100, 40, -248); bGrp.add(bd2);

    createNPC(-700, 0, -800, "Electronics Professor", "Ensure your virtual circuits are grounded. Short-circuits here will crash the web browser.", 0xff0000);

    return bGrp;
}
