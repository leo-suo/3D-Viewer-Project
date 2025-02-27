import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, FormControlLabel, Switch, Grid } from '@mui/material';
import FileUploader from '../FileUploader';
import ThreeDViewer from '../ThreeDViewer';
import MapViewer from '../MapViewer';
import FileInfo from '../FileInfo';
import ActivityLogs from '../ActivityLogs';
import './styles.css';

function DashboardLayout({ userLogs, onFileUpload, onLogActivity }) {
    const [viewMode, setViewMode] = useState('3D');
    const [fileData, setFileData] = useState(null);

    const onFileLoad = (data) => {
        try {
            setFileData(data);
            
            // Log file upload
            onLogActivity(`File uploaded: ${data.file.name} (${(data.file.size / 1024).toFixed(2)} KB)`);
            if (data.pointCloud?.numPoints) {
                onLogActivity(`Points loaded: ${data.pointCloud.numPoints.toLocaleString()}`);
            }
            
            // Automatically switch view mode based on file type
            const fileExtension = data.file.name.split('.').pop().toLowerCase();
            if (fileExtension === 'geojson' || fileExtension === 'json') {
                setViewMode('2D');
                onLogActivity('Automatically switched to 2D view for GeoJSON file');
            } else if (['xyz', 'pcd'].includes(fileExtension)) {
                setViewMode('3D');
                onLogActivity('Automatically switched to 3D view for point cloud file');
            }
            
            if (onFileUpload) {
                onFileUpload(data);
            }
        } catch (error) {
            onLogActivity(`Error loading file: ${error.message}`);
        }
    };

    const handleViewModeChange = (event) => {
        const newMode = event.target.checked ? '2D' : '3D';
        setViewMode(newMode);
        onLogActivity(`View mode changed to ${newMode}`);
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                height: '100vh',
                overflow: 'hidden',
                bgcolor: 'background.default'
            }}
        >
            {/* Left Sidebar */}
            <Box
                sx={{
                    width: { xs: '100%', md: 220 },
                    bgcolor: 'background.paper',
                    p: { xs: 1, md: 2 },
                    display: 'flex',
                    flexDirection: { xs: 'row', md: 'column' },
                    gap: { xs: 1, md: 2 },
                    height: { xs: '10%', md: '100%' },
                    maxHeight: { xs: '10%', md: '100%' },
                    borderRight: { md: 1 },
                    borderBottom: { xs: 1, md: 0 },
                    borderColor: 'divider',
                    overflow: 'auto'
                }}
            >
                <Box 
                    className="dashboard__uploader-container"
                    sx={{ 
                        flexShrink: 0,
                        width: { xs: '50%', md: '100%' }
                    }}>
                    <FileUploader onFileLoad={onFileLoad} onLogActivity={onLogActivity} />
                </Box>
                
                {/* View Mode Switch */}
                <Box 
                    className="dashboard__view-switch"
                    sx={{ 
                        my: 2,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: { xs: '50%', md: '100%' }
                    }}>
                    <FormControlLabel
                        className="dashboard__view-switch-label"
                        control={
                            <Switch
                                checked={viewMode === '2D'}
                                onChange={handleViewModeChange}
                                color="primary"
                            />
                        }
                        label={
                            <Typography
                                className="dashboard__view-switch-label"
                                variant="body2" 
                                sx={{ 
                                    fontSize: { xs: '0.7rem', md: '0.8rem' },
                                    color: 'text.secondary'
                                }}
                            >
                                {viewMode === '3D' ? '3D View' : '2D Map'}
                            </Typography>
                        }
                    />
                </Box>
                
                {fileData && (
                    <Box className="dashboard__file-info-container"
                        sx={{ 
                            flex: 1,
                            overflow: 'auto',
                            width: { xs: '50%', md: '100%' }
                    }}>
                        <FileInfo fileData={fileData} />
                    </Box>
                )}
            </Box>

            {/* Main Content Area */}
            <Box
                className="dashboard__main"
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    height: { xs: '90%', md: '100%' },
                    overflow: 'hidden'
                }}
            >
                {/* Viewer */}
                <Box
                    className="dashboard__viewer-container"
                    sx={{
                        flex: 1,
                        p: { xs: 1, sm: 2 },
                        minHeight: 0
                    }}
                >
                    <Box
                        className="dashboard__viewer-box"
                        sx={{
                            height: '100%',
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            overflow: 'hidden',
                            boxShadow: 1,
                            transition: 'box-shadow 0.2s',
                            '&:hover': {
                                boxShadow: 3
                            }
                        }}
                    >
                        {viewMode === '3D' ? (
                            <ThreeDViewer 
                                key="3d" 
                                fileData={fileData}
                                onLogActivity={onLogActivity}
                            />
                        ) : (
                            <MapViewer 
                                key="2d" 
                                geoData={fileData?.geoJson || {
                                    type: 'FeatureCollection',
                                    features: []
                                }}
                                onLogActivity={onLogActivity}
                            />
                        )}
                    </Box>
                </Box>

                {/* Activity Logs */}
                <ActivityLogs logs={userLogs} />
            </Box>
        </Box>
    );
}

DashboardLayout.propTypes = {
    userLogs: PropTypes.arrayOf(PropTypes.string).isRequired,
    onFileUpload: PropTypes.func.isRequired,
    onLogActivity: PropTypes.func.isRequired
};

export default DashboardLayout;