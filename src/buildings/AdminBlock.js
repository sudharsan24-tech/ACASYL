import * as THREE from 'three';

export function buildAdminBlock(context, createNPC) {
    const uGrp = new THREE.Group();
    // Strictly positioned on the Right exactly spanning deep inside the compass
    uGrp.position.set(700, 0, -160); 

    const bMat = new THREE.MeshStandardMaterial({color: 0xe6d5c3, roughness: 0.9}); 
    const fMat = new THREE.MeshStandardMaterial({color: 0x888888, roughness: 0.7}); 
    const wallLMat = new THREE.MeshStandardMaterial({color: 0xd4c2af, roughness: 0.9}); 
    const glassMat = new THREE.MeshStandardMaterial({color: 0xadd8e6, transparent: true, opacity: 0.3});

    // Heights pushed to 80 units apart 
    const heights = [0, 80, 160]; 
    heights.forEach((y, index) => {
        // Back piece: Box(160, 2, 400). Width 160. Z spans -200 to 200.
        const floorB = new THREE.Mesh(new THREE.BoxGeometry(160, 2, 400), fMat);
        floorB.position.set(80, y, 0); floorB.receiveShadow = true; uGrp.add(floorB); context.walkableFloors.push(floorB);
        // Left Arm: Box(600, 2, 160). Spans X: 0 to -600. Z: -200 to -40.
        const floorL = new THREE.Mesh(new THREE.BoxGeometry(600, 2, 160), fMat);
        floorL.position.set(-300, y, -120); floorL.receiveShadow = true; uGrp.add(floorL); context.walkableFloors.push(floorL);
        // Right Arm: Box(600, 2, 160). Spans X: 0 to -600. Z: 40 to 200.
        const floorR = new THREE.Mesh(new THREE.BoxGeometry(600, 2, 160), fMat);
        floorR.position.set(-300, y, 120); floorR.receiveShadow = true; uGrp.add(floorR); context.walkableFloors.push(floorR);
        
        if(index < 2) {
            // Outer Protective Walls (Height 80)
            const wallB = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 400), bMat);
            wallB.position.set(159, y + 40, 0); wallB.castShadow = true; uGrp.add(wallB); context.objects.push(wallB);

            const wallLO = new THREE.Mesh(new THREE.BoxGeometry(600, 80, 2), bMat); // Left Outer
            wallLO.position.set(-300, y + 40, -199); wallLO.castShadow = true; uGrp.add(wallLO); context.objects.push(wallLO);

            const wallRO = new THREE.Mesh(new THREE.BoxGeometry(600, 80, 2), bMat); // Right Outer
            wallRO.position.set(-300, y + 40, 199); wallRO.castShadow = true; uGrp.add(wallRO); context.objects.push(wallRO);

            // Front Facade Wall with Giant Arching Entrance closing the vast open area
            const fWallL = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 160), bMat); fWallL.position.set(-599, y+40, -120); uGrp.add(fWallL); context.objects.push(fWallL);
            const fWallR = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 160), bMat); fWallR.position.set(-599, y+40, 120); uGrp.add(fWallR); context.objects.push(fWallR);
            const fArch = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 80), bMat); fArch.position.set(-599, y+70, 0); uGrp.add(fArch); context.objects.push(fArch);
        }

        // PROCEDURAL ROOM PARTITIONS WITH PROPER DOORS
        if(index < 2) {
            const doorMat = new THREE.MeshStandardMaterial({color: 0x4a3c31, roughness: 0.9});
            for(let xP = -150; xP >= -450; xP -= 150) {
                // Split Partitions for archway
                const partLa = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 40), wallLMat); partLa.position.set(xP, y + 40, -180); uGrp.add(partLa); context.objects.push(partLa);
                const partLb = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 40), wallLMat); partLb.position.set(xP, y + 40, -120); uGrp.add(partLb); context.objects.push(partLb);
                const pArchL = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 20), wallLMat); pArchL.position.set(xP, y + 70, -150); uGrp.add(pArchL); context.objects.push(pArchL);
                // Door Left Ajar
                const pDoorL = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 20), doorMat); pDoorL.position.set(xP+8, y+30, -158); pDoorL.rotation.y = -Math.PI/4; uGrp.add(pDoorL); context.objects.push(pDoorL);

                const partRa = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 40), wallLMat); partRa.position.set(xP, y + 40, 180); uGrp.add(partRa); context.objects.push(partRa);
                const partRb = new THREE.Mesh(new THREE.BoxGeometry(2, 80, 40), wallLMat); partRb.position.set(xP, y + 40, 120); uGrp.add(partRb); context.objects.push(partRb);
                const pArchR = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 20), wallLMat); pArchR.position.set(xP, y + 70, 150); uGrp.add(pArchR); context.objects.push(pArchR);
                // Door Right Ajar
                const pDoorR = new THREE.Mesh(new THREE.BoxGeometry(2, 60, 20), doorMat); pDoorR.position.set(xP+8, y+30, 158); pDoorR.rotation.y = Math.PI/4; uGrp.add(pDoorR); context.objects.push(pDoorR);
            }

            for(let cx = -75; cx >= -525; cx -= 150) {
                // Massive corridor walls enclosing rooms - ONLY VIP room gets glass
                const isVIP = (index === 0 && cx === -75);
                const cMatL = isVIP ? glassMat : wallLMat;
                const cMatR = isVIP ? glassMat : wallLMat;
                
                // Solid walls along the huge hallway Corridor with door cutouts
                const secLa = new THREE.Mesh(new THREE.BoxGeometry(50, 80, 2), cMatL); secLa.position.set(cx-35, y + 40, -100); uGrp.add(secLa); context.objects.push(secLa);
                const secLb = new THREE.Mesh(new THREE.BoxGeometry(50, 80, 2), cMatL); secLb.position.set(cx+35, y + 40, -100); uGrp.add(secLb); context.objects.push(secLb);
                const cArchL = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 2), cMatL); cArchL.position.set(cx, y + 70, -100); uGrp.add(cArchL); context.objects.push(cArchL);
                const cDoorL = new THREE.Mesh(new THREE.BoxGeometry(20, 60, 2), doorMat); cDoorL.position.set(cx+8, y+30, -92); cDoorL.rotation.y = -Math.PI/4; uGrp.add(cDoorL); context.objects.push(cDoorL);

                const secRa = new THREE.Mesh(new THREE.BoxGeometry(50, 80, 2), cMatR); secRa.position.set(cx-35, y + 40, 100); uGrp.add(secRa); context.objects.push(secRa);
                const secRb = new THREE.Mesh(new THREE.BoxGeometry(50, 80, 2), cMatR); secRb.position.set(cx+35, y + 40, 100); uGrp.add(secRb); context.objects.push(secRb);
                const cArchR = new THREE.Mesh(new THREE.BoxGeometry(20, 20, 2), cMatR); cArchR.position.set(cx, y + 70, 100); uGrp.add(cArchR); context.objects.push(cArchR);
                const cDoorR = new THREE.Mesh(new THREE.BoxGeometry(20, 60, 2), doorMat); cDoorR.position.set(cx+8, y+30, 92); cDoorR.rotation.y = Math.PI/4; uGrp.add(cDoorR); context.objects.push(cDoorR);
            }
        }
    });

    // ======================================
    // U-STYLE STAIRCASE TO FLOOR 1 (Left Wing)
    // ======================================
    // Landing pads for connections
    const stLanding1 = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), fMat);
    stLanding1.position.set(-200, 20, -50); uGrp.add(stLanding1); context.walkableFloors.push(stLanding1);
    
    // First Flight up to Landing
    for(let i=0; i<20; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 4), fMat);
        step.position.set(-200, 1 + (i*2), 30 - (i*4)); uGrp.add(step); context.walkableFloors.push(step);
    }
    // Second Flight up to Floor 1
    for(let i=0; i<20; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 4), fMat);
        step.position.set(-240, 41 + (i*2), -50 + (i*4)); uGrp.add(step); context.walkableFloors.push(step);
    }

    // ======================================
    // STRAIGHT STAIRCASE TO FLOOR 2 (Right Wing)
    // ======================================
    for(let i=0; i<40; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 4), fMat);
        step.position.set(-200, 81 + (i*2), 80 - (i*4)); uGrp.add(step); context.walkableFloors.push(step);
    }

    // ======================================
    // GROUND FLOOR: VIP LUXURY OFFICES
    // ======================================
    // Admin Back Area: Massive Chairman Lounge
    const loungeRug = new THREE.Mesh(new THREE.PlaneGeometry(120, 300), new THREE.MeshStandardMaterial({color: 0x8b0000})); // Deep red carpet
    loungeRug.rotation.x = -Math.PI / 2; loungeRug.position.set(80, 2, 0); uGrp.add(loungeRug);
    
    // Chairman Table
    const cTable = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 80), new THREE.MeshStandardMaterial({color: 0x2e1503}));
    cTable.position.set(100, 7.5, 0); uGrp.add(cTable); context.objects.push(cTable);
    
    createNPC(780, 0, -160, "Administrative Officer", "Welcome to the Chairman's lounge. Only VIPs and top percentile students may arrange meetings here.", 0xff0000); 

    // Principal's Office (Right Arm, Room 1: Z=120 to 200, X=0 to -150)
    const pDeskGeo = new THREE.BoxGeometry(25, 12, 50);
    const pDesk = new THREE.Mesh(pDeskGeo, new THREE.MeshStandardMaterial({color: 0x5c4033}));
    pDesk.position.set(-75, 6, 160); uGrp.add(pDesk); context.objects.push(pDesk);
    createNPC(600, 0, 0, "Principal", "Ah, a new arrival. Engineering is not just science, it's art. Do not disappoint us.", 0xffaa00);

    // ======================================
    // FLOOR 1: CHEMISTRY & PHYSICS LABS
    // ======================================
    const vatMat = new THREE.MeshStandardMaterial({color: 0x00ff00, transparent: true, opacity: 0.8, emissive: 0x00ff00, emissiveIntensity: 0.5});
    const labBenchMat = new THREE.MeshStandardMaterial({color: 0xeeeeee});
    const cpuMat = new THREE.MeshStandardMaterial({color: 0x111111});
    const chairMat = new THREE.MeshStandardMaterial({color: 0x333333});
    // Chem Lab (Left Arm Floor 1)
    for(let r=0; r<4; r++) {
        for(let c=0; c<3; c++) {
            const bench = new THREE.Mesh(new THREE.BoxGeometry(15, 8, 30), labBenchMat);
            bench.position.set(-75 - (c*150), 84, -150 + (r*20)); uGrp.add(bench); context.objects.push(bench);
            
            // Lab Chair
            const lChair = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), chairMat); lChair.position.set(-65 - (c*150), 82.5, -150 + (r*20)); uGrp.add(lChair); context.objects.push(lChair);
            
            // Workstation CPU
            const cpu = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 8), cpuMat); cpu.position.set(-73 - (c*150), 83, -140 + (r*20)); uGrp.add(cpu);

            // Glowing Acid Vats
            const vat = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 6, 16), vatMat);
            vat.position.set(-77 - (c*150), 91, -150 + (r*20)); uGrp.add(vat);
        }
    }
    
    // Teaching boards inside Lab rooms
    for(let c=0; c<3; c++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 40), new THREE.MeshStandardMaterial({color: 0x054005})); // Chalkboard Green
        board.position.set(-149 - (c*150), 100, -150); uGrp.add(board);
    }
    createNPC(500, 80, -310, "Physics Professor", "We simulate Newtonian mechanics here. If the gravity bugs out, it's not my fault. Blame the space-time continuum.", 0x00ffff);
    createNPC(500, 80, -10, "Chemistry Professor", "Don't touch the chemical vats! The acid will eat right through your polygonal mesh.", 0x00ff00);

    // ======================================
    // FLOOR 2: EXAM LECTURE HALLS
    // ======================================
    const deskGeo = new THREE.BoxGeometry(12, 5, 20);
    const deskMat = new THREE.MeshStandardMaterial({color: 0x8b4513});
    for(let room=0; room<4; room++) {
        const cx = -75 - (room*150);
        // Smart Teaching Boards at front of Classrooms
        const sBoard1 = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 60), new THREE.MeshStandardMaterial({color: 0xffffff})); // Whiteboard
        sBoard1.position.set(cx - 59, 180, -150); uGrp.add(sBoard1);
        const sBoard2 = new THREE.Mesh(new THREE.BoxGeometry(2, 20, 60), new THREE.MeshStandardMaterial({color: 0xffffff}));
        sBoard2.position.set(cx - 59, 180, 150); uGrp.add(sBoard2);

        for(let r=0; r<4; r++) {
            for(let c=-1; c<=1; c++) {
                const d3 = new THREE.Mesh(deskGeo, deskMat);
                d3.position.set(cx + c*30, 162.5, -180 + r*25); uGrp.add(d3); context.objects.push(d3);
                // Chair attached to desk
                const ch1 = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardMaterial({color: 0x333333}));
                ch1.position.set(cx + c*30 + 10, 162.5, -180 + r*25); uGrp.add(ch1); context.objects.push(ch1);

                const d4 = new THREE.Mesh(deskGeo, deskMat);
                d4.position.set(cx + c*30, 162.5, 120 + r*25); uGrp.add(d4); context.objects.push(d4);
                // Chair attached to desk
                const ch2 = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardMaterial({color: 0x333333}));
                ch2.position.set(cx + c*30 + 10, 162.5, 120 + r*25); uGrp.add(ch2); context.objects.push(ch2);
            }
        }
    }

    // Central Gigascale Fountain
    const fGrp = new THREE.Group(); fGrp.position.set(-300, 0, 0); uGrp.add(fGrp);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 4, 32), new THREE.MeshStandardMaterial({color: 0xaaaaaa})); base.position.y = 2; fGrp.add(base); context.objects.push(base);
    const water = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 16), new THREE.MeshStandardMaterial({color: 0x00aaff, transparent: true, opacity: 0.7})); water.position.y = 12; fGrp.add(water);

    return uGrp;
}
