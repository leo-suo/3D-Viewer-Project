import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei';
import { useControls, folder, button, useStoreContext, buttonGroup } from 'leva';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';
import './styles.css';

function PointCloud({ points, pointRadius, pointColor, opacity, sizeAttenuation, scale, useVertexColors }) {
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
            minY = Math.min(minY, point.z);
            minZ = Math.min(minZ, -point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.z);
            maxZ = Math.max(maxZ, -point.y);
        });

        // Step 2: Compute center and scale
        const center = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            z: (minZ + maxZ) / 2
        };


        console.log("XYZ Bounding Box:", { minX, maxX, minY, maxY, minZ, maxZ });
        console.log("XYZ Center:", { centerX: center.x, centerY: center.y, centerZ: center.z });
        console.log("XYZ Scale:", scale);

        // Filter and transform points
        const positionsArray = [];
        const colorsArray = [];

        points.forEach(point => {
            // Center and scale the point
            const x = (point.x - center.x) * scale;
            const y = (point.z - center.y) * scale;
            const z = (-point.y - center.z) * scale;

            positionsArray.push(x, y, z);

            if (useVertexColors) {
                // Height-based color calculation using Z axis
                const normalizedHeight = (z - minZ) / (maxZ - minZ);
                const hue = normalizedHeight * 0.8;
                const color = new THREE.Color();
                color.setHSL(hue, 1, 0.5);
                colorsArray.push(color.r, color.g, color.b);
            } else {
                // Use white color (will be tinted by material color)
                colorsArray.push(1, 1, 1);
            }
        });

        return {
            positions: new Float32Array(positionsArray),
            colors: new Float32Array(colorsArray)
        };
    }, [points, scale, useVertexColors]);

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
            vertexColors: useVertexColors,
            color: useVertexColors ? undefined : new THREE.Color(pointColor),
            transparent: true,
            opacity: opacity
        });
        return material;
    }, [pointRadius, pointColor, opacity, sizeAttenuation, useVertexColors]);

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
    useVertexColors: PropTypes.bool.isRequired
};

