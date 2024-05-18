import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './App.css';

// Register Chart.js components
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function calculateCorrelation(data1, data2) {
  let sumXY = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXSquare = 0;
  let sumYSquare = 0;

  const n = data1.length;

  for (let i = 0; i < n; i++) {
    sumXY += data1[i].y * data2[i].y;
    sumX += data1[i].y;
    sumY += data2[i].y;
    sumXSquare += Math.pow(data1[i].y, 2);
    sumYSquare += Math.pow(data2[i].y, 2);
  }

  const correlation =
    (n * sumXY - sumX * sumY) /
    Math.sqrt((n * sumXSquare - Math.pow(sumX, 2)) * (n * sumYSquare - Math.pow(sumY, 2)));

  return correlation;
}

function calculateRiskLevel(sp02, bpm) {
  const bpmDiff = Math.abs(bpm - 80);
  const riskScore = (100 - sp02) + (bpmDiff / 40);

  if (riskScore < 6) {
    return 'Low Risk';
  } else if (riskScore >= 6 && riskScore <= 16) {
    return 'Moderate Risk';
  } else {
    return 'High Risk';
  }
}

function calculateMean(data) {
  const sum = data.reduce((acc, item) => acc + item.y, 0);
  return sum / data.length;
}

function calculateMedian(data) {
  // Check if data is empty or null
  if (!data || data.length === 0) {
    return 0; // Or handle the case appropriately
  }

  const sorted = [...data].sort((a, b) => a.y - b.y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid].y : (sorted[mid - 1].y + sorted[mid].y) / 2;
}


function calculateStandardDeviation(data) {
  const mean = calculateMean(data);
  const variance = data.reduce((acc, item) => acc + Math.pow(item.y - mean, 2), 0) / data.length;
  return Math.sqrt(variance);
}

function App() {
  const [bpmData, setBpmData] = useState([]);
  const [sp02Data, setSp02Data] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [latestReading, setLatestReading] = useState(null);
  const [riskLevel, setRiskLevel] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'sensor_readings'), orderBy('reading_num', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newBpmData = [];
      const newSp02Data = [];
      let latest = null;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.bpm !== 0 && data.sp02 !== 0 && 
          data.bpm >= 20 && data.bpm <= 140 && 
          data.sp02 >= 60 && data.sp02 <= 100) {
                newBpmData.push({ x: data.reading_num, y: data.bpm });
                newSp02Data.push({ x: data.reading_num, y: data.sp02 });
      }else {
          deleteDoc(doc.ref);
        }
        if (!latest || data.reading_num > latest.reading_num) {
          latest = data;
        }
      });

      // Reverse data to maintain ascending order by reading_num
      newBpmData.reverse();
      newSp02Data.reverse();

      setBpmData(newBpmData);
      setSp02Data(newSp02Data);
      setLatestReading(latest);

      if (latest) {
        const { sp02, bpm } = latest;
        const risk = calculateRiskLevel(sp02, bpm);
        setRiskLevel(risk);
      }

      // Calculate correlation between BPM and SpO2 data
      const correlationValue = calculateCorrelation(newBpmData, newSp02Data);
      setCorrelation(correlationValue);
    });

    return () => unsubscribe();
  }, []);

  const bpmChartData = {
    datasets: [
      {
        label: 'BPM',
        data: bpmData,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        fill: true,
      },
    ],
    labels: bpmData.map((item) => item.x),
  };

  const sp02ChartData = {
    datasets: [
      {
        label: 'SpO2',
        data: sp02Data,
        borderColor: 'rgba(153,102,255,1)',
        backgroundColor: 'rgba(153,102,255,0.2)',
        fill: true,
      },
    ],
    labels: sp02Data.map((item) => item.x),
  };

  const bpmBarChartData = {
    labels: bpmData.map((item) => item.x),
    datasets: [
      {
        label: 'BPM',
        data: bpmData.map((item) => item.y),
        backgroundColor: 'rgba(75,192,192,0.4)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1,
      },
    ],
  };

  const sp02BarChartData = {
    labels: sp02Data.map((item) => item.x),
    datasets: [
      {
        label: 'SpO2',
        data: sp02Data.map((item) => item.y),
        backgroundColor: 'rgba(153,102,255,0.4)',
        borderColor: 'rgba(153,102,255,1)',
        borderWidth: 1,
      },
    ],
  };

  const bpmVsSp02ScatterData = {
    datasets: [
      {
        label: 'BPM vs SpO2',
        data: bpmData.map((item, index) => ({ x: item.y, y: sp02Data[index].y })),
        backgroundColor: 'rgba(255,99,132,1)',
      },
    ],
  };

  const bpmMean = calculateMean(bpmData);
  const bpmMedian = calculateMedian(bpmData);
  const bpmStdDev = calculateStandardDeviation(bpmData);
  const sp02Mean = calculateMean(sp02Data);
  const sp02Median = calculateMedian(sp02Data);
  const sp02StdDev = calculateStandardDeviation(sp02Data);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Hypoxemia Monitoring Dashboard</h1>
      </header>
      <div className="dashboard-content">
        <div className="risk-indicator">
          <h2>Risk Indicator</h2>
          {latestReading && (
            <div>
              <p>Timestamp: {latestReading.timestamp}</p>
              <p>BPM: {latestReading.bpm}</p>
              <p>SpO2: {latestReading.sp02}</p>
              <p>Risk Level: <span style={{ color: riskLevel === 'Low Risk' ? 'green' : riskLevel === 'Moderate Risk' ? 'orange' : 'red' }}>{riskLevel}</span></p>
            </div>
          )}
        </div>
        <div className="chart-container">
          <h2 className="chart-title">BPM Chart</h2>
          <Line className="line-chart" data={bpmChartData} />
          <Bar className="bar-chart" data={bpmBarChartData} />
        </div>
        <div className="chart-container">
          <h2 className="chart-title">SpO2 Chart</h2>
          <Line className="line-chart" data={sp02ChartData} />
          <Bar className="bar-chart" data={sp02BarChartData} />
        </div>
        <div className="chart-container">
          <h2 className="chart-title">BPM vs SpO2 Scatter Plot</h2>
          <Scatter className="scatter-chart" data={bpmVsSp02ScatterData} />
        </div>
        <div className="analytics-container">
          <h2 className="analytics-title">Analytics</h2>
          <p className="correlation-value">Correlation between BPM and SpO2: {correlation}</p>
          <div className="descriptive-stats">
            <h3>Descriptive Statistics</h3>
            <p>BPM Mean: {bpmMean}</p>
            <p>BPM Median: {bpmMedian}</p>
            <p>BPM Standard Deviation: {bpmStdDev}</p>
            <p>SpO2 Mean: {sp02Mean}</p>
            <p>SpO2 Median: {sp02Median}</p>
            <p>SpO2 Standard Deviation: {sp02StdDev}</p>
          </div>
        </div>
      </div>
      <footer className="dashboard-footer">
        <p>With ❤️ , Santhosh Sachin</p>
      </footer>
    </div>
  );
}

export default App;
