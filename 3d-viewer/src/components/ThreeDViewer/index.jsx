import React, { useRef, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import * as THREE from 'three';
import './styles.css';

function PointCloud({ points }) {
    console.log('Rendering points:', points?.length);
    
    const { positions, colors } = useMemo(() => {
        if (!points || !points.length) {
            return { 
                positions: new Float32Array([]),
                colors: new Float32Array([])
            };
        }
        
        // First pass: calculate bounds in original coordinates
        const bounds = points.reduce(
            (acc, point) => ({
                minX: Math.min(acc.minX, point.x),
                maxX: Math.max(acc.maxX, point.x),
                minY: Math.min(acc.minY, point.y),
                maxY: Math.max(acc.maxY, point.y),
                minZ: Math.min(acc.minZ, point.z),
                maxZ: Math.max(acc.maxZ, point.z)
            }),
            {
                minX: Infinity, maxX: -Infinity,
                minY: Infinity, maxY: -Infinity,
                minZ: Infinity, maxZ: -Infinity
            }
        );

        // Calculate center for X and Z only (we want Y to start from 0)
        const center = {
            x: (bounds.minX + bounds.maxX) / 2,
            z: (bounds.minZ + bounds.maxZ) / 2,
            y: (bounds.minY + bounds.maxY) / 2
        };
        
        console.log('Bounds:', bounds);
        console.log('Center:', center);

        // Create positions and colors arrays
        const positionsArray = [];
        const colorsArray = [];

        points.forEach(point => {
            // Center X and Z, swap Y and Z (Y becomes up), and ensure Y starts from 0
            positionsArray.push(
                point.x - center.x,           // Center X
                point.z - bounds.minZ,        // Y becomes Z, shifted to start from 0
                point.y - center.y            // Z becomes Y, centered
            );

            // Calculate normalized height for color (now using Y-up coordinate)
            const normalizedHeight = (point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ);
            
            // Convert to hue (rainbow colors)
            const hue = normalizedHeight * 0.8;
            
            // Convert HSL to RGB
            const color = new THREE.Color();
            color.setHSL(hue, 1, 0.5);
            
            colorsArray.push(color.r, color.g, color.b);
        });

        return {
            positions: new Float32Array(positionsArray),
            colors: new Float32Array(colorsArray)
        };
    }, [points]);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeBoundingSphere();
        console.log('Bounding sphere:', geo.boundingSphere);
        return geo;
    }, [positions, colors]);

    const pointsMaterial = useMemo(() => {
        return new THREE.PointsMaterial({
            size: 0.015,
            sizeAttenuation: true,
            vertexColors: true,
            transparent: false,
            opacity: 1
        });
    }, []);

    return positions.length > 0 ? (
        <primitive object={new THREE.Points(geometry, pointsMaterial)} />
    ) : null;
}

PointCloud.propTypes = {
    points: PropTypes.arrayOf(PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
    }))
};

function ThreeDViewer({ fileData }) {
    const cameraRef = useRef();
    const [bounds, setBounds] = useState(null);
    const pointCloudData = fileData?.pointCloud || [];

    useEffect(() => {
        console.log('FileData received:', fileData);
        console.log('Point cloud data length:', pointCloudData?.length);
        
        if (pointCloudData && pointCloudData.length > 0) {
            const newBounds = pointCloudData.reduce((acc, point) => ({
                minX: Math.min(acc.minX, point.x),
                maxX: Math.max(acc.maxX, point.x),
                minY: Math.min(acc.minY, point.y),
                maxY: Math.max(acc.maxY, point.y),
                minZ: Math.min(acc.minZ, point.z),
                maxZ: Math.max(acc.maxZ, point.z)
            }), {
                minX: Infinity, maxX: -Infinity,
                minY: Infinity, maxY: -Infinity,
                minZ: Infinity, maxZ: -Infinity
            });
            console.log('Calculated bounds:', newBounds);
            setBounds(newBounds);
        }
    }, [pointCloudData, fileData]);

    const cameraPosition = useMemo(() => {
        if (!bounds) return [10, 10, 10];
        const maxDim = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY,
            bounds.maxZ - bounds.minZ
        );
        console.log('Max dimension:', maxDim);
        // 调整相机位置到正面视角
        return [maxDim * 2, maxDim * 1.5, maxDim * 2];
    }, [bounds]);

    return (
        <div style={{ width: '100%', height: '100%', background: '#000000' }}>
            <Canvas
                camera={{ position: cameraPosition, fov: 45 }}  // 减小FOV使视角更自然
                gl={{ antialias: true }}
                style={{ background: '#000000' }}
            >
                <Stats />
                <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={cameraPosition}
                    fov={50}
                    near={0.1}
                    far={10000}
                />
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={0.5}
                    zoomSpeed={0.8}
                    panSpeed={0.5}
                    target={[0, 0, 0]}
                />
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <PointCloud points={pointCloudData} />
                <gridHelper args={[100, 100]} />
                <axesHelper args={[50]} />
            </Canvas>
        </div>
    );
}

ThreeDViewer.propTypes = {
    fileData: PropTypes.shape({
        file: PropTypes.shape({
            name: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired
        }).isRequired,
        pointCloud: PropTypes.arrayOf(PropTypes.shape({
            x: PropTypes.number.isRequired,
            y: PropTypes.number.isRequired,
            z: PropTypes.number.isRequired
        })),
        geoJson: PropTypes.any
    })
};

export default ThreeDViewer;
