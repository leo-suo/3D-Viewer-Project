import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import './styles.css';

function ThreeDViewer({ pointCloudData }) {
    const containerRef = useRef(null);
    const [rotationAngles, setRotationAngles] = useState({ x: 0, y: 0, z: 0 });

    const sceneRef = useRef(new THREE.Scene());
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const animationIdRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = sceneRef.current;
        scene.background = new THREE.Color('#fafafa');

        // Setup camera
        const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        cameraRef.current = new THREE.PerspectiveCamera(60, aspect, 0.1, 50000);
        cameraRef.current.position.set(0, 0, 0);

        // Create renderer
        rendererRef.current = new THREE.WebGLRenderer({ 
            antialias: true, 
            precision: 'highp',
            powerPreference: 'high-performance'
        });
        rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        containerRef.current.appendChild(rendererRef.current.domElement);

        // Setup controls
        controlsRef.current = new TrackballControls(cameraRef.current, rendererRef.current.domElement);
        controlsRef.current.rotateSpeed = 2.5;
        controlsRef.current.zoomSpeed = 1.2;
        controlsRef.current.panSpeed = 0.8;
        controlsRef.current.dynamicDampingFactor = 0.3;

        // Add axes helper
        const axesHelper = new THREE.AxesHelper(50);
        scene.add(axesHelper);

        // Handle window resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };

        window.addEventListener('resize', handleResize);

        // Start animation loop
        const animate = () => {
            if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
            controlsRef.current.update();
            rendererRef.current.render(sceneRef.current, cameraRef.current);
            animationIdRef.current = requestAnimationFrame(animate);

            // Update rotation angles
            const rotation = cameraRef.current.rotation;
            setRotationAngles({
                x: THREE.MathUtils.radToDeg(rotation.x).toFixed(2),
                y: THREE.MathUtils.radToDeg(rotation.y).toFixed(2),
                z: THREE.MathUtils.radToDeg(rotation.z).toFixed(2),
            });
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
            if (controlsRef.current) controlsRef.current.dispose();
            if (rendererRef.current) {
                rendererRef.current.dispose();
                if (containerRef.current) {
                    containerRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            scene.clear();
        };
    }, []);

    useEffect(() => {
        if (!pointCloudData?.length) return;

        const scene = sceneRef.current;
        
        // Clear existing points
        scene.children = scene.children.filter(child => !(child instanceof THREE.Points));

        // Calculate bounds
        const bounds = pointCloudData.reduce((acc, point) => ({
            minX: Math.min(acc.minX, point.x),
            maxX: Math.max(acc.maxX, point.x),
            minY: Math.min(acc.minY, point.y),
            maxY: Math.max(acc.maxY, point.y),
            minZ: Math.min(acc.minZ, point.z),
            maxZ: Math.max(acc.maxZ, point.z),
        }), {
            minX: Infinity, maxX: -Infinity,
            minY: Infinity, maxY: -Infinity,
            minZ: Infinity, maxZ: -Infinity
        });

        // Calculate center for offset
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const centerZ = (bounds.minZ + bounds.maxZ) / 2;

        // Create geometry
        const positions = new Float32Array(pointCloudData.length * 3);
        pointCloudData.forEach((point, i) => {
            positions[i * 3] = point.x - centerX;
            positions[i * 3 + 1] = point.y - centerY;
            positions[i * 3 + 2] = point.z - centerZ;
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create material
        const material = new THREE.PointsMaterial({
            size: 0.05,
            sizeAttenuation: true,
            color: 0x00ff00,
        });

        // Create points
        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // Position camera
        const maxDim = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY,
            bounds.maxZ - bounds.minZ
        );
        
        cameraRef.current.position.set(0, 0, maxDim * 1.5);
        cameraRef.current.lookAt(0, 0, 0);
        
        // Reset controls target
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();

    }, [pointCloudData]);

    return (
        <div className="viewer-container" ref={containerRef}>
            <div className="rotation-info">
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
