import React, { useRef, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import './styles.css';

function PointCloud({ points, pointRadius, pointColor, opacity, sizeAttenuation, scale }) {
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
            // Apply scaling to centered coordinates
            const scaledX = (point.x - center.x) * scale;
            const scaledY = (point.y - center.y) * scale;
            const scaledZ = (point.z - center.z) * scale;
            
            positionsArray.push(
                scaledX,           // Scaled X
                scaledY,          // Scaled Y
                scaledZ           // Scaled Z
            );

            // Calculate normalized height for color
            const normalizedHeight = (point.z - bounds.minZ) / (bounds.maxZ - bounds.minZ);
            const hue = normalizedHeight * 0.8;
            const color = new THREE.Color();
            color.setHSL(hue, 1, 0.5);
            colorsArray.push(color.r, color.g, color.b);
        });

        return {
            positions: new Float32Array(positionsArray),
            colors: new Float32Array(colorsArray)
        };
    }, [points, scale]);

    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeBoundingSphere();
        console.log('Bounding sphere:', geo.boundingSphere);
        return geo;
    }, [positions, colors]);

    const pointsMaterial = useMemo(() => {
        const material = new THREE.PointsMaterial({
            size: pointRadius,
            sizeAttenuation: sizeAttenuation,
            vertexColors: !pointColor,
            ...(pointColor ? { color: new THREE.Color(pointColor) } : {}),
            transparent: true,
            opacity: opacity
        });
        return material;
    }, [pointRadius, pointColor, opacity, sizeAttenuation]);

    return positions.length > 0 ? (
        <primitive object={new THREE.Points(geometry, pointsMaterial)} />
    ) : null;
}

PointCloud.propTypes = {
    points: PropTypes.arrayOf(PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
    })),
    pointRadius: PropTypes.number.isRequired,
    pointColor: PropTypes.string,
    opacity: PropTypes.number.isRequired,
    sizeAttenuation: PropTypes.bool.isRequired,
    scale: PropTypes.number.isRequired
};

function ThreeDViewer({ fileData }) {
    const cameraRef = useRef();
    const [bounds, setBounds] = useState(null);
    const [pointRadius, setPointRadius] = useState(0.4);
    const [pointColor, setPointColor] = useState(null);
    const [opacity, setOpacity] = useState(1);
    const [sizeAttenuation, setSizeAttenuation] = useState(true);
    const [scale, setScale] = useState(1.0);
    const pointCloudData = fileData?.pointCloud || [];

    const { 
        pointSize,
        pointScale,
        useVertexColors,
        color,
        pointOpacity,
        enableSizeAttenuation,
        cameraFOV,
        backgroundColor
    } = useControls({
        pointSize: {
            value: 0.4,
            min: 0.1,
            max: 5,
            step: 0.1,
            label: 'Point Size'
        },
        pointScale: {
            value: 1.0,
            min: 0.1,
            max: 10,
            step: 0.1,
            label: 'Scale'
        },
        useVertexColors: {
            value: true,
            label: 'Use Height Colors'
        },
        color: {
            value: '#ffffff',
            label: 'Point Color',
            render: (get) => !get('useVertexColors')
        },
        pointOpacity: {
            value: 1,
            min: 0,
            max: 1,
            step: 0.1,
            label: 'Opacity'
        },
        enableSizeAttenuation: {
            value: true,
            label: 'Size Perspective'
        },
        cameraFOV: {
            value: 50,
            min: 20,
            max: 120,
            step: 1,
            label: 'Field of View'
        },
        backgroundColor: {
            value: '#000000',
            label: 'Background'
        }
        });

    // Sync all controls with state
    useEffect(() => {
        setPointRadius(pointSize);
        setPointColor(useVertexColors ? null : color);
        setOpacity(pointOpacity);
        setSizeAttenuation(enableSizeAttenuation);
        setScale(pointScale);
        if (cameraRef.current) {
            cameraRef.current.fov = cameraFOV;
            cameraRef.current.updateProjectionMatrix();
        }
    }, [pointSize, useVertexColors, color, pointOpacity, enableSizeAttenuation, pointScale, cameraFOV]);

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
        <div style={{ width: '100%', height: '100%', background: backgroundColor, position: 'relative' }}>
            <Canvas
                camera={{ position: cameraPosition, fov: cameraFOV }}
                gl={{ antialias: true, preserveDrawingBuffer:true }}
                style={{ background: backgroundColor }}
            >
                <Stats />
                <PerspectiveCamera
                    ref={cameraRef}
                    makeDefault
                    position={cameraPosition}
                    fov={cameraFOV}
                    aspect={window.innerWidth / window.innerHeight}
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
                <PointCloud 
                    points={pointCloudData} 
                    pointRadius={pointRadius}
                    pointColor={pointColor}
                    opacity={opacity}
                    sizeAttenuation={sizeAttenuation}
                    scale={scale}
                />
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
