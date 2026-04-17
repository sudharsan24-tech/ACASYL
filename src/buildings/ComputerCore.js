import * as THREE from 'three';

export function buildComputerCore(context, createNPC) {
    const bGrp = new THREE.Group();
    // Strictly positioned on the Left exactly spanning deep inside the compass
    bGrp.position.set(-700, 0, -160); 

    const metalMat = new THREE.MeshStandardMaterial({color: 0x444455, metalness: 0.8, roughness: 0.3});
    // Dark monolithic server floor
    const floorMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.2}); 
    const glassMat = new THREE.MeshStandardMaterial({color: 0x0055ff, transparent: true, opacity: 0.3});

    // Massive block geometric footprint (400 width, 600 length)
    // Actually, local x from -200 to 200, local z from -300 to 300
    const floorGeo = new THREE.BoxGeometry(400, 2, 600);
    
    // First Floor
    const fl1 = new THREE.Mesh(floorGeo, floorMat);
    fl1.position.set(0, 0, 0); fl1.receiveShadow = true; bGrp.add(fl1); context.walkableFloors.push(fl1);
    
    // Second Floor
    const fl2 = new THREE.Mesh(floorGeo, floorMat);
    fl2.position.set(0, 80, 0); fl2.receiveShadow = true; bGrp.add(fl2); context.walkableFloors.push(fl2);

    // Front Glass Wall with Entrance Void
    const gWallL = new THREE.Mesh(new THREE.BoxGeometry(175, 160, 2), glassMat);
    gWallL.position.set(-112.5, 80, 299); bGrp.add(gWallL); context.objects.push(gWallL);
    const gWallR = new THREE.Mesh(new THREE.BoxGeometry(175, 160, 2), glassMat);
    gWallR.position.set(112.5, 80, 299); bGrp.add(gWallR); context.objects.push(gWallR);
    
    // Front Iron Double Doors
    const doorMat = new THREE.MeshStandardMaterial({color: 0x333333, metalness: 0.8});
    const cDoorL = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 2), doorMat); cDoorL.position.set(-12.5, 20, 280); cDoorL.rotation.y = -Math.PI/4; bGrp.add(cDoorL); context.objects.push(cDoorL);
    const cDoorR = new THREE.Mesh(new THREE.BoxGeometry(25, 40, 2), doorMat); cDoorR.position.set(12.5, 20, 280); cDoorR.rotation.y = Math.PI/4; bGrp.add(cDoorR); context.objects.push(cDoorR);

    // Back Outer Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(400, 160, 2), metalMat);
    backWall.position.set(0, 80, -299); bGrp.add(backWall); context.objects.push(backWall);

    // Left/Right Outer Walls
    const lw = new THREE.Mesh(new THREE.BoxGeometry(2, 160, 600), metalMat);
    lw.position.set(-199, 80, 0); bGrp.add(lw); context.objects.push(lw);
    const rw = new THREE.Mesh(new THREE.BoxGeometry(2, 160, 600), metalMat);
    rw.position.set(199, 80, 0); bGrp.add(rw); context.objects.push(rw);

    // Physical Staircase connecting F1 to F2
    const stLanding = new THREE.Mesh(new THREE.BoxGeometry(80, 2, 40), floorMat);
    stLanding.position.set(150, 80, 100); bGrp.add(stLanding); context.walkableFloors.push(stLanding);

    for(let i=0; i<20; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(80, 4, 8), floorMat);
        step.position.set(150, 2 + (i*4), -76 + (i*8)); 
        bGrp.add(step); context.walkableFloors.push(step);
    }

    // ======================================
    // GROUND FLOOR: SERVER ARRAYS
    // ======================================
    const serverGeo = new THREE.BoxGeometry(10, 30, 20);
    const sMat = new THREE.MeshStandardMaterial({color: 0x222222, emissive: 0x001155, emissiveIntensity: 0.5});
    for(let r=0; r<8; r++) {
        for(let c=0; c<6; c++) {
            const server = new THREE.Mesh(serverGeo, sMat);
            // Arrayed in a grid in the back half of the ground floor
            server.position.set(-100 + c*40, 15, -200 + r*30);
            bGrp.add(server); context.objects.push(server);
            
            // LED blinking lights on servers
            const led = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2, 4), new THREE.MeshBasicMaterial({color: 0x00ff00}));
            led.position.set(-100 + c*40, 20, -200 + r*30);
            bGrp.add(led);
        }
    }
    createNPC(-700, 0, -200, "Server Admin", "Don't touch the mainframe! If you unplug a blade, the entire virtual campus crashes.", 0x00aaff);

    // ======================================
    // UPPER FLOOR: PC WORKSTATIONS
    // ======================================
    const deskGeo = new THREE.BoxGeometry(20, 10, 20);
    const dMat = new THREE.MeshStandardMaterial({color: 0x777777});
    const monitorGeo = new THREE.BoxGeometry(12, 8, 2);
    const monMat = new THREE.MeshStandardMaterial({color: 0x111111, emissive: 0x0044ff, emissiveIntensity: 0.8});

    // Teaching Board Front
    const sBoard = new THREE.Mesh(new THREE.BoxGeometry(160, 20, 2), new THREE.MeshStandardMaterial({color: 0xffffff}));
    sBoard.position.set(0, 110, -298); bGrp.add(sBoard);

    for(let r=0; r<10; r++) {
        for(let c=0; c<8; c++) {
            // Desk
            const desk = new THREE.Mesh(deskGeo, dMat);
            desk.position.set(-140 + c*35, 85, -200 + r*40);
            bGrp.add(desk); context.objects.push(desk);
            
            // Monitor
            const monitor = new THREE.Mesh(monitorGeo, monMat);
            monitor.position.set(-140 + c*35, 95, -195 + r*40);
            bGrp.add(monitor); context.objects.push(monitor);
            
            // Tower CPU
            const cpu = new THREE.Mesh(new THREE.BoxGeometry(4, 9, 12), new THREE.MeshStandardMaterial({color: 0x111111}));
            cpu.position.set(-135 + c*35, 84.5, -202 + r*40); bGrp.add(cpu);

            // Ergonomic Chair
            const chair = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), new THREE.MeshStandardMaterial({color: 0x242424}));
            chair.position.set(-140 + c*35, 83, -185 + r*40); bGrp.add(chair); context.objects.push(chair);

            // Interactive terminal for future missions
            const hit = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({visible: false}));
            hit.position.set(-140 + c*35, 95, -195 + r*40);
            hit.userData = { interactive: true, id: 'PC Terminal', dialog: 'Hack into the subnet? (Mission Locked)' };
            bGrp.add(hit); context.objects.push(hit);
        }
    }
    
    createNPC(-500, 80, -160, "Tech Guru", "Welcome. F1 is strictly for backend coding. Keep your syntax valid or your avatar will be deleted.", 0x00ffaa);

    return bGrp;
}
