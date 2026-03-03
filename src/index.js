console.log("Hey, NightlyD3V here, thanks for checking out my site and taking a peak at the code.");
// GLOBALS 
const socket = io("https://chat-server-3bcx.onrender.com");
const otherPlayers = {};

document.addEventListener("DOMContentLoaded", function () {
  // STATISTICS
  var stats = new Stats();
  stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild( stats.dom );
  stats.dom.style.position = 'absolute';
  stats.dom.style.top = '0px';
  stats.dom.style.left = 'auto';
  stats.dom.style.right = '0px';
  stats.dom.style.width = '80px';  // Set width
  stats.dom.style.height = '50px'; // Set height
  
  // HANDLE BUTTONS 
  const iframe_container = document.querySelector('#iframe-container');
  const chat_button = document.getElementById('chat-button');
   
  window.addEventListener("message", (event) => {
    if (event.data === "exit-button_clicked") {
      iframe_container.style.setProperty('--speed', '1s');
      void iframe_container.offsetWidth;
      iframe_container.classList.add('collapse');
      chat_button.style.visibility = "visible";
    }
  });
  
  chat_button.addEventListener("click", (event) => {
    iframe_container.style.setProperty('--speed', '0.1s');
    void iframe_container.offsetWidth;
    iframe_container.classList.remove('collapse');
    chat_button.style.visibility = "hidden";
  });
  
  // THREEJS
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  const frustumSize = 20;
  
  // ISOMETRIC
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.01,
    200
  );
  camera.position.set(70, 70, 70);
  camera.lookAt(0, 0, 0);
  
  // HELPERS
  const grid = new THREE.GridHelper(1000, 20, 0x444444, 0x888888);
  scene.add(grid);
  
  // RENDERER
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  document.body.appendChild( renderer.domElement );
  
  // CAMERA CONTROLS
  const controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.maxDistance = 70;
  controls.minDistance = 5;
  controls.maxPolarAngle = Math.PI / 2.2; 
  controls.minPolarAngle = Math.PI / 4; 
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.update();
  
  // FOG
  scene.fog = new THREE.Fog(0x111111, 30, 100);
  scene.background = new THREE.Color(0x111111);
  
  const tileSize = 2;
  
  // MODELS
  const geometry = new THREE.BoxGeometry( 1, 2, 1 );
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
  const cube = new THREE.Mesh( geometry, material );
  cube.position.y = 2;
  scene.add( cube );
  
  // PLAYER(s)
  const geo_player = new THREE.BoxGeometry(1,2,1);
  const mat_player = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const player = new THREE.Mesh( geo_player, mat_player );
  player.position.y = 1;
  player.position.x += tileSize;
  player.position.z += 4 * tileSize;
  scene.add(player);
  
  function spawnOtherPlayer(id) {
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
  
    mesh.position.set(
      (Math.random() - 0.5) * 10,
      1,
      (Math.random() - 0.5) * 10
    );
  
    scene.add(mesh);
    otherPlayers[id] = mesh;
  }
  
  socket.on("existingPlayers", (ids) => {
    ids.forEach(id => {
      if (id === socket.id) return; 
      spawnOtherPlayer(id);
      players[id] = otherPlayers;
    });
  });
  
  socket.on("playerJoined", (id) => {
    console.log("a player joined!");
    if (id === socket.id) return;
    spawnOtherPlayer(id);
  });
  
  socket.on("playerLeft", (id) => {
    console.log("a player left");
    if (otherPlayers[id]) {
      scene.remove(otherPlayers[id]);
      delete otherPlayers[id];
    }
  });
  
  // STREET LAMP
  const loader = new THREE.GLTFLoader();
  loader.load('public/3D/streetlamp.glb', function(gltf) {
    const model = gltf.scene;
    model.position.x += 5 * tileSize;
    model.position.z += 2 * tileSize;
    model.rotation.y = 9;
    scene.add(model);
    
    model.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material;

        if (Array.isArray(mat)) {
            child.material = mat.map((m) => new THREE.MeshBasicMaterial({
                color: m.color ? m.color : 0xffffff,
                map: m.map ? m.map : null,
                side: THREE.DoubleSide,
                wireframe: false
            }));
        } else {
            child.material = new THREE.MeshBasicMaterial({
                color: mat.color ? mat.color : 0xffffff,
                map: mat.map ? mat.map : null,
                side: THREE.DoubleSide,
                wireframe: false
            });
        }
        child.material.needsUpdate = true;
      }
    });
  });
  
  // FLOOR
  const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
  const floorMaterial = new THREE.MeshBasicMaterial({
    color: 0x555555,    
    side: THREE.DoubleSide
  });
  const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.01;
  scene.add(floorMesh);
  
  // PLAYER CONTROLS
  const input = { forward: false, backward: false, left: false, right: false };

  window.addEventListener('keydown', (e) => {
    switch(e.code){
      case 'KeyW': input.forward = true; break;
      case 'KeyS': input.backward = true; break;
      case 'KeyA': input.left = true; break;
      case 'KeyD': input.right = true; break;
    }
  });
  
  window.addEventListener('keyup', (e) => {
    switch(e.code){
      case 'KeyW': input.forward = false; break;
      case 'KeyS': input.backward = false; break;
      case 'KeyA': input.left = false; break;
      case 'KeyD': input.right = false; break;
    }
  });
  
  const forward = new THREE.Vector3();
  const speed = 0.04;
  const right = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();
  
  function updatePlayerPosition(playerMesh) {
    if (input.forward) {
      player.position.add(forward.clone().multiplyScalar(speed));
    }
    
    if (input.backward) {
      player.position.add(forward.clone().multiplyScalar(-speed));
    }
    
    if (input.left) {
      player.position.add(right.clone().multiplyScalar(-speed));
    }
    
    if (input.right) {
      player.position.add(right.clone().multiplyScalar(speed));
    }
  }
  
  function animate( time ) {
    stats.begin();
    cube.rotation.x = time / 2000;
    cube.rotation.y = time / 1000;
    controls.target.copy(player.position);
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    updatePlayerPosition(player);
    controls.update();
    renderer.render( scene, camera );
    stats.end();
  }
});



