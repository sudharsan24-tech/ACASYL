import * as THREE from 'three';

export function buildLibrary(context, createNPC) {
    const lGrp = new THREE.Group();
    // Right side deep map placement
    lGrp.position.set(700, 0, -1000);

    const stoneMat = new THREE.MeshStandardMaterial({color: 0xeeddaa, roughness: 0.9});
    const woodMat = new THREE.MeshStandardMaterial({color: 0x5c4033, roughness: 0.8});

    // 3-STORY TITAN: 400x500 footprint
    const heights = [0, 60, 120];
    heights.forEach((y, index) => {
        const floor = new THREE.Mesh(new THREE.BoxGeometry(400, 2, 500), stoneMat);
        floor.position.set(0, y, 0); floor.receiveShadow = true; lGrp.add(floor); context.walkableFloors.push(floor);

        // Physical Staircase steps to connect library floors safely
        if(index < 2) {
            const stX = index === 0 ? -150 : 150;
            // Floor landing padding
            const landing = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 40), stoneMat);
            landing.position.set(stX, y + 60, 100); lGrp.add(landing); context.walkableFloors.push(landing);

            for(let i=0; i<30; i++) {
                const step = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 6.6), stoneMat);
                step.position.set(stX, y + 1 + (i*2), -100 + (i*6.66));
                lGrp.add(step); context.walkableFloors.push(step);
            }
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
    
    // Front columns instead of wall
    for(let c=0; c<5; c++) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 180), stoneMat);
        col.position.set(-180 + c*90, 90, 240); lGrp.add(col); context.objects.push(col);
    }

    createNPC(700, 0, -800, "Head Librarian", "Silence in the library. All the world's knowledge is encapsulated in these procedural arrays.", 0xffaa00);

    return lGrp;
}
