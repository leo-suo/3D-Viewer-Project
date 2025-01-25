import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';


function ThreeDViewer({ pointCloudData }) {
  const containerRef = useRef(null);
  const [rotationAngles, setRotationAngles] = useState({ x: 0, y: 0, z: 0 });

  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);

  // =========== 1) 初始化 3D 场景、相机、渲染器、控制器 ==============
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const scene = sceneRef.current;
    scene.background = new THREE.Color('#fafafa');

    // 1. 初始化相机
    const aspect = container.clientWidth / container.clientHeight;
    cameraRef.current = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000);
    // 相机先设置在稍远的位置，保证能看见坐标轴
    cameraRef.current.position.set(0, 0, 10);

    // 2. 初始化 renderer
    rendererRef.current = new THREE.WebGLRenderer({
      antialias: true,
      precision: 'highp',
      powerPreference: 'high-performance'
    });
    rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(rendererRef.current.domElement);

    // 3. 使用 TrackballControls 并允许平移
    controlsRef.current = new TrackballControls(cameraRef.current, rendererRef.current.domElement);
    controlsRef.current.rotateSpeed = 2.5;
    controlsRef.current.zoomSpeed = 1.2;
    controlsRef.current.panSpeed = 0.8;
    controlsRef.current.noPan = false;             // 允许平移
    controlsRef.current.dynamicDampingFactor = 0.3;

    // 禁用右键默认事件，以免在右键平移时弹出菜单
    rendererRef.current.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // 4. 添加坐标轴
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);

    // 窗口 resize 监听
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // 动画循环
    const animate = () => {
      controlsRef.current.update();
      rendererRef.current.render(scene, cameraRef.current);
      animationIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    // 组件卸载时清理
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      if (controlsRef.current) controlsRef.current.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        container.removeChild(rendererRef.current.domElement);
      }
      scene.clear();
    };
  }, []);

  // =========== 2) 节流更新相机旋转角度到 state，避免高频 setState =========
  useEffect(() => {
    const id = setInterval(() => {
      if (!cameraRef.current) return;
      const { rotation } = cameraRef.current;
      const newRot = {
        x: parseFloat(THREE.MathUtils.radToDeg(rotation.x).toFixed(2)),
        y: parseFloat(THREE.MathUtils.radToDeg(rotation.y).toFixed(2)),
        z: parseFloat(THREE.MathUtils.radToDeg(rotation.z).toFixed(2)),
      };
      setRotationAngles(newRot);
    }, 200); // 每 200ms 更新一次

    return () => clearInterval(id);
  }, []);

  function hslToRgb(h, s, l) {
    let r, g, b;
  
    if (s === 0) {
      // achromatic
      r = g = b = l; 
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return [r, g, b];
  };


  // =========== 3) 处理点云数据更新，释放旧几何体，创建新几何体 (带颜色) =========
  useEffect(() => {
    if (!pointCloudData?.length) return;
    const scene = sceneRef.current;

    // ---- a) 移除并释放旧的 pointCloud 对象 ----
    scene.children.forEach((child) => {
      if (child instanceof THREE.Points) {
        // 释放几何体和材质，防止显存泄漏
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
        scene.remove(child);
      }
    });

    // ---- b) 计算点云的包围盒并找出中心点，以及 minZ, maxZ ----
    const bounds = pointCloudData.reduce(
      (acc, p) => ({
        minX: Math.min(acc.minX, p.x),
        maxX: Math.max(acc.maxX, p.x),
        minY: Math.min(acc.minY, p.y),
        maxY: Math.max(acc.maxY, p.y),
        minZ: Math.min(acc.minZ, p.z),
        maxZ: Math.max(acc.maxZ, p.z),
      }),
      {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity
      }
    );

    const { minZ, maxZ } = bounds;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;

    // ---- c) 创建 BufferGeometry 并设置顶点 & 颜色属性 ----
    const positions = new Float32Array(pointCloudData.length * 3);
    const colors = new Float32Array(pointCloudData.length * 3);  // for RGB per vertex

    function getRainbowColor(t) {
        // t in [0,1], map to hue [0..1] (0=red, 0.33=green, 0.66=blue, etc.)
        const hue = t; // or (1 - t) if you want to reverse the direction
        const saturation = 1;
        const lightness = 0.5;
        // Convert to [r,g,b] in range 0..1
        return hslToRgb(hue, saturation, lightness);
    }

    pointCloudData.forEach((point, i) => {
        positions[i * 3 + 0] = point.x - centerX;
        positions[i * 3 + 1] = point.y - centerY;
        positions[i * 3 + 2] = point.z - centerZ;

        const t = (point.z - minZ) / ((maxZ - minZ) || 1);
        const [r, g, b] = getRainbowColor(t);

        colors[i * 3 + 0] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // ---- d) 创建材质 & Points 对象并添加到场景 ----
    // Note: vertexColors: true allows each vertex to have its own color
    const material = new THREE.PointsMaterial({
      size: 1.05,
      sizeAttenuation: true,
      vertexColors: true,     // <--- enable per-vertex color
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

        // 4) Compute bounding-box dimensions
    const sizeX = bounds.maxX - bounds.minX;
    const sizeY = bounds.maxY - bounds.minY;
    const sizeZ = bounds.maxZ - bounds.minZ;

    // 5) Create a box geometry of that size, centered at (0,0,0)
    const boxGeometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
    // Because we subtracted the center from point coords, the box is also centered at 0,0,0.

    // 6) Turn the box into an EdgesGeometry
    const edgesGeometry = new THREE.EdgesGeometry(boxGeometry);

    // 7) Create a dashed-line material for dotted edges
    const dashedMaterial = new THREE.LineBasicMaterial({
        color: 0x808080
    });

    // 8) Build the LineSegments + computeLineDistances()
    const boundingBoxLine = new THREE.LineSegments(edgesGeometry, dashedMaterial);
    boundingBoxLine.computeLineDistances();  // necessary for dashed lines

    // 9) Add bounding-box lines to scene
    scene.add(boundingBoxLine);

    // ---- e) 根据点云的最大维度重新设置相机位置并重置控制器的 target ----
    const maxDim = Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ
    );
    // 将相机放在一个更倾斜的角度，比如 (maxDim, maxDim, maxDim)
    cameraRef.current.position.set(maxDim, maxDim, maxDim);
    cameraRef.current.lookAt(0, 0, 0);

    // 重置 TrackballControls 的目标
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [pointCloudData]);

  // =========== 4) JSX 渲染部分 =========
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} ref={containerRef}>
      <div style={{ position: 'absolute', top: 10, left: 10, background: '#fff' }}>
        <div>X: {rotationAngles.x}°</div>
        <div>Y: {rotationAngles.y}°</div>
        <div>Z: {rotationAngles.z}°</div>
      </div>
    </div>
  );
}

ThreeDViewer.propTypes = {
  pointCloudData: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    z: PropTypes.number.isRequired
  }))
};

export default ThreeDViewer;
