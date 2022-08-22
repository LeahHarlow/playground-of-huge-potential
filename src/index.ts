import "./style.css";

import { Scene, PerspectiveCamera, AmbientLight, BoxGeometry, MeshBasicMaterial, Mesh, Side, FrontSide, SphereGeometry, Vector3, Color, CylinderGeometry, OctahedronGeometry, ConeGeometry, PointLight } from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import renderer, { renderLoop } from "./renderer";

const RESOLUTION = 16 / 9;

const scene = new Scene();
const camera = new PerspectiveCamera(50, RESOLUTION, 1, 10000);
const controls = new OrbitControls(camera, renderer.domElement);

camera.position.set(0, 400, 1000);
controls.update();

let loopHooks: Array<(dt: number) => void> = [];

(async () => {

    let sceneMade = false;

    const initializeScene = (scene: Scene, camera: PerspectiveCamera, dt: number) => {
        sceneMade = true;

        // Ground
        const GROUND_SIZE = 1000;
        const groundGeometry = new BoxGeometry(GROUND_SIZE, 1, GROUND_SIZE, 70, 1, 70);
        const groundMesh = new Mesh(groundGeometry, new MeshBasicMaterial({ color: 0x227700, wireframe: true }));
        scene.add(groundMesh);

        // Red Ball
        const ballGeometry = new SphereGeometry(30, 20, 10);
        const ballMaterial = new MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const ballMesh = new Mesh(ballGeometry, ballMaterial);
        ballMesh.position.y = 30;
        ballMesh.position.x = 200;
        ballMesh.position.z = 50;
        scene.add(ballMesh);

        // Sandbox Frame
        const sandBoxWoodGeo = new BoxGeometry(500, 20, 500);
        const sandBoxWood = new Mesh(sandBoxWoodGeo, new MeshBasicMaterial({ color: 0x462300 }));
        sandBoxWood.position.y = 10;
        sandBoxWood.position.x = -150;
        scene.add(sandBoxWood);

        // Sandbox Sand
        const sandBoxSand = sandBoxWood.clone();
        scene.add(sandBoxSand);
        sandBoxSand.scale.multiply(new Vector3(0.9, 1, 0.9));
        sandBoxSand.position.y += 5;
        sandBoxSand.material = new MeshBasicMaterial({ color: 0xcc8800 });

        // Blue Bucket
        const bucketG = new CylinderGeometry(10, 7, 20);
        const bucket = new Mesh(bucketG, new MeshBasicMaterial({ color: 0x0000ff }));
        bucket.position.copy(sandBoxSand.position);
        bucket.position.y += 25;
        bucket.position.x -= 90;
        bucket.position.z += 100;
        bucket.scale.multiply(new Vector3(1.5, 1.5, 1.5));
        scene.add(bucket);

        // Black Prism
        const prismGeometry = new OctahedronGeometry(10, 0);
        const prism = new Mesh(prismGeometry, new MeshBasicMaterial({ color: 0x000000 }));
        scene.add(prism);
        prism.position.copy(sandBoxWood.position);
        prism.scale.multiplyScalar(4);
        prism.position.y += 80;

        //seesaw
        const baseGeo = new ConeGeometry(5,15);
        const baseMaterial = new MeshBasicMaterial({color: 0xFFFF00});
        const seesawBase = new Mesh(baseGeo, baseMaterial);
        scene.add(seesawBase);
        seesawBase.position.y = 35;
        seesawBase.position.z = -350;
        seesawBase.scale.multiplyScalar(5);

        const plankGeo = new BoxGeometry(75,2,10);
        const plankMaterial = new MeshBasicMaterial({color: 0xFFFF00});
        const seesawPlank = new Mesh(plankGeo, plankMaterial);
        scene.add(seesawPlank);
        seesawPlank.position.copy(seesawBase.position);
        seesawPlank.position.y += 35;
        seesawPlank.scale.multiplyScalar(5);
        seesawPlank.rotateZ(0.2);


        loopHooks.push(dt => {
            prism.rotation.y += 0.05;
        });

        loopHooks.push(dt => {
            controls.update();
        });

        //creatign light
        const ambientLight = new AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        const pointLight = new PointLight(0xdddd00, 5, 30);
        scene.add(pointLight);
        pointLight

    };

    renderLoop(scene, camera, (dt) => {

        if (sceneMade === false) {
            initializeScene(scene, camera, dt);
        }

        loopHooks.forEach(fn => fn(dt));

    });

})();


