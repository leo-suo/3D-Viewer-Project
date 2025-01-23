import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import ThreeDViewer from './components/3DViewer.jsx';
import FileUploader from './components/FileUploader.jsx';
import './App.css'

function App() {
    const [pointCloudData, setPointCloudData] = useState([]);

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* FileUploader Component */}
            <FileUploader onFileUpload={setPointCloudData} />

            {/* 3D Viewer Component */}
            <div style={{ flex: 1 }}>
                <ThreeDViewer pointCloudData={pointCloudData} />
            </div>
        </div>
    );
}

export default App;
