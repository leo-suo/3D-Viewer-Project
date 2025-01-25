import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import { Box, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import './styles.css';

function FileUploader({ onFileUpload }) {
    const parsePCDFile = async (text) => {
        const lines = text.trim().split('\n');
        let headerLength = 0;
        let pointDataStart = false;
        let format = 'ascii'; // default format
        const points = [];

        // Parse header
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            headerLength++;

            if (line.startsWith('FORMAT')) {
                format = line.split(/\s+/)[1];
            }

            if (line === 'DATA ascii') {
                pointDataStart = true;
                break;
            }
        }

        if (!pointDataStart) {
            throw new Error('Unsupported PCD format. Only ASCII format is supported.');
        }

        // Parse point data
        for (let i = headerLength; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            const [x, y, z] = line.split(/\s+/).map(Number);
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                points.push({ x, y, z });
            }
        }

        return points;
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        try {
            const text = await file.text();
            let Data;

            if (file.name.endsWith('.json')) {
                Data = JSON.parse(text);
            } else if (file.name.endsWith('.xyz') || file.name.endsWith('.txt')) {
                Data = text.trim().split('\n').map(line => {
                    const [x, y, z] = line.trim().split(/\s+/).map(Number);
                    return { x, y, z };
                });
            } else if (file.name.endsWith('.pcd')) {
                Data = await parsePCDFile(text);
            } else if (file.name.endsWith('.geojson')) {
                Data = JSON.parse(text);
            }

            if (Data && Data.length > 0) {
                console.log(`Loaded ${Data.length} points from ${file.name}`);
                onFileUpload({
                    file: {
                        name: file.name,
                        size: file.size
                    },
                    pointCloud: Data
                });
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
            <input {...getInputProps()} />
            <CloudUploadIcon 
                sx={{ 
                    fontSize: { xs: 24, sm: 28 },
                    color: isDragActive ? 'primary.main' : 'text.secondary',
                    mr: 1.5,
                    flexShrink: 0
                }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                    variant="body2"
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
