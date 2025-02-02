import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { useControls, folder, button, useStoreContext, buttonGroup } from 'leva';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import './styles.css';

function PointCloud({ points, pointRadius, pointColor, opacity, sizeAttenuation, scale }) {
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

        // Step 2: Compute center and scale
        const center = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            z: (minZ + maxZ) / 2
        };

        const maxDimension = Math.max(
            maxX - minX,
            maxY - minY,
            maxZ - minZ
        );
        
        const targetSize = 10;
        const scaleFactor = maxDimension > 0 ? targetSize / maxDimension : 1;

        console.log("XYZ Bounding Box:", { minX, maxX, minY, maxY, minZ, maxZ });
        console.log("XYZ Center:", { centerX: center.x, centerY: center.y, centerZ: center.z });
        console.log("XYZ Scale Factor:", scaleFactor);

        // Filter and transform points
        const positionsArray = [];
        const colorsArray = [];

        points.forEach(point => {
            // Center and scale the point
            const x = (point.x - center.x) * scaleFactor;
            const y = (point.y - center.y) * scaleFactor;
            const z = (point.z - center.z) * scaleFactor;

            positionsArray.push(x, y, z);

            const normalizedHeight = (point.y - minY) / (maxY - minY);
            const hue = normalizedHeight * 0.8;
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
    const controlsRef = useRef();  // Add ref for OrbitControls
    const [bounds, setBounds] = useState(null);
    const [pointRadius, setPointRadius] = useState(0.4);
    const [pointColor, setPointColor] = useState(null);
    const [opacity, setOpacity] = useState(1);
    const [sizeAttenuation, setSizeAttenuation] = useState(true);
    const [scale, setScale] = useState(1.0);
    const [pointCloudData, setPointCloudData] = useState([]);
    const [pcdPoints, setPcdPoints] = useState(null);

    // Add scale step state
    const [scaleStepValue, setScaleStepValue] = useState(0.1);
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 10.0;
    const DEFAULT_SCALE = 1.0;

    // Create a ref to store the current step value
    const currentStepRef = useRef(scaleStepValue);

    // Update ref when step value changes
    useEffect(() => {
        currentStepRef.current = scaleStepValue;
    }, [scaleStepValue]);

    // Scale control functions
    const increaseScaleOnce = useCallback(() => {
        setScale(prev => prev + currentStepRef.current);
    }, []);

    const decreaseScaleOnce = useCallback(() => {
        setScale(prev => prev - currentStepRef.current);
    }, []);

    // Get the Leva store context
    const store = useStoreContext();

    // Update camera control function
    const setViewDirection = useCallback((direction) => {
        console.log('Setting view direction:', direction);
        if (!cameraRef.current || !controlsRef.current) {
            console.log('Missing required refs');
            return;
        }

        // Get current distance from origin
        const currentDistance = cameraRef.current.position.length();
        console.log('Current distance:', currentDistance);

        // Define unit vectors for each direction
        const views = {
            front: [0, 0, 1],
            back: [0, 0, -1],
            left: [-1, 0, 0],
            right: [1, 0, 0],
            top: [0, 1, 0],
            bottom: [0, -1, 0]
        };

        // Get direction vector and normalize it
        const directionVector = views[direction];
        
        // Scale the direction vector by current distance
        const newPosition = directionVector.map(coord => coord * currentDistance);
        console.log('New camera position:', newPosition);
        
        // Update both camera and controls
        cameraRef.current.position.set(...newPosition);
        cameraRef.current.lookAt(0, 0, 0);
        cameraRef.current.updateProjectionMatrix();

        // Update OrbitControls target and camera
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
    }, []);

    const { 
        pointSize,
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
        Scale: folder({
            currentScale: {
                value: scale.toFixed(3),
                label: 'Current',
                editable: false,
            },
            stepSize: {
                value: 0.1,
                label: 'Step Size',
                type: 'NUMBER',
                onChange: (value) => {
                    const newStep = Math.abs(Number(value));
                    if (!isNaN(newStep) && newStep > 0) {
                        setScaleStepValue(newStep);
                    }
                }
            },
            scaleControls: buttonGroup({
                '➖': () => decreaseScaleOnce(),
                '🔄': () => setScale(DEFAULT_SCALE),
                '➕': () => increaseScaleOnce()
            })
        }),
        useVertexColors: {
            value: true,
            label: 'Use Height Colors'
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
        View: folder({
            'X': buttonGroup({
                '⬅️': () => setViewDirection('left'),
                '➡️': () => setViewDirection('right')
            }),
            'Y': buttonGroup({
                '⬆️': () => setViewDirection('top'),
                '⬇️': () => setViewDirection('bottom')
            }),
            'Z': buttonGroup({
                '⬅️': () => setViewDirection('front'),
                '➡️': () => setViewDirection('back')
            })
        })
    });

    // Update scale display
    useEffect(() => {
        if (store) {
            store.set({ 'Scale.currentScale': scale.toFixed(3) });
        }
    }, [scale, store]);

    // Set initial bounds from fileData
    useEffect(() => {
        if (fileData?.pointCloud?.bounds) {
            console.log('Setting bounds from fileData:', fileData.pointCloud.bounds);
            setBounds(fileData.pointCloud.bounds);
        }
    }, [fileData]);

    // Update point cloud data
    useEffect(() => {
        const loadPointCloudData = async () => {
            if (!fileData?.pointCloud) return;

            if (fileData.pointCloud.xyz) {
                setPointCloudData(fileData.pointCloud.xyz);
                setPcdPoints(null);
            } else if (fileData.pointCloud.pcd) {
                try {
                    const loader = new PCDLoader();
                    const pcdObject = await loader.loadAsync(fileData.pointCloud.pcd);
                    
                    // Get bounds from fileData
                    const bounds = fileData.pointCloud.bounds;
                    
                    // Calculate center point
                    const center = {
                        x: (bounds.minX + bounds.maxX) / 2,
                        y: (bounds.minY + bounds.maxY) / 2,
                        z: (bounds.minZ + bounds.maxZ) / 2
                    };

                    // Calculate scale to fit in a 10x10x10 box
                    const maxDimension = Math.max(
                        bounds.maxX - bounds.minX,
                        bounds.maxY - bounds.minY,
                        bounds.maxZ - bounds.minZ
                    );
                    
                    const targetSize = 10;
                    const scaleFactor = maxDimension > 0 ? targetSize / maxDimension : 1;

                    // Center the geometry first
                    pcdObject.geometry.center();
                    
                    // Then apply position and scale
                    pcdObject.position.set(0, 0, 0);
                    pcdObject.scale.setScalar(scaleFactor);

                    // Store original geometry for filtering
                    pcdObject.originalGeometry = pcdObject.geometry.clone();

                    // Update material
                    const material = new THREE.PointsMaterial({
                        size: pointRadius,
                        sizeAttenuation: sizeAttenuation,
                        vertexColors: useVertexColors,
                        ...(useVertexColors ? {} : { color: new THREE.Color(color) }),
                        transparent: true,
                        opacity: opacity
                    });
                    
                    pcdObject.material = material;
                    setPcdPoints(pcdObject);
                    setPointCloudData([]);

                } catch (error) {
                    console.error('Error loading PCD file:', error);
                }
            }
        };

        loadPointCloudData();
    }, [fileData, pointRadius, sizeAttenuation, useVertexColors, color, opacity]);

    // Update PCD filtering effect
    useEffect(() => {
        if (pcdPoints && pcdPoints.originalGeometry) {
            const originalPositions = pcdPoints.originalGeometry.attributes.position.array;
            const currentGeometry = pcdPoints.originalGeometry.clone();
            const positions = currentGeometry.attributes.position.array;

            // Calculate colors using bounds from fileData
            const colors = new Float32Array(positions.length);
            const bounds = fileData.pointCloud.bounds;
            
            for (let i = 0; i < positions.length; i += 3) {
                const y = positions[i + 1];
                const normalizedHeight = (y - bounds.minY) / (bounds.maxY - bounds.minY);
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
        }
    }, [pcdPoints, fileData]);

    // Sync all controls with state
    useEffect(() => {
        setPointRadius(pointSize);
        setPointColor(useVertexColors ? null : color);
        setOpacity(pointOpacity);
        setSizeAttenuation(enableSizeAttenuation);
        if (cameraRef.current) {
            cameraRef.current.fov = cameraFOV;
            cameraRef.current.updateProjectionMatrix();
        }
    }, [pointSize, useVertexColors, color, pointOpacity, enableSizeAttenuation, cameraFOV]);

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
                    ref={controlsRef}
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
            })),
            bounds: PropTypes.shape({
                minX: PropTypes.number.isRequired,
                maxX: PropTypes.number.isRequired,
                minY: PropTypes.number.isRequired,
                maxY: PropTypes.number.isRequired,
                minZ: PropTypes.number.isRequired,
                maxZ: PropTypes.number.isRequired
            })
        }),
        geoJson: PropTypes.any
    })
};

export default ThreeDViewer;
