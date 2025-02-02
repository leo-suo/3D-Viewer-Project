import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import './styles.css';
import { useState } from 'react';
import * as THREE from 'three';
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader';

function FileUploader({ onFileLoad }) {
    const [loading, setLoading] = useState(false);

    const calculateBounds = (points) => {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        // For XYZ array of point objects
        if (Array.isArray(points)) {
            points.forEach(point => {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
                minZ = Math.min(minZ, point.z);
                maxZ = Math.max(maxZ, point.z);
            });
        } 
        // For PCD buffer geometry
        else if (points instanceof THREE.BufferGeometry) {
            const positions = points.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                minX = Math.min(minX, positions[i]);
                maxX = Math.max(maxX, positions[i]);
                minY = Math.min(minY, positions[i + 1]);
                maxY = Math.max(maxY, positions[i + 1]);
                minZ = Math.min(minZ, positions[i + 2]);
                maxZ = Math.max(maxZ, positions[i + 2]);
            }
        }

        return {
            minX, maxX,
            minY, maxY,
            minZ, maxZ
        };
    };

    const processXYZFile = async (file) => {
        const text = await file.text();
        const lines = text.trim().split('\n');
        const points = [];
        
        for (const line of lines) {
            const [x, y, z] = line.trim().split(/\s+/).map(Number);
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                points.push({ x, y, z });
            }
        }

        const bounds = calculateBounds(points);
        
        return {
            data: points,
            bounds,
            numPoints: points.length
        };
    };

    const processPCDFile = async (file) => {
        return new Promise((resolve, reject) => {
            const loader = new PCDLoader();
            const url = URL.createObjectURL(file);

            loader.load(url, (pcd) => {
                const bounds = calculateBounds(pcd.geometry);
                const numPoints = pcd.geometry.attributes.position.count;

                resolve({
                    data: url,
                    bounds,
                    numPoints
                });
            }, undefined, (error) => {
                URL.revokeObjectURL(url);
                reject(error);
            });
        });
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        setLoading(true);
        const file = acceptedFiles[0];
        console.log(file.name);
        try {
            let pointCloudData = {
                pcd: null,
                xyz: null,
                bounds: null,
                numPoints: 0
            };

            if (file.name.toLowerCase().endsWith('.xyz')) {
                const result = await processXYZFile(file);
                pointCloudData = {
                    xyz: result.data,
                    pcd: null,
                    bounds: result.bounds,
                    numPoints: result.numPoints
                };
            } 
            else if (file.name.toLowerCase().endsWith('.pcd')) {
                const result = await processPCDFile(file);
                pointCloudData = {
                    pcd: result.data,
                    xyz: null,
                    bounds: result.bounds,
                    numPoints: result.numPoints
                };
            }

            const fileData = {
                file: {
                    name: file.name,
                    size: file.size
                },
                pointCloud: pointCloudData,
                geoJson: file.name.toLowerCase().endsWith('.geojson') || 
                        file.name.toLowerCase().endsWith('.json') ? 
                        JSON.parse(await file.text()) : null
            };

            onFileLoad(fileData);
        } catch (error) {
            console.error('Error processing file:', error);
        } finally {
            setLoading(false);
        }
    }, [onFileLoad]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.geojson'],
            'text/plain': ['.xyz'],
            'application/octet-stream': ['.pcd']
        }
    });

    return (
        <Box
            {...getRootProps()}
            className="file-uploader"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                p: 1.5,
                bgcolor: 'background.default',
                borderRadius: 1,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.lighter',
                }
            }}
        >
            <input {...getInputProps()} className="file-uploader__input" />
            <CloudUploadIcon 
                className="file-uploader__icon"
                sx={{ 
                    fontSize: { xs: 24, sm: 28 },
                    color: isDragActive ? 'primary.main' : 'text.secondary',
                    mr: 1.5,
                    flexShrink: 0
                }}
            />
            <Box className="file-uploader__content" sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                    variant="body2"
                    className="file-uploader__text"
                    sx={{
                        color: 'text.secondary',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    {isDragActive
                        ? 'Drop the file here...'
                        : 'Drag & drop a file, or click to upload'}
                </Typography>
            </Box>
        </Box>
    );
}

FileUploader.propTypes = {
    onFileLoad: PropTypes.func.isRequired
};

export default FileUploader;
