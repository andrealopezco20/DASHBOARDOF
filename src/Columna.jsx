import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './Columna.css';

const Columna = () => {
  const [data, setData] = useState([]);
  const [selectedColumn, setSelectedColumn] = useState('mag');
  const [yearFilter, setYearFilter] = useState('2023');
  const [stats, setStats] = useState(null);
  
  const histogramRef = useRef();
  const boxplotRef = useRef();
  const lineChartRef = useRef();
  const barChartRef = useRef();
  const pieChartRef = useRef();
  const scatterRef = useRef();

  // Columnas disponibles para análisis
  const columns = [
    { value: 'mag', label: 'Magnitud' },
    { value: 'depth', label: 'Profundidad' },
    { value: 'latitude', label: 'Latitud' },
    { value: 'longitude', label: 'Longitud' }
  ];

  // Categorías de magnitud
  const magCategories = {
    'Micro': d => d.mag < 2.0,
    'Menor': d => d.mag >= 2.0 && d.mag < 4.0,
    'Ligero': d => d.mag >= 4.0 && d.mag < 5.0,
    'Moderado': d => d.mag >= 5.0 && d.mag < 6.0,
    'Fuerte': d => d.mag >= 6.0 && d.mag < 7.0,
    'Mayor': d => d.mag >= 7.0 && d.mag < 8.0,
    'Gran terremoto': d => d.mag >= 8.0
  };

  // Categorías de profundidad
  const depthCategories = {
    'Superficial (<70 km)': d => d.depth < 70,
    'Intermedio (70-300 km)': d => d.depth >= 70 && d.depth < 300,
    'Profundo (>300 km)': d => d.depth >= 300
  };

  useEffect(() => {
    // Cargar datos
    d3.csv("/data/data.csv").then(rawData => {
      const parsed = rawData.map(d => ({
        ...d,
        year: new Date(d.time).getFullYear(),
        month: new Date(d.time).getMonth() + 1,
        day: new Date(d.time).getDate(),
        mag: +d.mag,
        depth: +d.depth,
        latitude: +d.latitude,
        longitude: +d.longitude,
        country: extractCountry(d.place)
      }));
      setData(parsed);
    });
  }, []);

  // Función para extraer el país del campo place
  const extractCountry = (place) => {
    if (!place) return 'Desconocido';
    const parts = place.split(',');
    return parts[parts.length - 1].trim();
  };

  useEffect(() => {
    if (!data.length) return;

    const filteredData = data.filter(d => d.year == yearFilter);
    const columnData = filteredData.map(d => d[selectedColumn]).filter(d => d !== undefined);

    // Calcular estadísticas básicas
    const columnStats = {
      mean: d3.mean(columnData)?.toFixed(2) || 'N/A',
      median: d3.median(columnData)?.toFixed(2) || 'N/A',
      min: d3.min(columnData)?.toFixed(2) || 'N/A',
      max: d3.max(columnData)?.toFixed(2) || 'N/A',
      stdDev: d3.deviation(columnData)?.toFixed(2) || 'N/A',
      count: columnData.length
    };
    setStats(columnStats);

    // Renderizar gráficos según la columna seleccionada
    switch(selectedColumn) {
      case 'mag':
        renderMagHistogram(filteredData);
        renderMagBoxplot(filteredData);
        renderMagPieChart(filteredData);
        break;
      case 'depth':
        renderDepthHistogram(filteredData);
        renderDepthBoxplot(filteredData);
        renderDepthPieChart(filteredData);
        break;
      case 'time':
        renderTimeLineChart(filteredData);
        break;
      case 'place':
        renderPlaceBarChart(filteredData);
        break;
      case 'latitude':
      case 'longitude':
        renderGeoScatterPlot(filteredData);
        break;
    }

  }, [data, selectedColumn, yearFilter]);

  // Funciones de renderizado para Magnitud
  const renderMagHistogram = (filteredData) => {
    const svg = d3.select(histogramRef.current);
    svg.selectAll("*").remove();

    const width = 500, height = 300, margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.mag)])
      .range([0, innerWidth])
      .nice();

    const bins = d3.bin().thresholds(20)(filteredData.map(d => d.mag));
    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([innerHeight, 0]);

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll("rect")
      .data(bins)
      .enter().append("rect")
      .attr("x", d => x(d.x0) + 1)
      .attr("y", d => y(d.length))
      .attr("width", d => x(d.x1) - x(d.x0) - 1)
      .attr("height", d => innerHeight - y(d.length))
      .attr("fill", "#4e79a7");

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .append("text")
      .attr("y", 30)
      .attr("x", innerWidth / 2)
      .attr("text-anchor", "middle")
      .text("Magnitud");

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -30)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("Frecuencia");
  };

  const renderMagBoxplot = (filteredData) => {
    const svg = d3.select(boxplotRef.current);
    svg.selectAll("*").remove();

    const width = 300, height = 300, margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerHeight = height - margin.top - margin.bottom;

    const magValues = filteredData.map(d => d.mag).sort(d3.ascending);
    const q1 = d3.quantile(magValues, 0.25);
    const median = d3.quantile(magValues, 0.5);
    const q3 = d3.quantile(magValues, 0.75);
    const iqr = q3 - q1;
    const min = d3.min(magValues);
    const max = d3.max(magValues);

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Dibujar la caja
    g.append("rect")
      .attr("x", 0)
      .attr("y", y(q3))
      .attr("width", 50)
      .attr("height", y(q1) - y(q3))
      .attr("fill", "#f28e2b");

    // Dibujar la mediana
    g.append("line")
      .attr("x1", 0)
      .attr("x2", 50)
      .attr("y1", y(median))
      .attr("y2", y(median))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Bigotes
    g.append("line")
      .attr("x1", 25)
      .attr("x2", 25)
      .attr("y1", y(min))
      .attr("y2", y(q1))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    g.append("line")
      .attr("x1", 25)
      .attr("x2", 25)
      .attr("y1", y(q3))
      .attr("y2", y(max))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    // Líneas horizontales en los bigotes
    g.append("line")
      .attr("x1", 0)
      .attr("x2", 50)
      .attr("y1", y(min))
      .attr("y2", y(min))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    g.append("line")
      .attr("x1", 0)
      .attr("x2", 50)
      .attr("y1", y(max))
      .attr("y2", y(max))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    function y(value) {
      return innerHeight * (1 - (value / max));
    }
  };

  const renderMagPieChart = (filteredData) => {
    const svg = d3.select(pieChartRef.current);
    svg.selectAll("*").remove();

    const width = 300, height = 300, radius = Math.min(width, height) / 2;
    
    const pieData = Object.entries(magCategories).map(([label, condition]) => ({
      label,
      value: filteredData.filter(condition).length
    })).filter(d => d.value > 0);

    const color = d3.scaleOrdinal()
      .domain(pieData.map(d => d.label))
      .range(d3.schemeTableau10);

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${width/2},${height/2})`);

    g.selectAll("path")
      .data(pie(pieData))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label))
      .attr("stroke", "#fff")
      .style("stroke-width", "1px");

    g.selectAll("text")
      .data(pie(pieData))
      .enter().append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .text(d => d.data.value > 0 ? `${d.data.label}: ${d.data.value}` : "");
  };

  // Funciones de renderizado para Profundidad
  const renderDepthHistogram = (filteredData) => {
    const svg = d3.select(histogramRef.current);
    svg.selectAll("*").remove();

    const width = 500, height = 300, margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain([0, d3.max(filteredData, d => d.depth)])
      .range([0, innerWidth])
      .nice();

    const bins = d3.bin().thresholds(20)(filteredData.map(d => d.depth));
    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([innerHeight, 0]);

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.selectAll("rect")
      .data(bins)
      .enter().append("rect")
      .attr("x", d => x(d.x0) + 1)
      .attr("y", d => y(d.length))
      .attr("width", d => x(d.x1) - x(d.x0) - 1)
      .attr("height", d => innerHeight - y(d.length))
      .attr("fill", "#59a14f");

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .append("text")
      .attr("y", 30)
      .attr("x", innerWidth / 2)
      .attr("text-anchor", "middle")
      .text("Profundidad (km)");

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -30)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("Frecuencia");
  };

  const renderDepthBoxplot = (filteredData) => {
    const svg = d3.select(boxplotRef.current);
    svg.selectAll("*").remove();

    const width = 300, height = 300, margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerHeight = height - margin.top - margin.bottom;

    const depthValues = filteredData.map(d => d.depth).sort(d3.ascending);
    const q1 = d3.quantile(depthValues, 0.25);
    const median = d3.quantile(depthValues, 0.5);
    const q3 = d3.quantile(depthValues, 0.75);
    const iqr = q3 - q1;
    const min = d3.min(depthValues);
    const max = d3.max(depthValues);

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Dibujar la caja
    g.append("rect")
      .attr("x", 0)
      .attr("y", y(q3))
      .attr("width", 50)
      .attr("height", y(q1) - y(q3))
      .attr("fill", "#e15759");

    // Dibujar la mediana
    g.append("line")
      .attr("x1", 0)
      .attr("x2", 50)
      .attr("y1", y(median))
      .attr("y2", y(median))
      .attr("stroke", "#000")
      .attr("stroke-width", 2);

    // Bigotes
    g.append("line")
      .attr("x1", 25)
      .attr("x2", 25)
      .attr("y1", y(min))
      .attr("y2", y(q1))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    g.append("line")
      .attr("x1", 25)
      .attr("x2", 25)
      .attr("y1", y(q3))
      .attr("y2", y(max))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    // Líneas horizontales en los bigotes
    g.append("line")
      .attr("x1", 0)
      .attr("x2", 50)
      .attr("y1", y(min))
      .attr("y2", y(min))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    g.append("line")
      .attr("x1", 0)
      .attr("x2", 50)
      .attr("y1", y(max))
      .attr("y2", y(max))
      .attr("stroke", "#000")
      .attr("stroke-width", 1);

    function y(value) {
      return innerHeight * (1 - (value / max));
    }
  };

  const renderDepthPieChart = (filteredData) => {
    const svg = d3.select(pieChartRef.current);
    svg.selectAll("*").remove();

    const width = 300, height = 300, radius = Math.min(width, height) / 2;
    
    const pieData = Object.entries(depthCategories).map(([label, condition]) => ({
      label,
      value: filteredData.filter(condition).length
    })).filter(d => d.value > 0);

    const color = d3.scaleOrdinal()
      .domain(pieData.map(d => d.label))
      .range(d3.schemePastel1);

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${width/2},${height/2})`);

    g.selectAll("path")
      .data(pie(pieData))
      .enter().append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label))
      .attr("stroke", "#fff")
      .style("stroke-width", "1px");

    g.selectAll("text")
      .data(pie(pieData))
      .enter().append("text")
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .attr("dy", "0.35em")
      .style("text-anchor", "middle")
      .style("font-size", "10px")
      .text(d => d.data.value > 0 ? `${d.data.label}: ${d.data.value}` : "");
  };

  // Funciones de renderizado para Fecha
  const renderTimeLineChart = (filteredData) => {
    const svg = d3.select(lineChartRef.current);
    svg.selectAll("*").remove();

    const width = 800, height = 400, margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Agrupar por mes
    const monthCounts = d3.rollup(
      filteredData,
      v => v.length,
      d => d.month
    );
    
    const lineData = Array.from(monthCounts, ([month, count]) => ({
      month,
      count
    })).sort((a, b) => a.month - b.month);

    const x = d3.scaleBand()
      .domain(lineData.map(d => d.month))
      .range([0, innerWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(lineData, d => d.count)])
      .range([innerHeight, 0])
      .nice();

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Barras
    g.selectAll("rect")
      .data(lineData)
      .enter().append("rect")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.count))
      .attr("width", x.bandwidth())
      .attr("height", d => innerHeight - y(d.count))
      .attr("fill", "#76b7b2");

    // Ejes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat(d => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        return monthNames[d - 1];
      }))
      .append("text")
      .attr("y", 30)
      .attr("x", innerWidth / 2)
      .attr("text-anchor", "middle")
      .text("Mes");

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -30)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("Número de sismos");
  };

  // Funciones de renderizado para Ubicación
  const renderPlaceBarChart = (filteredData) => {
    const svg = d3.select(barChartRef.current);
    svg.selectAll("*").remove();

    const width = 800, height = 500, margin = { top: 20, right: 20, bottom: 40, left: 150 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Contar sismos por país
    const countryCounts = d3.rollup(
      filteredData,
      v => v.length,
      d => d.country || 'Desconocido'
    );

    // Ordenar y tomar los top 10
    const barData = Array.from(countryCounts, ([country, count]) => ({
      country,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

    const y = d3.scaleBand()
      .domain(barData.map(d => d.country))
      .range([0, innerHeight])
      .padding(0.1);

    const x = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.count)])
      .range([0, innerWidth])
      .nice();

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Barras
    g.selectAll("rect")
      .data(barData)
      .enter().append("rect")
      .attr("y", d => y(d.country))
      .attr("x", 0)
      .attr("width", d => x(d.count))
      .attr("height", y.bandwidth())
      .attr("fill", "#edc948");

    // Texto en barras
    g.selectAll("text")
      .data(barData)
      .enter().append("text")
      .attr("y", d => y(d.country) + y.bandwidth() / 2)
      .attr("x", d => x(d.count) + 5)
      .attr("dy", "0.35em")
      .text(d => d.count)
      .style("font-size", "12px");

    // Ejes
    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -140)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("País");

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .append("text")
      .attr("y", 30)
      .attr("x", innerWidth / 2)
      .attr("text-anchor", "middle")
      .text("Número de sismos");
  };

  // Funciones de renderizado para Latitud/Longitud
  const renderGeoScatterPlot = (filteredData) => {
    const svg = d3.select(scatterRef.current);
    svg.selectAll("*").remove();

    const width = 800, height = 500, margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.longitude))
      .range([0, innerWidth])
      .nice();

    const y = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.latitude))
      .range([innerHeight, 0])
      .nice();

    const color = d3.scaleSequential(d3.interpolatePlasma)
      .domain(d3.extent(filteredData, d => d.depth));

    const g = svg.attr("width", width).attr("height", height)
      .append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // Puntos
    g.selectAll("circle")
      .data(filteredData)
      .enter().append("circle")
      .attr("cx", d => x(d.longitude))
      .attr("cy", d => y(d.latitude))
      .attr("r", 3)
      .attr("fill", d => color(d.depth))
      .attr("opacity", 0.7);

    // Ejes
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .append("text")
      .attr("y", 30)
      .attr("x", innerWidth / 2)
      .attr("text-anchor", "middle")
      .text("Longitud");

    g.append("g")
      .call(d3.axisLeft(y))
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -30)
      .attr("x", -innerHeight / 2)
      .attr("text-anchor", "middle")
      .text("Latitud");

    // Leyenda de profundidad
    const legend = g.append("g")
      .attr("transform", `translate(${innerWidth - 100},20)`);

    const legendScale = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.depth))
      .range([0, 80]);

    legend.append("g")
      .call(d3.axisRight(legendScale))
      .attr("transform", "translate(20,0)");

    legend.selectAll("rect")
      .data(d3.range(0, 80, 2))
      .enter().append("rect")
      .attr("x", 20)
      .attr("y", d => 80 - d)
      .attr("width", 20)
      .attr("height", 2)
      .attr("fill", d => color(legendScale.invert(d)));

    legend.append("text")
      .attr("x", 10)
      .attr("y", 40)
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90,10,40)")
      .text("Profundidad (km)");
  };

  const years = Array.from(new Set(data.map(d => d.year))).sort();

  return (
    <div className="column-analysis-container">
      <div className="controls">
        <div className="control-group">
          <label>Columna a analizar:</label>
          <select 
            value={selectedColumn} 
            onChange={(e) => setSelectedColumn(e.target.value)}
          >
            {columns.map(col => (
              <option key={col.value} value={col.value}>{col.label}</option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label>Año:</label>
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <div className="stats-summary">
          <h3>Estadísticas de {columns.find(c => c.value === selectedColumn)?.label}</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Media:</span>
              <span className="stat-value">{stats.mean}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mediana:</span>
              <span className="stat-value">{stats.median}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Mínimo:</span>
              <span className="stat-value">{stats.min}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Máximo:</span>
              <span className="stat-value">{stats.max}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Desv. Estándar:</span>
              <span className="stat-value">{stats.stdDev}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{stats.count}</span>
            </div>
          </div>
        </div>
      )}

      <div className="charts-container">
        {selectedColumn === 'mag' && (
          <>
            <div className="chart-card">
              <h4>Distribución de Magnitudes</h4>
              <svg ref={histogramRef}></svg>
            </div>
            <div className="chart-card">
              <h4>Boxplot de Magnitudes</h4>
              <svg ref={boxplotRef}></svg>
            </div>
            <div className="chart-card">
              <h4>Categorías de Magnitud</h4>
              <svg ref={pieChartRef}></svg>
            </div>
          </>
        )}

        {selectedColumn === 'depth' && (
          <>
            <div className="chart-card">
              <h4>Distribución de Profundidades</h4>
              <svg ref={histogramRef}></svg>
            </div>
            <div className="chart-card">
              <h4>Boxplot de Profundidades</h4>
              <svg ref={boxplotRef}></svg>
            </div>
            <div className="chart-card">
              <h4>Categorías de Profundidad</h4>
              <svg ref={pieChartRef}></svg>
            </div>
          </>
        )}

        {selectedColumn === 'time' && (
          <div className="chart-card wide">
            <h4>Sismos por Mes</h4>
            <svg ref={lineChartRef}></svg>
          </div>
        )}

        {selectedColumn === 'place' && (
          <div className="chart-card wide">
            <h4>Top 10 Ubicaciones</h4>
            <svg ref={barChartRef}></svg>
          </div>
        )}

        {(selectedColumn === 'latitude' || selectedColumn === 'longitude') && (
          <div className="chart-card wide">
            <h4>Distribución Geográfica</h4>
            <svg ref={scatterRef}></svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default Columna;