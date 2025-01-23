import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';

function ThreeDViewer({ pointCloudData }) {
    const containerRef = useRef(null);
    const [rotationAngles, setRotationAngles] = useState({ x: 0, y: 0, z: 0 });

    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    let animationId;


    useEffect(() => {
        if (!containerRef.current) return;

        const scene = sceneRef.current;
        scene.background = new THREE.Color('#fafafa');

        // Setup camera
        const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        cameraRef.current = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000);
        cameraRef.current.position.set(0, 0, 0);

        // Create the renderer
        rendererRef.current = new THREE.WebGLRenderer({ antialias: true, precision: 'highp', powerPreference: 'high-performance' });
        rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        containerRef.current.appendChild(rendererRef.current.domElement);

        // TrackballControls
        controlsRef.current = new TrackballControls(cameraRef.current, rendererRef.current.domElement);
        controlsRef.current.rotateSpeed = 2.0;
        controlsRef.current.zoomSpeed = 1.2;
        controlsRef.current.panSpeed = 0.8;
        controlsRef.current.dynamicDampingFactor = 0.3;

        controlsRef.current.addEventListener('change', () => {
            const rotation = cameraRef.current.rotation;
            setRotationAngles({
                x: THREE.MathUtils.radToDeg(rotation.x).toFixed(2),
                y: THREE.MathUtils.radToDeg(rotation.y).toFixed(2),
                z: THREE.MathUtils.radToDeg(rotation.z).toFixed(2),
            });
        });

        // Add Axes Helper
        const axesHelper = new THREE.AxesHelper(50);
        scene.add(axesHelper);

        if (pointCloudData && pointCloudData.length > 0) {
            addPointCloudToScene(pointCloudData);
        }

        startAnimationLoop();

        return () => {
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
            if (controlsRef.current) controlsRef.current.dispose();
            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (containerRef.current) {
                    containerRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            sceneRef.current.clear();
        };
    }, [pointCloudData]);


    const addPointCloudToScene = (data) => {
        console.log("Adding point cloud to scene with", data.length, "points");

        const minX = Math.min(...data.map(p => p.x));
        const maxX = Math.max(...data.map(p => p.x));
        const minY = Math.min(...data.map(p => p.y));
        const maxY = Math.max(...data.map(p => p.y));
        const minZ = Math.min(...data.map(p => p.z));
        const maxZ = Math.max(...data.map(p => p.z));

        console.log(`X range: ${minX} to ${maxX}`);
        console.log(`Y range: ${minY} to ${maxY}`);
        console.log(`Z range: ${minZ} to ${maxZ}`);

        // Calculate the center (offset) of the point cloud dynamically
        const offsetX = (minX + maxX) / 2;
        const offsetY = (minY + maxY) / 2;
        const offsetZ = (minZ + maxZ) / 2;

        const numPoints = data.length;
        const positions = new Float32Array(numPoints * 3);

        for (let i = 0; i < numPoints; i++) {
            positions[i * 3] = data[i].x - offsetX;
            positions[i * 3 + 1] = data[i].y - offsetY;
            positions[i * 3 + 2] = data[i].z - offsetZ;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Set bounding box and adjust camera position
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);

        cameraRef.current.position.set(center.x, center.y, center.z + 100);
        cameraRef.current.lookAt(center);

        const material = new THREE.PointsMaterial({
            color: 0x00ff00,
            size: 1.5,
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        points.scale.set(10, 10, 10);

        sceneRef.current.add(points);

        console.log("Point cloud added successfully.");
    };





    const animationIdRef = useRef(null);

    const startAnimationLoop = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        animationIdRef.current = requestAnimationFrame(startAnimationLoop);
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                border: '1px solid #ccc',
                overflow: 'hidden',
            }}
        >
            {/* Display rotation angles in XYZ */}
            <div style={{
                position: 'absolute',
                top: '10px',
                left: '10px',
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#fff',
                padding: '8px',
                borderRadius: '5px',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px'
            }}>
                <div>Rotation:</div>
                <div>X: {rotationAngles.x}°</div>
                <div>Y: {rotationAngles.y}°</div>
                <div>Z: {rotationAngles.z}°</div>
            </div>
        </div>
    );
}

export default ThreeDViewer;