function ThreeDViewer({ fileData, onLogActivity }) {
    const cameraRef = useRef();
    const controlsRef = useRef();  // Add ref for OrbitControls
    const [bounds, setBounds] = useState(null);
    const [pointRadius, setPointRadius] = useState(1.0);
    const [pointStepValue, setPointStepValue] = useState(0.1);  // Add step state for point size
    const [pointColor, setPointColor] = useState(null);
    const [opacity, setOpacity] = useState(1);
    const [sizeAttenuation, setSizeAttenuation] = useState(true);
    const [scale, setScale] = useState(1.0);
    const [pointCloudData, setPointCloudData] = useState([]);
    const [pcdPoints, setPcdPoints] = useState(null);

    // Add scale step state
    const [scaleStepValue, setScaleStepValue] = useState(0.1);
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

    // Update camera position to view from an angle where Z is up
    const cameraPosition = useMemo(() => {
        if (!bounds) return [10, 10, 20]; // Changed initial position
        const maxDim = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY,
            bounds.maxZ - bounds.minZ
        );
        // Position camera to view Z as up (X, Y, Z)
        return [maxDim * 1.5, maxDim * 1.5, maxDim * 2]; // Increased Z component
    }, [bounds]);

    // Update setViewDirection to maintain Z-up orientation
    const setViewDirection = useCallback((direction) => {
        if (!cameraRef.current || !controlsRef.current) return;

        const currentDistance = cameraRef.current.position.length();
        
        // Adjusted view vectors for Z-up orientation
        const views = {
            front: [1, 0, 0],      // Looking along X axis (YZ plane)
            back: [-1, 0, 0],      // Looking along -X axis (YZ plane)
            left: [0, 1, 0],       // Looking along Y axis (XZ plane)
            right: [0, -1, 0],     // Looking along -Y axis (XZ plane)
            top: [0, 0, 1],        // Looking down Z axis (XY plane)
            bottom: [0, 0, -1]     // Looking up -Z axis (XY plane)
        };

        const directionVector = views[direction];
        const newPosition = directionVector.map(coord => coord * currentDistance);
        
        cameraRef.current.position.set(...newPosition);
        cameraRef.current.up.set(0, 0, 1);  // Keep Z as up
        cameraRef.current.lookAt(0, 0, 0);
        cameraRef.current.updateProjectionMatrix();

        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.up.set(0, 0, 1); // Keep Z as up
        controlsRef.current.update();
    }, []);

    // Point size control functions
    const increasePointSize = useCallback(() => {
        setPointRadius(prev => {
            const newSize = Math.min(10.0, prev + pointStepValue);
            if (pcdPoints?.material) {
                pcdPoints.material.size = newSize;
                pcdPoints.material.needsUpdate = true;
            }
            return newSize;
        });
    }, [pcdPoints, pointStepValue]);

    const decreasePointSize = useCallback(() => {
        setPointRadius(prev => {
            const newSize = Math.max(0.1, prev - pointStepValue);
            if (pcdPoints?.material) {
                pcdPoints.material.size = newSize;
                pcdPoints.material.needsUpdate = true;
            }
            return newSize;
        });
    }, [pcdPoints, pointStepValue]);

    const resetPointSize = useCallback(() => {
        setPointRadius(1.0);
        if (pcdPoints?.material) {
            pcdPoints.material.size = 1.0;
            pcdPoints.material.needsUpdate = true;
        }
    }, [pcdPoints]);

    const { 
        useVertexColors,
        color,
        pointOpacity,
        enableSizeAttenuation,
        cameraFOV,
        backgroundColor
    } = useControls({
        PointSize: folder({
            pointStepSize: {
                value: 0.1,
                label: 'Point Step Size',
                type: 'NUMBER',
                onChange: (value) => {
                    const newStep = Math.abs(Number(value));
                    if (!isNaN(newStep) && newStep > 0) {
                        setPointStepValue(newStep);
                    }
                }
            },
            controls: buttonGroup({
                '➖': () => {
                    decreasePointSize();
                    onLogActivity(`Point size decreased to ${pointRadius.toFixed(1)}`);
                },
                '🔄': () => {
                    resetPointSize();
                    onLogActivity('Point size reset to 1.0');
                },
                '➕': () => {
                    increasePointSize();
                    onLogActivity(`Point size increased to ${pointRadius.toFixed(1)}`);
                }
            })
        }),
        Scale: folder({
            scaleStepSize: {
                value: 0.1,
                label: 'Scale Step Size',
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
        color: {
            value: '#ffffff',
            label: 'Point Color',
            render: (get) => !get('useVertexColors')  // Only show when useVertexColors is false
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

    // Update point size display
    useEffect(() => {
        if (store) {
            store.set({ 'PointSize.currentSize': pointRadius.toFixed(3) });
        }
    }, [pointRadius, store]);

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
                    
                    // Rotate the geometry to make Z up
                    pcdObject.geometry.rotateX(Math.PI / 2);
                    
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
                const z = positions[i + 2];  // Z is the third component
                const normalizedHeight = (z - bounds.minZ) / (bounds.maxZ - bounds.minZ);
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

    // Remove the effect that was syncing with pointSize control
    // since we're now managing point size directly
    useEffect(() => {
        setPointColor(useVertexColors ? null : color);
        setOpacity(pointOpacity);
        setSizeAttenuation(enableSizeAttenuation);
        if (cameraRef.current) {
            cameraRef.current.fov = cameraFOV;
            cameraRef.current.updateProjectionMatrix();
        }
    }, [useVertexColors, color, pointOpacity, enableSizeAttenuation, cameraFOV]);

    // Apply scale to PCD object
    useEffect(() => {
        if (pcdPoints) {
            pcdPoints.scale.set(scale, scale, scale);
        }
    }, [pcdPoints, scale]);

    // Add state to track last camera position for detecting changes
    const lastCameraState = useRef({
        position: new THREE.Vector3(),
        zoom: 0,
        rotation: new THREE.Euler()
    });

    // Add debounced logging function
    const debouncedLogCameraUpdate = useCallback(
        (() => {
            let timeout;
            return (changes) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    onLogActivity(`Camera ${changes.join(' and ')}`);
                }, 100); // 100ms debounce
            };
        })(),
        [onLogActivity]
    );

    // Add camera change handler
    const handleCameraChange = useCallback((e) => {
        if (!cameraRef.current) return;

        const changes = [];
        const currentPos = cameraRef.current.position;
        const lastPos = lastCameraState.current.position;
        const currentZoom = controlsRef.current.target.distanceTo(currentPos);
        const lastZoom = lastCameraState.current.zoom;
        const currentRotation = cameraRef.current.rotation;
        const lastRotation = lastCameraState.current.rotation;

        // Check for rotation (by comparing Euler angles)
        if (!currentRotation.equals(lastRotation)) {
            changes.push('rotated');
        }

        // Check for zoom
        if (Math.abs(currentZoom - lastZoom) > 0.1) {
            changes.push(currentZoom > lastZoom ? 'zoomed out' : 'zoomed in');
        }

        // Check for pan (position changed but rotation didn't)
        if (!currentPos.equals(lastPos) && currentRotation.equals(lastRotation)) {
            changes.push('panned');
        }

        if (changes.length > 0) {
            debouncedLogCameraUpdate(changes);
        }

        // Update last state
        lastCameraState.current = {
            position: currentPos.clone(),
            zoom: currentZoom,
            rotation: currentRotation.clone()
        };
    }, [debouncedLogCameraUpdate]);

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
                    pointColor={color}
                    opacity={opacity}
                    sizeAttenuation={sizeAttenuation}
                    scale={scale}
                    useVertexColors={useVertexColors}
                />
            );
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', background: backgroundColor, position: 'relative' }}>
            <Canvas
                camera={{ position: cameraPosition, fov: cameraFOV, up: [0, 0, 1] }}
                gl={{ antialias: true, preserveDrawingBuffer: true }}
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
                    up={[0, 0, 1]} // Set Z as up
                />
                <OrbitControls
                    ref={controlsRef}
                    enableDamping
                    dampingFactor={0.05}
                    rotateSpeed={0.5}
                    zoomSpeed={0.8}
                    panSpeed={0.5}
                    target={[0, 0, 0]}
                    onChange={handleCameraChange}
                    up={[0, 0, 1]} // Set Z as up
                />
                <ambientLight intensity={0.8} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                {renderPointCloud()}
                <axesHelper args={[50]} position={[0, 0, 0]} />
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
    }),
    onLogActivity: PropTypes.func.isRequired
};

export default ThreeDViewer;
