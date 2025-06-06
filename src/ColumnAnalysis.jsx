import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './ColumnAnalysis.css';

const ColumnAnalysis = ({ data }) => {
  const [selectedColumn, setSelectedColumn] = useState('mag');
  const svgRef1 = useRef();
  const svgRef2 = useRef();
  const svgRef3 = useRef();
  const svgRef4 = useRef();
  const svgRef5 = useRef();
  const svgRef6 = useRef();

  const margin = { top: 40, right: 30, bottom: 60, left: 60 };
  const width = 500 - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  useEffect(() => {
    if (!data || !selectedColumn) return;

    renderHistogram();
    renderStats();
    renderBoxplot();
    if (selectedColumn === 'mag') renderMagCategories();
    if (selectedColumn === 'dmin') renderDminHistogram();
    if (selectedColumn === 'rms') renderRmsHistogram();
  }, [data, selectedColumn]);

  const renderHistogram = () => {
    const svg = d3.select(svgRef1.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const values = data.map(d => +d[selectedColumn]).filter(d => !isNaN(d));
    if (values.length === 0) return;

    const x = d3.scaleLinear()
      .domain([d3.min(values), d3.max(values)])
      .range([0, width]);

    const bins = d3.histogram()
      .domain(x.domain())
      .thresholds(20)(values);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    svg.selectAll('*').remove();

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));

    svg.selectAll('rect')
      .data(bins)
      .enter()
      .append('rect')
      .attr('x', d => x(d.x0) + 1)
      .attr('y', d => y(d.length))
      .attr('width', d => x(d.x1) - x(d.x0) - 1)
      .attr('height', d => height - y(d.length))
      .attr('fill', 'steelblue');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(`Distribución de ${selectedColumn}`);
  };

  const renderStats = () => {
    const values = data.map(d => +d[selectedColumn]).filter(d => !isNaN(d));
    if (values.length === 0) return;

    const stats = {
      count: values.length,
      mean: d3.mean(values),
      median: d3.median(values),
      min: d3.min(values),
      max: d3.max(values),
      std: d3.deviation(values),
      q1: d3.quantile(values, 0.25),
      q3: d3.quantile(values, 0.75)
    };

    const svg = d3.select(svgRef2.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svg.selectAll('*').remove();

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(`Estadísticas de ${selectedColumn}`);

    const statsLines = [
      `Conteo: ${stats.count}`,
      `Media: ${stats.mean.toFixed(2)}`,
      `Mediana: ${stats.median.toFixed(2)}`,
      `Mínimo: ${stats.min.toFixed(2)}`,
      `Máximo: ${stats.max.toFixed(2)}`,
      `Q1: ${stats.q1.toFixed(2)}`,
      `Q3: ${stats.q3.toFixed(2)}`,
      `Desviación: ${stats.std.toFixed(2)}`
    ];

    statsLines.forEach((line, i) => {
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', 60 + i * 25)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text(line);
    });
  };

  const renderBoxplot = () => {
    const svg = d3.select(svgRef3.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const values = data.map(d => +d[selectedColumn]).filter(d => !isNaN(d)).sort(d3.ascending);

    if (values.length === 0) return;

    const summary = {
      min: d3.min(values),
      q1: d3.quantile(values, 0.25),
      median: d3.quantile(values, 0.5),
      q3: d3.quantile(values, 0.75),
      max: d3.max(values)
    };

    const x = d3.scaleLinear()
      .domain([summary.min * 0.9, summary.max * 1.1])
      .range([0, width]);

    const y = height / 2;

    svg.selectAll('*').remove();

    svg.append('g')
      .attr('transform', `translate(0,${y})`)
      .call(d3.axisBottom(x));

    svg.append('rect')
      .attr('x', x(summary.q1))
      .attr('y', y - 30)
      .attr('width', x(summary.q3) - x(summary.q1))
      .attr('height', 60)
      .attr('fill', 'steelblue')
      .attr('stroke', 'black');

    svg.append('line')
      .attr('x1', x(summary.median))
      .attr('x2', x(summary.median))
      .attr('y1', y - 30)
      .attr('y2', y + 30)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    svg.append('line')
      .attr('x1', x(summary.min))
      .attr('x2', x(summary.q1))
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    svg.append('line')
      .attr('x1', x(summary.q3))
      .attr('x2', x(summary.max))
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    svg.append('line')
      .attr('x1', x(summary.min))
      .attr('x2', x(summary.min))
      .attr('y1', y - 15)
      .attr('y2', y + 15)
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    svg.append('line')
      .attr('x1', x(summary.max))
      .attr('x2', x(summary.max))
      .attr('y1', y - 15)
      .attr('y2', y + 15)
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(`Boxplot de ${selectedColumn}`);
  };

  const renderMagCategories = () => {
    const categories = {
      Micro: { min: 0, max: 2.9 },
      Minor: { min: 3.0, max: 3.9 },
      Light: { min: 4.0, max: 4.9 },
      Moderate: { min: 5.0, max: 5.9 },
      Strong: { min: 6.0, max: 6.9 },
      Major: { min: 7.0, max: 7.9 },
      Great: { min: 8.0, max: Infinity }
    };

    const counts = {};
    Object.keys(categories).forEach(cat => {
      counts[cat] = data.filter(d => {
        const mag = +d.mag;
        return !isNaN(mag) &&
               mag >= categories[cat].min &&
               mag < categories[cat].max;
      }).length;
    });

    const svg = d3.select(svgRef4.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    svg.selectAll('*').remove();

    const x = d3.scaleBand()
      .domain(Object.keys(categories))
      .range([0, width])
      .padding(0.2);

    const y = d3.scaleLinear()
      .domain([0, d3.max(Object.values(counts))])
      .range([height, 0]);

    svg.selectAll('rect')
      .data(Object.entries(counts))
      .enter()
      .append('rect')
      .attr('x', d => x(d[0]))
      .attr('y', d => y(d[1]))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d[1]))
      .attr('fill', 'steelblue');

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Sismos por categoría de magnitud');
  };

  const renderDminHistogram = () => {
    const svg = d3.select(svgRef5.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const values = data.map(d => +d.dmin).filter(d => !isNaN(d));
    if (values.length === 0) return;

    const x = d3.scaleLinear()
      .domain([d3.min(values), d3.max(values)])
      .range([0, width]);

    const bins = d3.histogram()
      .domain(x.domain())
      .thresholds(20)(values);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    svg.selectAll('*').remove();

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));

    svg.selectAll('rect')
      .data(bins)
      .enter()
      .append('rect')
      .attr('x', d => x(d.x0) + 1)
      .attr('y', d => y(d.length))
      .attr('width', d => x(d.x1) - x(d.x0) - 1)
      .attr('height', d => height - y(d.length))
      .attr('fill', 'steelblue');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Distribución de dmin');
  };

  const renderRmsHistogram = () => {
    const svg = d3.select(svgRef6.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const values = data.map(d => +d.rms).filter(d => !isNaN(d));
    if (values.length === 0) return;

    const x = d3.scaleLinear()
      .domain([d3.min(values), d3.max(values)])
      .range([0, width]);

    const bins = d3.histogram()
      .domain(x.domain())
      .thresholds(20)(values);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    svg.selectAll('*').remove();

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));

    svg.selectAll('rect')
      .data(bins)
      .enter()
      .append('rect')
      .attr('x', d => x(d.x0) + 1)
      .attr('y', d => y(d.length))
      .attr('width', d => x(d.x1) - x(d.x0) - 1)
      .attr('height', d => height - y(d.length))
      .attr('fill', 'steelblue');

    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Distribución de rms');
  };

  if (!selectedColumn) return <div>Selecciona una columna para analizar</div>;

  return (
    <div className="column-analysis-container">
      <h2>Análisis de: {selectedColumn}</h2>

      <div>
        <label htmlFor="column-select">Selecciona una columna: </label>
        <select
          id="column-select"
          value={selectedColumn}
          onChange={(e) => setSelectedColumn(e.target.value)}
        >
          <option value="mag">Magnitud</option>
          <option value="longitude">Longitud</option>
          <option value="latitude">Latitud</option>
          <option value="depth">Profundidad</option>
          <option value="nst">Número de estaciones</option>
          <option value="gap">Brecha azimutal</option>
          <option value="dmin">Distancia Mínima</option>
          <option value="rms">Error Cuadrático Medio</option>
          <option value="net">Red</option>
        </select>
      </div>

      <div className="top-charts">
        <div className="chart-card">
          <h4>Distribución</h4>
          <svg ref={svgRef1}></svg>
        </div>

        <div className="chart-card">
          <h4>Estadísticas</h4>
          <svg ref={svgRef2}></svg>
        </div>
      </div>

      <div className="bottom-charts">
        <div className="chart-card">
          <h4>Boxplot</h4>
          <svg ref={svgRef3}></svg>
        </div>

        {selectedColumn === 'mag' && (
          <div className="chart-card">
            <h4>Categorías de Magnitud</h4>
            <svg ref={svgRef4}></svg>
          </div>
        )}

        {selectedColumn === 'dmin' && (
          <div className="chart-card">
            <h4>Distribución de dmin</h4>
            <svg ref={svgRef5}></svg>
          </div>
        )}

        {selectedColumn === 'rms' && (
          <div className="chart-card">
            <h4>Distribución de rms</h4>
            <svg ref={svgRef6}></svg>
          </div>
        )}
      </div>
    </div>
  );
};

import PropTypes from 'prop-types';

ColumnAnalysis.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired
};

export default ColumnAnalysis;
