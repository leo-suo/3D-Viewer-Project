import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, FormControlLabel, Switch, Grid } from '@mui/material';
import FileUploader from '../FileUploader';
import ThreeDViewer from '../ThreeDViewer';
import MapViewer from '../MapViewer';
import FileInfo from '../FileInfo';
import ActivityLogs from '../ActivityLogs';
import './styles.css';

function DashboardLayout({ userLogs, onFileUpload }) {
    const [viewMode, setViewMode] = useState('3D');
    const [fileData, setFileData] = useState(null);

    const onFileLoad = (data) => {
        console.log('File loaded:', data);
        setFileData(data);
        
        // Automatically switch view mode based on file type
        const fileExtension = data.file.name.split('.').pop().toLowerCase();
        if (fileExtension === 'geojson') {
            setViewMode('2D');
        } else if (['xyz', 'pcd'].includes(fileExtension)) {
            setViewMode('3D');
        }
        
        // Call the parent's onFileUpload if it exists
        if (onFileUpload) {
            onFileUpload(data);
        }
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
                    <FileUploader onFileLoad={onFileLoad} />
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
                                onChange={(event) => setViewMode(event.target.checked ? '2D' : '3D')}
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
                        <Typography 
                            className="dashboard__file-info-title"
                            variant="subtitle2" 
                            sx={{ 
                                mb: 1,
                                color: 'text.secondary',
                                fontSize: { xs: '0.7rem', md: '0.8rem' }
                            }}
                        >
                            File Information
                        </Typography>
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
                            />
                        ) : (
                            <MapViewer 
                                key="2d" 
                                geoData={fileData?.geoJson}
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
    onFileUpload: PropTypes.func.isRequired
};

export default DashboardLayout;