import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import './styles.css';
import { useState } from 'react';

function FileUploader({ onFileUpload }) {
    const [numberOfPoints, setNumberOfPoints] = useState(0);

    const calculateBoundingBox = async (fileUrl) => {
        const response = await fetch(fileUrl);
        const text = await response.text();
        const lines = text.trim().split('\n');
        let numOfPoints = 0;

        // Parse point data
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            if (line.startsWith('POINTS')) {
                console.log(parseInt(line.split(' ')[1]))
                numOfPoints = parseInt(line.split(' ')[1]);
                break;
            }
            /*
            const [x, y, z] = line.split(/\s+/).map(Number);
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                points.push({ x, y, z });
            }
                */
        }
        return numOfPoints
        /*
        // Calculate bounding box
        const minX = Math.min(...points.map(p => p.x));
        const maxX = Math.max(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxY = Math.max(...points.map(p => p.y));
        const minZ = Math.min(...points.map(p => p.z));
        const maxZ = Math.max(...points.map(p => p.z));

        return {
            width: maxX - minX,
            height: maxY - minY,
            depth: maxZ - minZ,
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
            numberOfPoints: points.length
        }*/;
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            let Data;
            let numOfPoints = 0;

            if (file.name.endsWith('.json')) {
                const text = await file.text();
                Data = JSON.parse(text);
            } else if (file.name.endsWith('.xyz') || file.name.endsWith('.txt')) {
                const text = await file.text();
                Data = text.trim().split('\n').filter(line => {
                    return !line.trim().startsWith('#') && line.trim().length > 0;
                }).map(line => {
                    const [x, y, z] = line.trim().split(/\s+/).map(Number);
                    return { x, y, z };
                });
            } else if (file.name.endsWith('.pcd')) {
                const fileUrl = URL.createObjectURL(file);
                Data = fileUrl; // Store the URL instead of parsed data
                numOfPoints = await calculateBoundingBox(fileUrl);
            } else if (file.name.endsWith('.geojson')) {
                const text = await file.text();
                Data = JSON.parse(text);
            }

            if (Data) {
                console.log(`Loaded data from ${file.name}`);
                const fileData = {
                    file: {
                        name: file.name,
                        size: file.size,
                        points: numOfPoints
                    },
                    pointCloud: {
                        pcd: file.name.endsWith('.pcd') ? Data : '', // Use the file URL for PCD
                        xyz: file.name.endsWith('.xyz') ? Data : []
                    },
                    geoJson: file.name.endsWith('.geojson') ? Data : null
                };
                console.log('Sending fileData:', fileData);
                onFileUpload(fileData);
            } else {
                throw new Error('No valid point cloud data found in file.');
            }
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please ensure it\'s a valid point cloud file.');
        }
    }, [onFileUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.json', '.geojson'],
            'text/plain': ['.xyz', '.txt', '.pcd']
        },
        multiple: false
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
    onFileUpload: PropTypes.func.isRequired
};

export default FileUploader;
