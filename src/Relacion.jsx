import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import './Relaciones.css';

const Relaciones = () => {
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const [data, setData] = useState([]);
  const [activeCharts, setActiveCharts] = useState([]);
  const [analysisText, setAnalysisText] = useState('');
  const [yearFilter, setYearFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/data.csv');
        const csvText = await response.text();
        const parsedData = d3.csvParse(csvText);
        setData(parsedData);
      } catch (error) {
        console.error("Error al cargar el CSV:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0 && activeCharts.length > 0) {
      const filteredData = yearFilter === 'all' ? data : data.filter(d => new Date(d.time).getFullYear() == yearFilter);

      activeCharts.forEach((chart, index) => {
        const ref = index === 0 ? chartRef1 : chartRef2;
        d3.select(ref.current).selectAll("*").remove();

        switch (chart) {
          case 'scatterPlot':
            createScatterPlot(filteredData, ref);
            break;
          case 'lineChart':
            createLineChart(filteredData, ref);
            break;
          case 'stackedBarChart':
            createStackedBarChart(filteredData, ref);
            break;
          case 'trendLine':
            createTrendLine(filteredData, ref);
            break;
          case 'areaChart':
            createAreaChart(filteredData, ref);
            break;
          case 'heatmap':
            createHeatmap(filteredData, ref);
            break;
          default:
            break;
        }
      });
    }
  }, [data, activeCharts, yearFilter]);

  const createScatterPlot = (filteredData, ref) => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => +d.depth))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => +d.mag))
      .range([height, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));

    svg.selectAll("circle")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("cx", d => x(+d.depth))
      .attr("cy", d => y(+d.mag))
      .attr("r", 3)
      .attr("fill", d => d.type === 'natural' ? 'blue' : 'red');
  };

  const createLineChart = (filteredData, ref) => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const parseTime = d3.timeParse("%Y-%m-%d %H:%M:%S");
    const timeData = filteredData.map(d => ({ ...d, time: parseTime(d.time) }));

    const x = d3.scaleTime()
      .domain(d3.extent(timeData, d => d.time))
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(timeData, d => +d.mag))
      .range([height, 0]);

    const line = d3.line()
      .x(d => x(d.time))
      .y(d => y(+d.mag));

    svg.append("path")
      .datum(timeData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));
  };

  const createHeatmap = (filteredData, ref) => {
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };
    const width = 400 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const depthBins = d3.bin().thresholds(10)(filteredData.map(d => +d.depth));
    const magBins = d3.bin().thresholds(10)(filteredData.map(d => +d.mag));

    const x = d3.scaleBand()
      .domain(depthBins.map(d => d.x0))
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(magBins.map(d => d.x0))
      .range([height, 0])
      .padding(0.05);

    const colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(filteredData, d => +d.mag)]);

    // Helper function to count data points in a bin
    function countInBin(data, depthBin, magBin) {
      return data.filter(dataPoint =>
        +dataPoint.depth >= depthBin.x0 &&
        +dataPoint.depth < depthBin.x1 &&
        +dataPoint.mag >= magBin.x0 &&
        +dataPoint.mag < magBin.x1
      ).length;
    }

    svg.append("g")
      .selectAll("rect")
      .data(depthBins)
      .enter()
      .append("g")
      .selectAll("rect")
      .data(d => magBins.map(magBin => ({
        depth: d.x0,
        mag: magBin.x0,
        count: countInBin(filteredData, d, magBin)
      })))
      .enter()
      .append("rect")
      .attr("x", d => x(d.depth))
      .attr("y", d => y(d.mag))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => colorScale(d.count));

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));
  };

  const years = [...new Set(data.map(d => new Date(d.time).getFullYear()))].sort((a, b) => a - b);

  return (
    <div className="relaciones-container">
      <h2>Relaciones</h2>
      <div className="controls">
        <div className="control-group">
          <label htmlFor="year-select">Año:</label>
          <select id="year-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">Todos</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="control-group">
          <button onClick={() => setActiveCharts(['scatterPlot', 'heatmap'])}>Magnitud vs Profundidad y Heatmap</button>
        </div>
        <div className="control-group">
          <button onClick={() => setActiveCharts(['lineChart', 'trendLine'])}>Línea y Tendencia</button>
        </div>
      </div>
      <div className="analysis-text">
        {analysisText && <p>{analysisText}</p>}
      </div>
      <div className="charts-container">
        <div className="chart-card" ref={chartRef1}></div>
        <div className="chart-card" ref={chartRef2}></div>
      </div>
    </div>
  );
};

export default Relaciones;
