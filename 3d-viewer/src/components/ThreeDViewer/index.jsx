import React, { useRef, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { useControls, folder } from 'leva';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import './styles.css';

function PointCloud({ points, pointRadius, pointColor, opacity, sizeAttenuation, scale, altitudeRange, enableAltitudeFilter }) {
    console.log('Rendering points:', points?.length);

    const { positions, colors } = useMemo(() => {
        if (!points || !points.length) {
            return { positions: new Float32Array([]), colors: new Float32Array([]) };
        }

        // Step 1: Compute bounding box
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        points.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });

        // Step 2: Compute center
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        // Step 3: Compute maximum dimension
        const sizeX = maxX - minX;
        const sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;
        const maxDimension = Math.max(sizeX, sizeY, sizeZ);
        
        // Set scale factor
        const targetSize = 10;
        const scaleFactor = maxDimension > 0 ? targetSize / maxDimension : 1;

        console.log("XYZ Bounding Box:", { minX, maxX, minY, maxY, minZ, maxZ });
        console.log("XYZ Center:", { centerX, centerY, centerZ });
        console.log("XYZ Scale Factor:", scaleFactor);

        // Filter and transform points
        const positionsArray = [];
        const colorsArray = [];

        points.forEach(point => {
            const y = (point.y - centerY) * scaleFactor;
            if (!enableAltitudeFilter || (y >= altitudeRange.min && y <= altitudeRange.max)) {
                positionsArray.push(
                    (point.x - centerX) * scaleFactor,
                    y,
                    (point.z - centerZ) * scaleFactor
                );

                const normalizedHeight = (point.y - minY) / (maxY - minY);
                const hue = normalizedHeight * 0.8;
                const color = new THREE.Color();
                color.setHSL(hue, 1, 0.5);
                colorsArray.push(color.r, color.g, color.b);
            }
        });

        return {
            positions: new Float32Array(positionsArray),
            colors: new Float32Array(colorsArray)
        };
    }, [points, altitudeRange, enableAltitudeFilter]);

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
    scale: PropTypes.number.isRequired,
    altitudeRange: PropTypes.shape({
        min: PropTypes.number.isRequired,
        max: PropTypes.number.isRequired
    }),
    enableAltitudeFilter: PropTypes.bool.isRequired
};

