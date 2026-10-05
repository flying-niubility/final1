/* ===================================================================
   campus3d.js —— 三维校园展示区（Three.js ES Module）
   功能：
     - 低多边形风格校园：图书馆 / 食堂 / 学术报告厅 / 体育馆 / 宿舍
     - 鼠标/触摸拖拽旋转、滚轮/双指缩放
     - 鼠标悬停高亮建筑，点击可跳转到对应功能页面
     - 响应式自适应容器尺寸；不支持 WebGL 时给出错误提示
   =================================================================== */

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("campus3d");
const tooltip = document.getElementById("campusTooltip");

function show3DError(message) {
  if (!container) return;
  container.innerHTML =
    '<div class="state-box"><i class="fa-solid fa-cube"></i><p>' + message + "</p></div>";
}

/* ---------- WebGL 支持检测 ---------- */

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

if (!container) {
  throw new Error("未找到 #campus3d 容器");
}

if (!webglAvailable()) {
  show3DError("当前浏览器不支持 WebGL，无法显示三维校园，请使用最新版 Chrome / Edge / Firefox 浏览器。");
} else {
  init();
}

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (err) {
    show3DError("三维渲染器初始化失败：" + err.message);
    return;
  }

  /* ---------- 基础场景 ---------- */

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe8ff, 45, 95);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(24, 19, 26);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 58;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.target.set(0, 1.5, 0);

  /* ---------- 光照 ---------- */

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8fbc8f, 0.85));

  const sun = new THREE.DirectionalLight(0xfff4e0, 1.25);
  sun.position.set(18, 28, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -38;
  sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 38;
  sun.shadow.camera.bottom = -38;
  sun.shadow.camera.far = 80;
  scene.add(sun);

  /* ---------- 地面与道路 ---------- */

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshStandardMaterial({ color: 0x8ccb6f, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(6.5, 6.5, 0.15, 48),
    new THREE.MeshStandardMaterial({ color: 0xd7d3cd, roughness: 0.9 })
  );
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.95 });
  [
    { x: 0, z: 0, w: 46, d: 3.2 },
    { x: 0, z: 0, w: 3.2, d: 40 }
  ].forEach(function (r) {
    const road = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.12, r.d), roadMat);
    road.position.set(r.x, 0.0, r.z);
    road.receiveShadow = true;
    scene.add(road);
  });

  /* ---------- 纹理：建筑立面（带窗格） ---------- */

  function facadeTexture(baseColor) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        ctx.fillRect(14 + col * 27, 16 + row * 27, 14, 17);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /* ---------- 名称标签（Sprite 始终朝向相机） ---------- */

  function makeLabel(text, color) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 72;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(8, 10, 240, 50, 16);
    ctx.fill();
    ctx.font = "bold 30px Microsoft YaHei, PingFang SC, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 36);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true })
    );
    sprite.scale.set(5.6, 1.55, 1);
    return sprite;
  }

  /* ---------- 建筑 ---------- */

  const buildingList = [
    { name: "图书馆",   color: "#3b82f6", roof: "#1e40af", x: -10, z: -7,  w: 6, d: 6, h: 8,  url: "studyroom.html" },
    { name: "第一食堂", color: "#fb923c", roof: "#c2410c", x: 10,  z: -8,  w: 6, d: 5, h: 4.6, url: "canteen.html" },
    { name: "学术报告厅", color: "#a855f7", roof: "#6b21a8", x: 11, z: 8, w: 6, d: 5, h: 5.2, url: "lecture.html" },
    { name: "体育馆",   color: "#22c55e", roof: "#15803d", x: -11, z: 9,  w: 6, d: 6, h: 4,   url: "" },
    { name: "学生宿舍", color: "#eab308", roof: "#a16207", x: 0,   z: -16, w: 8, d: 4.5, h: 6.5, url: "" }
  ];

  const clickable = [];

  buildingList.forEach(function (cfg) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      map: facadeTexture(cfg.color),
      roughness: 0.8
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), bodyMat);
    body.position.y = cfg.h / 2;
    body.castShadow = true;
    body.receiveShadow = true;

    const roofMesh = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.w + 0.5, 0.5, cfg.d + 0.5),
      new THREE.MeshStandardMaterial({ color: cfg.roof, roughness: 0.85 })
    );
    roofMesh.position.y = cfg.h + 0.25;
    roofMesh.castShadow = true;

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.8, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
    );
    door.position.set(0, 0.9, cfg.d / 2 + 0.02);

    group.add(body, roofMesh, door);
    group.position.set(cfg.x, 0, cfg.z);

    const label = makeLabel(cfg.name, cfg.roof);
    label.position.set(0, cfg.h + 1.5, 0);
    group.add(label);

    group.userData = {
      isBuilding: true,
      buildingName: cfg.name,
      url: cfg.url,
      bodyMat: bodyMat,
      baseScale: 1
    };

    scene.add(group);
    clickable.push(group);
  });

  /* ---------- 树木 ---------- */

  function makeTree(x, z, scale) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 1.3, 7),
      new THREE.MeshStandardMaterial({ color: 0x8d5a2b })
    );
    trunk.position.y = 0.65;
    trunk.castShadow = true;

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 1 });
    const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.9, 8), leafMat);
    leaf1.position.y = 1.9;
    leaf1.castShadow = true;
    const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 8), leafMat);
    leaf2.position.y = 2.7;
    leaf2.castShadow = true;

    g.add(trunk, leaf1, leaf2);
    g.position.set(x, 0, z);
    g.scale.setScalar(scale || 1);
    scene.add(g);
  }

  [
    [-6, -16], [6, -16], [-17, -3], [-17, 3], [17, -3], [17, 3],
    [-6, 15], [6, 15], [-15, -13], [15, -13], [-15, 14], [15, 14], [0, 17]
  ].forEach(function (p, i) {
    makeTree(p[0], p[1], 0.85 + (i % 3) * 0.18);
  });

  /* ---------- 云朵 ---------- */

  const clouds = [];
  function makeCloud(x, y, z) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    [[0, 0, 0, 1.4], [1.3, 0.2, 0.2, 1], [-1.3, 0.1, -0.1, 1], [0.5, 0.6, -0.3, 0.9]]
      .forEach(function (b) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(b[3], 12, 10), mat);
        s.position.set(b[0], b[1], b[2]);
        g.add(s);
      });
    g.position.set(x, y, z);
    scene.add(g);
    clouds.push(g);
  }
  makeCloud(-14, 16, -10);
  makeCloud(16, 18, 6);
  makeCloud(4, 20, 14);

  /* ---------- 交互：悬停高亮 + 点击跳转 ---------- */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered = null;

  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(clickable, true);
    if (!hits.length) return null;

    let obj = hits[0].object;
    while (obj && !obj.userData.isBuilding) obj = obj.parent;
    return obj;
  }

  renderer.domElement.addEventListener("pointermove", function (event) {
    const target = pick(event);

    if (target !== hovered) {
      if (hovered) hovered.userData.bodyMat.emissive.set(0x000000);
      hovered = target;
      if (hovered) hovered.userData.bodyMat.emissive.set(0x444466);
    }

    if (hovered) {
      renderer.domElement.style.cursor = "pointer";
      tooltip.style.display = "block";
      tooltip.style.left = event.offsetX + "px";
      tooltip.style.top = event.offsetY + "px";
      tooltip.textContent =
        hovered.userData.buildingName +
        (hovered.userData.url ? " · 点击进入" : " · 功能建设中");
    } else {
      renderer.domElement.style.cursor = "grab";
      tooltip.style.display = "none";
    }
  });

  renderer.domElement.addEventListener("pointerleave", function () {
    if (hovered) hovered.userData.bodyMat.emissive.set(0x000000);
    hovered = null;
    tooltip.style.display = "none";
  });

  let downPos = null;
  renderer.domElement.addEventListener("pointerdown", function (e) {
    downPos = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener("pointerup", function (e) {
    // 区分“点击”与“拖拽旋转”
    if (!downPos) return;
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (moved > 6) return;

    const target = pick(e);
    if (target && target.userData.url) {
      window.location.href = target.userData.url;
    } else if (target) {
      if (window.Campus && window.Campus.toast) {
        window.Campus.toast("「" + target.userData.buildingName + "」功能正在建设中，敬请期待", "info");
      }
    }
  });

  /* ---------- 自适应尺寸 ---------- */

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- 渲染循环 ---------- */

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    clouds.forEach(function (c, i) {
      c.position.x += 0.008 + i * 0.003;
      if (c.position.x > 42) c.position.x = -42;
    });

    if (hovered) {
      const s = hovered.scale.x + (1.06 - hovered.scale.x) * 0.15;
      hovered.scale.setScalar(s);
    }
    clickable.forEach(function (b) {
      if (b !== hovered && b.scale.x !== 1) {
        const s = b.scale.x + (1 - b.scale.x) * 0.15;
        b.scale.setScalar(s);
      }
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
