import React, { useState } from 'react';
import { FaHome, FaChartBar, FaLink } from 'react-icons/fa';
import AnalisisGeneral from './AnalisisGeneral';
import Columna from './Columna';
import Relacion from './Relacion';
import './Navbar.css';

const Navbar = () => {
  const [activeItem, setActiveItem] = useState('Análisis General');

  const renderContent = () => {
    switch (activeItem) {
      case 'Análisis General':
        return <AnalisisGeneral />;
      case 'Columna':
        return <Columna />;
      case 'Relación':
        return <Relacion />;
      default:
        return <AnalisisGeneral />;
    }
  };

  return (
    <div className="app-container">
      <div className="navbar">
        <div
          className={`navbar-item ${activeItem === 'Análisis General' ? 'active' : ''}`}
          onClick={() => setActiveItem('Análisis General')}
        >
          <FaHome /> <span>Análisis General</span>
        </div>
        <div
          className={`navbar-item ${activeItem === 'Columna' ? 'active' : ''}`}
          onClick={() => setActiveItem('Columna')}
        >
          <FaChartBar /> <span>Columna</span>
        </div>
        <div
          className={`navbar-item ${activeItem === 'Relación' ? 'active' : ''}`}
          onClick={() => setActiveItem('Relación')}
        >
          <FaLink /> <span>Relación</span>
        </div>
      </div>
      <div className="content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Navbar;