function ThreeDViewer({ fileData }) {
    const cameraRef = useRef();
    const [bounds, setBounds] = useState(null);
    const [pointRadius, setPointRadius] = useState(0.4);
    const [pointColor, setPointColor] = useState(null);
    const [opacity, setOpacity] = useState(1);
    const [sizeAttenuation, setSizeAttenuation] = useState(true);
    const [scale, setScale] = useState(1.0);
    const [pointCloudData, setPointCloudData] = useState([]);
    const [pcdPoints, setPcdPoints] = useState(null);
    const [altitudeRange, setAltitudeRange] = useState({ min: -Infinity, max: Infinity });
    const [originalBounds, setOriginalBounds] = useState(null);

    const { 
        pointSize,
        pointScale,
        useVertexColors,
        color,
        pointOpacity,
        enableSizeAttenuation,
        cameraFOV,
        backgroundColor,
        altitudeMin,
        altitudeMax,
        enableAltitudeFilter
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
        },
        Filtering: folder({
            enableAltitudeFilter: {
                value: false,
                label: 'Enable Altitude Filter'
            },
            altitudeMin: {
                value: originalBounds ? originalBounds.minY : -5,
                min: originalBounds ? originalBounds.minY : -5,
                max: originalBounds ? originalBounds.maxY : 5,
                step: 0.1,
                label: 'Min Altitude',
                render: (get) => get('Filtering.enableAltitudeFilter')
            },
            altitudeMax: {
                value: originalBounds ? originalBounds.maxY : 5,
                min: originalBounds ? originalBounds.minY : -5,
                max: originalBounds ? originalBounds.maxY : 5,
                step: 0.1,
                label: 'Max Altitude',
                render: (get) => get('Filtering.enableAltitudeFilter')
            }
        })
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

    // Update altitude range when controls change
    useEffect(() => {
        if (enableAltitudeFilter) {
            setAltitudeRange({ min: altitudeMin, max: altitudeMax });
        } else {
            setAltitudeRange({ min: -Infinity, max: Infinity });
        }
    }, [enableAltitudeFilter, altitudeMin, altitudeMax]);

    useEffect(() => {
        const loadPointCloudData = async () => {
            if (!fileData) return;

            if (fileData.file.name.toLowerCase().endsWith('.pcd')) {
                const loader = new PCDLoader();
                try {
                    const pcdUrl = fileData.pointCloud.pcd;
                    if (!pcdUrl) {
                        console.error('No PCD URL provided');
                        return;
                    }

                    const pcdObject = await loader.loadAsync(pcdUrl);
                    console.log('Loaded PCD:', pcdObject);

                    // Calculate bounds from original geometry
                    const geometry = pcdObject.geometry;
                    const positions = geometry.attributes.position.array;
                    
                    // Compute bounding box in original coordinates
                    let minX = Infinity, maxX = -Infinity;
                    let minY = Infinity, maxY = -Infinity;
                    let minZ = Infinity, maxZ = -Infinity;

                    for (let i = 0; i < positions.length; i += 3) {
                        minX = Math.min(minX, positions[i]);
                        maxX = Math.max(maxX, positions[i]);
                        minY = Math.min(minY, positions[i + 1]);
                        maxY = Math.max(maxY, positions[i + 1]);
                        minZ = Math.min(minZ, positions[i + 2]);
                        maxZ = Math.max(maxZ, positions[i + 2]);
                    }

                    // Store original bounds for filtering
                    setOriginalBounds({ minX, maxX, minY, maxY, minZ, maxZ });

                    // Calculate center and scale for display
                    const centerX = (minX + maxX) / 2;
                    const centerY = (minY + maxY) / 2;
                    const centerZ = (minZ + maxZ) / 2;

                    const maxDimension = Math.max(
                        maxX - minX,
                        maxY - minY,
                        maxZ - minZ
                    );
                    
                    const targetSize = 10;
                    const scaleFactor = maxDimension > 0 ? targetSize / maxDimension : 1;

                    // Instead of modifying geometry, set object transform
                    pcdObject.position.set(-centerX, -centerY, -centerZ);
                    pcdObject.scale.set(scaleFactor, scaleFactor, scaleFactor);

                    setPcdPoints(pcdObject);
                    setBounds({
                        minX: -targetSize/2,
                        maxX: targetSize/2,
                        minY: -targetSize/2,
                        maxY: targetSize/2,
                        minZ: -targetSize/2,
                        maxZ: targetSize/2
                    });

                } catch (error) {
                    console.error('Error loading PCD file:', error);
                }
            } else {
                // Handle XYZ data
                const xyzData = fileData.pointCloud.xyz;
                setPointCloudData(Array.isArray(xyzData) ? xyzData : []);
                setPcdPoints(null);
            }
        };

        loadPointCloudData();
    }, [fileData]);

    // Add this effect to store original geometry when PCD is loaded
    useEffect(() => {
        if (pcdPoints && !pcdPoints.originalGeometry) {
            pcdPoints.originalGeometry = pcdPoints.geometry.clone();
        }
    }, [pcdPoints]);

    // Update the PCD material and filtering effect
    useEffect(() => {
        if (pcdPoints && pcdPoints.originalGeometry) {
            const originalPositions = pcdPoints.originalGeometry.attributes.position.array;
            let currentGeometry;
            let positions;

            if (!enableAltitudeFilter) {
                // Use original geometry when filter is disabled
                currentGeometry = pcdPoints.originalGeometry.clone();
                positions = currentGeometry.attributes.position.array;
            } else {
                // Filter points using original coordinates
                const filteredPositions = [];
                
                for (let i = 0; i < originalPositions.length; i += 3) {
                    const y = originalPositions[i + 1];
                    if (y >= altitudeRange.min && y <= altitudeRange.max) {
                        filteredPositions.push(
                            originalPositions[i],
                            originalPositions[i + 1],
                            originalPositions[i + 2]
                        );
                    }
                }

                currentGeometry = new THREE.BufferGeometry();
                currentGeometry.setAttribute('position', 
                    new THREE.Float32BufferAttribute(filteredPositions, 3));
                positions = currentGeometry.attributes.position.array;
            }

            // Calculate colors
            const colors = new Float32Array(positions.length);
            for (let i = 0; i < positions.length; i += 3) {
                const y = positions[i + 1];
                const normalizedHeight = (y - originalBounds.minY) / (originalBounds.maxY - originalBounds.minY);
                const hue = normalizedHeight * 0.8;
                const color = new THREE.Color();
                color.setHSL(hue, 1, 0.5);

                colors[i] = color.r;
                colors[i + 1] = color.g;
                colors[i + 2] = color.b;
            }

            currentGeometry.setAttribute('color',
                new THREE.Float32BufferAttribute(colors, 3));

            // Update geometry while preserving transforms
            const position = pcdPoints.position.clone();
            const scale = pcdPoints.scale.clone();
            pcdPoints.geometry = currentGeometry;
            pcdPoints.position.copy(position);
            pcdPoints.scale.copy(scale);

            // Update material
            const material = new THREE.PointsMaterial({
                size: pointRadius,
                sizeAttenuation: sizeAttenuation,
                vertexColors: useVertexColors,
                ...(useVertexColors ? {} : { color: new THREE.Color(color) }),
                transparent: true,
                opacity: opacity
            });
            
            pcdPoints.material = material;
        }
    }, [pcdPoints, pointRadius, sizeAttenuation, useVertexColors, color, opacity, altitudeRange, enableAltitudeFilter, originalBounds]);

    // Update the altitude range effect
    useEffect(() => {
        if (enableAltitudeFilter && originalBounds) {
            // Update Leva controls range based on original bounds
            const minY = originalBounds.minY;
            const maxY = originalBounds.maxY;
            
            // Set altitude range based on original bounds
            setAltitudeRange({ 
                min: altitudeMin,
                max: altitudeMax
            });
        } else {
            setAltitudeRange({ min: -Infinity, max: Infinity });
        }
    }, [enableAltitudeFilter, altitudeMin, altitudeMax, originalBounds]);

    // Apply scale to PCD object
    useEffect(() => {
        if (pcdPoints) {
            pcdPoints.scale.set(scale, scale, scale);
        }
    }, [pcdPoints, scale]);

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

    const renderPointCloud = () => {
        if (pcdPoints) {
            // Apply initial material settings to PCD points
            if (pcdPoints.material) {
                pcdPoints.material.size = pointRadius;
                pcdPoints.material.sizeAttenuation = sizeAttenuation;
                pcdPoints.material.opacity = opacity;
                pcdPoints.material.transparent = true;
                if (!useVertexColors) {
                    pcdPoints.material.color = new THREE.Color(color);
                    pcdPoints.material.vertexColors = false;
                } else {
                    pcdPoints.material.vertexColors = true;
                }
            }
            return <primitive object={pcdPoints} />;
        } else {
            // Render XYZ points using our PointCloud component
            return (
                <PointCloud 
                    points={pointCloudData} 
                    pointRadius={pointRadius}
                    pointColor={pointColor}
                    opacity={opacity}
                    sizeAttenuation={sizeAttenuation}
                    scale={scale}
                    altitudeRange={altitudeRange}
                    enableAltitudeFilter={enableAltitudeFilter}
                />
            );
        }
    };

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
                {renderPointCloud()}
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
            size: PropTypes.number.isRequired,
            points: PropTypes.number
        }).isRequired,
        pointCloud: PropTypes.shape({
            pcd: PropTypes.any, // Can be binary data or string
            xyz: PropTypes.arrayOf(PropTypes.shape({
                x: PropTypes.number.isRequired,
                y: PropTypes.number.isRequired,
                z: PropTypes.number.isRequired
            }))
        }),
        geoJson: PropTypes.any
    })
};

export default ThreeDViewer;
