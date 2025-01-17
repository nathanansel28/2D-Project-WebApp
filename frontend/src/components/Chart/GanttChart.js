import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import TimelinesChart from 'timelines-chart';
import './GanttChart.css';

const GanttChart = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState(null);
  const dataUrl = 'http://127.0.0.1:8000/static/files/scheduled.csv';
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const fetchData = async (url) => {
    try {
      const response = await axios.get(url, {
        responseType: 'blob',
      });
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const startDate = new Date('2024-01-01').getTime(); // Start date as January 1, 2024
            console.log('Start Date:', new Date(startDate));
            const groupedData = results.data.reduce((acc, row) => {
              const group = `${row.WorkCenter} ${row.Machine} (${row.MachineIdx})`;
              if (!acc[group]) {
                acc[group] = [];
              }
              const startTime = new Date(startDate + (row.Start * 24 * 60 * 60 * 1000));
              const endTime = new Date(startDate + (row.End * 24 * 60 * 60 * 1000));
              console.log(`Operation: ${row.Operation}, Start: ${startTime}, End: ${endTime}`);
  
              acc[group].push({
                label: row.Operation,
                data: [
                  {
                    timeRange: [startTime, endTime],
                    val: row.PercentCompletion,
                  },
                ],
              });
              return acc;
            }, {});
  
            const formattedChartData = Object.keys(groupedData).map((group) => ({
              group,
              data: groupedData[group],
            }));
  
            setChartData(formattedChartData);
            localStorage.setItem('chartData', JSON.stringify(formattedChartData));
            setLoading(false);
          },
          error: () => {
            setError('Error parsing CSV file.');
            setLoading(false);
          },
        });
      };
      reader.readAsText(response.data);
    } catch {
      setError('Error fetching CSV file.');
      setLoading(false);
    }
  };
  

  useEffect(() => {
    const storedChartData = localStorage.getItem('chartData');
    const fetchCsv = async () => {
      await fetchData(dataUrl);
    };

    if (storedChartData) {
      setChartData(JSON.parse(storedChartData));
      setLoading(false);
    } else {
      fetchCsv();
    }

    // Poll for changes to the CSV file
    const intervalId = setInterval(fetchCsv, 10000); // Fetch new data every 5 minutes (300,000 milliseconds)

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [dataUrl]);

  useEffect(() => {
    if (chartData && chartRef.current) {
      if (!chartInstanceRef.current) {
        chartInstanceRef.current = TimelinesChart()(chartRef.current)
          .zScaleLabel('Percent Completion')
          .width(1000)
          .zQualitative(true);
      }
      chartInstanceRef.current.data(chartData);
    }
  }, [chartData]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: 'purple' }}>{error}</div>;
  }

  return (
    <div className="gantt-chart-container">
      <header>
        <h1><strong>Gantt Chart</strong></h1>
      </header>
      <div ref={chartRef} style={{ width: '100%', height: '500px' }}></div>
    </div>
  );
};

export default GanttChart;
