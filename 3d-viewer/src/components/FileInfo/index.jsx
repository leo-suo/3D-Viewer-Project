import PropTypes from 'prop-types';
import { Card, Box, Typography } from '@mui/material';

function FileInfo({ fileData }) {
    if (!fileData) return null;

    const { file, pointCloud, geoJson } = fileData;
    /*
    const bounds = calculateBounds(pointCloud);
    */
    
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDimension = (value) => value.toFixed(2);

    /*
    const dimensions = {
        x: formatDimension(bounds.maxX - bounds.minX),
        y: formatDimension(bounds.maxY - bounds.minY),
        z: formatDimension(bounds.maxZ - bounds.minZ)
    };
    */

    return (
        <Card sx={{ p: 2 }}>
            <Box sx={{ fontFamily: 'monospace' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    Filename:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl: 3 }}>
                    {file.name}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                    File size:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl: 3 }}>
                    {formatFileSize(file.size)}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                    Points:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl: 3 }}>
                    {file.points}
                </Typography>
            </Box>
        </Card>
    );
}

/*
function calculateBounds(points) {
    if (!points || points.length === 0) {
        return {
            minX: 0, maxX: 0,
            minY: 0, maxY: 0,
            minZ: 0, maxZ: 0
        };
    }

    return points.reduce((bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        maxX: Math.max(bounds.maxX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxY: Math.max(bounds.maxY, point.y),
        minZ: Math.min(bounds.minZ, point.z),
        maxZ: Math.max(bounds.maxZ, point.z)
    }), {
        minX: Infinity, maxX: -Infinity,
        minY: Infinity, maxY: -Infinity,
        minZ: Infinity, maxZ: -Infinity
    });
}
    */

FileInfo.propTypes = {
    fileData: PropTypes.shape({
        file: PropTypes.shape({
            name: PropTypes.string.isRequired,
            size: PropTypes.number.isRequired,
            points: PropTypes.number.isRequired
        }).isRequired,
        pointCloud: PropTypes.shape({
            pcd: PropTypes.string.isRequired,
            xyz: PropTypes.array.isRequired
        }).isRequired,
        geoJson: PropTypes.object
    }).isRequired
};

export default FileInfo; 