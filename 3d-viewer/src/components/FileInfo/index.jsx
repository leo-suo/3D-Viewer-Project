import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Paper } from '@mui/material';
import { formatFileSize } from '../../utils/formatters';

function FileInfo({ fileData }) {
    if (!fileData) return null;

    const { file, pointCloud } = fileData;
    const isPointCloud = pointCloud?.xyz || pointCloud?.pcd;
    const bounds = pointCloud?.bounds;

    return (
        <Paper 
            elevation={2}
            sx={{
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 1
            }}
        >
            <Typography variant="h6" gutterBottom>
                File Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    Name: {file.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Size: {formatFileSize(file.size)}
                </Typography>
                {isPointCloud && pointCloud.numPoints > 0 && (
                    <Typography variant="body2" color="text.secondary">
                        Points: {pointCloud.numPoints.toLocaleString()}
                    </Typography>
                )}
            </Box>

            {bounds && (
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Bounds:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        X: {bounds.minX.toFixed(2)} to {bounds.maxX.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Y: {bounds.minY.toFixed(2)} to {bounds.maxY.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Z: {bounds.minZ.toFixed(2)} to {bounds.maxZ.toFixed(2)}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
}

FileInfo.propTypes = {
    fileData: PropTypes.shape({
        file: PropTypes.shape({
            name: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired
        }).isRequired,
        pointCloud: PropTypes.shape({
            pcd: PropTypes.any,
            xyz: PropTypes.array,
            bounds: PropTypes.shape({
                minX: PropTypes.number,
                maxX: PropTypes.number,
                minY: PropTypes.number,
                maxY: PropTypes.number,
                minZ: PropTypes.number,
                maxZ: PropTypes.number
            }),
            numPoints: PropTypes.number
        }),
        geoJson: PropTypes.any
    })
};

export default FileInfo; 