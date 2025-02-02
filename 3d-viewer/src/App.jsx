import React, { useState, useCallback } from 'react'
import DashboardLayout from './components/Dashboard'
import './styles/global.css'

function App() {
    const [pointCloudData, setPointCloudData] = useState(null);
    const [userLogs, setUserLogs] = useState([]);

    const handleFileUpload = (fileData) => {
        setPointCloudData(fileData);
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        setUserLogs(prev => [...prev, `[${timestamp}] Uploaded "${fileData.file.name}" (${(fileData.file.size / 1024).toFixed(2)} KB)`]);
    };

    const handleLogActivity = useCallback((message) => {
        setUserLogs(prevLogs => {
            const timestamp = new Date().toLocaleTimeString();
            return [`[${timestamp}] ${message}`, ...prevLogs].slice(0, 100); // Keep last 100 logs
        });
    }, []);

    return (
        <DashboardLayout
            pointCloudData={pointCloudData}
            userLogs={userLogs}
            onFileUpload={handleFileUpload}
            onLogActivity={handleLogActivity}
        />
    );
}

export default App;
