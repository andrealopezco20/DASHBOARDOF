import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import './AnalisisGeneral.css';

const AnalisisGeneral = () => {
  const [data, setData] = useState([]);
  const [yearFilter, setYearFilter] = useState("2023");
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: "" });

  const lineChartRef = useRef();
  const mapRef = useRef();
  const barChartRef = useRef();
  const pieChartRef = useRef();

  useEffect(() => {
    d3.csv("/data/data.csv").then((rawData) => {
      const parsed = rawData.map((d) => ({
        ...d,
        year: +d.year,
        month: new Date(d.time).getMonth() + 1,
        day: new Date(d.time).getDate(),
        mag: +d.mag,
        latitude: +d.latitude,
        longitude: +d.longitude,
      }));
      setData(parsed);
    });
  }, []);

  useEffect(() => {
    if (!data.length) return;

    const yearlyCounts = d3.rollup(data, (v) => v.length, (d) => d.year);
    const lineData = Array.from(yearlyCounts, ([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);

    const svg = d3.select(lineChartRef.current);
    svg.selectAll("*").remove();

    const width = 700, height = 300, margin = { top: 20, right: 30, bottom: 40, left: 50 };
    svg.attr("width", width).attr("height", height);

    const x = d3.scaleLinear()
      .domain(d3.extent(lineData, (d) => d.year))
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(lineData, (d) => d.count)]).nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3.line()
      .x((d) => x(d.year))
      .y((d) => y(d.count));

    svg.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "#4FC3F7")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
  }, [data]);

  useEffect(() => {
    if (!data.length || !yearFilter) return;

    const svg = d3.select(mapRef.current);
    svg.selectAll("*").remove();

    const width = 720, height = 360;
    svg.attr("width", width).attr("height", height);

    const projection = d3.geoNaturalEarth1().scale(130).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((worldData) => {
      const countries = topojson.feature(worldData, worldData.objects.countries);

      svg.append("g")
        .selectAll("path")
        .data(countries.features)
        .join("path")
        .attr("fill", "#333")
        .attr("stroke", "#999")
        .attr("d", path);

      const filtered = data.filter((d) => d.year == yearFilter);

      svg.append("g")
        .selectAll("circle")
        .data(filtered)
        .join("circle")
        .attr("cx", (d) => projection([d.longitude, d.latitude])[0])
        .attr("cy", (d) => projection([d.longitude, d.latitude])[1])
        .attr("r", 2)
        .attr("fill", (d) => {
          if (d.mag < 5) return "#FDD835";
          if (d.mag < 7) return "#FB8C00";
          return "#E53935";
        })
        .attr("opacity", 0.7);

      // Agregar leyenda
      const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, ${height - 100})`);

      const legendData = [
        { color: "#FDD835", text: "Magnitud < 5" },
        { color: "#FB8C00", text: "Magnitud 5-7" },
        { color: "#E53935", text: "Magnitud ≥ 7" }
      ];

      legend.selectAll("rect")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 25)
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d.color);

      legend.selectAll("text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 25 + 15)
        .text(d => d.text)
        .style("font-size", "12px")
        .style("fill", "#fff");
    });
  }, [data, yearFilter]);

  useEffect(() => {
    if (!data.length || !yearFilter) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll("*").remove();

    const filtered = data.filter((d) => d.year == yearFilter);
    const monthCounts = d3.rollup(filtered, (v) => v.length, (d) => d.month);
    const barData = Array.from(monthCounts, ([month, count]) => ({ month, count }))
      .sort((a, b) => a.month - b.month);

    const width = 700, height = 300, margin = { top: 20, right: 30, bottom: 60, left: 50 };
    svg.attr("width", width).attr("height", height);

    const x = d3.scaleBand()
      .domain(barData.map(d => d.month))
      .range([margin.left, width - margin.right])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.count)]).nice()
      .range([height - margin.bottom, margin.top]);

    const bars = svg.append("g")
      .selectAll("rect")
      .data(barData)
      .join("rect")
      .attr("x", d => x(d.month))
      .attr("y", d => y(d.count))
      .attr("height", d => y(0) - y(d.count))
      .attr("width", x.bandwidth())
      .attr("fill", "#4FC3F7")
      .style("cursor", "pointer")
      .on("mouseenter", (event, d) => {
        const sismosMes = filtered.filter(s => s.month === d.month);
        const dayCounts = d3.rollup(sismosMes, v => v.length, s => s.day);
        const dayCountsArr = Array.from(dayCounts, ([day, count]) => ({ day, count }));
        const maxDay = dayCountsArr.reduce((max, curr) => (curr.count > max.count ? curr : max), { day: null, count: 0 });

        const monthName = d3.timeFormat("%B")(new Date(2023, d.month - 1));
        const tooltipContent = `
          <strong>${monthName}</strong><br/>
          Total Sismos: ${d.count}<br/>
          Día con más sismos: ${maxDay.day} (${maxDay.count} sismos)
        `;

        setTooltip({
          visible: true,
          x: event.pageX + 10,
          y: event.pageY + 10,
          content: tooltipContent,
        });
      })
      .on("mousemove", (event) => {
        setTooltip(t => ({
          ...t,
          x: event.pageX + 10,
          y: event.pageY + 10,
        }));
      })
      .on("mouseleave", () => {
        setTooltip(t => ({ ...t, visible: false }));
      });

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d => d3.timeFormat("%B")(new Date(2023, d - 1))))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(-40)");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));
  }, [data, yearFilter]);

  useEffect(() => {
    if (!data.length || !yearFilter) return;

    const svg = d3.select(pieChartRef.current);
    svg.selectAll("*").remove();

    const filtered = data.filter(d => d.year == yearFilter);

    const categories = {
      Micro: (d) => d.mag < 2.0,
      Menor: (d) => d.mag >= 2.0 && d.mag < 4.0,
      Ligero: (d) => d.mag >= 4.0 && d.mag < 5.0,
      Moderado: (d) => d.mag >= 5.0 && d.mag < 6.0,
      Fuerte: (d) => d.mag >= 6.0 && d.mag < 7.0,
      Mayor: (d) => d.mag >= 7.0 && d.mag < 8.0,
      "Gran terremoto": (d) => d.mag >= 8.0,
    };

    const pieData = Object.entries(categories).map(([label, condition]) => ({
      label,
      value: filtered.filter(condition).length,
    })).filter(d => d.value > 0);

    const width = 400, height = 300, radius = Math.min(width, height) / 2;
    svg.attr("width", width).attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${width / 2}, ${height / 2})`);
    const color = d3.scaleOrdinal()
      .domain(pieData.map(d => d.label))
      .range(d3.schemeSet2);

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    g.selectAll("path")
      .data(pie(pieData))
      .join("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.label))
      .attr("stroke", "white")
      .style("stroke-width", "2px");

    g.selectAll("text")
      .data(pie(pieData))
      .join("text")
      .text(d => `${d.data.label} (${d.data.value})`)
      .attr("transform", d => `translate(${arc.centroid(d)})`)
      .style("font-size", "12px")
      .style("text-anchor", "middle");
  }, [data, yearFilter]);

  const years = Array.from(new Set(data.map(d => d.year))).sort();
  const filteredData = data.filter(d => d.year == yearFilter);
  const magnitudes = filteredData.map(d => d.mag);
  const avgMag = (d3.mean(magnitudes) || 0).toFixed(2);
  const minMag = (d3.min(magnitudes) || 0).toFixed(2);
  const maxMag = (d3.max(magnitudes) || 0).toFixed(2);

  return (
    <div className="analisis-general-container">
      <div className="dashboard-content">
        <div className="top-section">
          <div className="dataset-info card">
            <h2>Descripción del Dataset</h2>
            <div className="dataset-stats">
              <div className="stat-item">
                <span className="stat-label">Cantidad de registros:</span>
                <span className="stat-value">{data.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Tiempo abarcado:</span>
                <span className="stat-value">
                  {years.length ? `${years[0]} - ${years[years.length - 1]}` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="annual-chart card">
            <h2>Distribución de sismos por año</h2>
            <svg ref={lineChartRef}></svg>
          </div>
        </div>

        <div className="year-selector card">
          <h2>Seleccionar año</h2>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="middle-section">
          <div className="summary card">
            <h2>Resumen Año {yearFilter}</h2>
            <div className="summary-grid">
              <div className="summary-item">
                <span>Total sismos:</span>
                <strong>{filteredData.length}</strong>
              </div>
              <div className="summary-item">
                <span>Magnitud promedio:</span>
                <strong>{avgMag}</strong>
              </div>
              <div className="summary-item">
                <span>Mínima:</span>
                <strong>{minMag}</strong>
              </div>
              <div className="summary-item">
                <span>Máxima:</span>
                <strong>{maxMag}</strong>
              </div>
            </div>
          </div>

          <div className="map card">
            <h2>Mapa de sismos por año</h2>
            <svg ref={mapRef}></svg>
          </div>
        </div>

        <div className="bottom-section">
          <div className="card">
            <h2>Gráfica de sismos por mes</h2>
            <svg ref={barChartRef}></svg>
          </div>

          <div className="card">
            <h2>Distribución por categoría de amplitud</h2>
            <svg ref={pieChartRef}></svg>
          </div>
        </div>
      </div>

      {tooltip.visible && (
        <div className="custom-tooltip" style={{ left: tooltip.x, top: tooltip.y }} 
          dangerouslySetInnerHTML={{ __html: tooltip.content }} />
      )}
    </div>
  );
};

export default AnalisisGeneral;