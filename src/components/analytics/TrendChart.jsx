import React from 'react';
import './TrendChart.css';

/**
 * TrendChart - Gráfico de linha (Tendência)
 * 
 * Props:
 *   - data: array de { month, gastos, receita }
 *   - metric: 'gastos' ou 'receita' (qual linha mostrar)
 *   - emptyMessage: show quando vazio
 * 
 * Exemplo:
 * <TrendChart
 *   data={[
 *     { month: 'Jan', gastos: 1500, receita: 3000 },
 *     { month: 'Fev', gastos: 1750, receita: 3200 },
 *   ]}
 *   metric="gastos"
 * />
 */

export function TrendChart({ data = [], metric = 'gastos', emptyMessage = 'Sem dados' }) {
  if (!data || data.length < 2) {
    return <div className="trend-chart trend-chart--empty">{emptyMessage}</div>;
  }

  // Extrair valores
  const values = data.map(d => d[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // SVG dimensions
  const width = 320;
  const height = 200;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  // Pontos do gráfico
  const points = values.map((value, idx) => {
    const x = padding + (idx / (values.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((value - min) / range) * graphHeight;
    return { x, y, value };
  });

  // Path da linha
  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Área sob a linha
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  // Calcular mudança
  const change = values[values.length - 1] - values[0];
  const percentChange = ((change / values[0]) * 100).toFixed(1);
  const isPositive = change >= 0;

  return (
    <div className="trend-chart">
      <div className="trend-chart__svg-wrapper">
        <svg width={width} height={height} className="trend-chart__svg">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = padding + graphHeight * (1 - ratio);
            const value = min + range * ratio;
            return (
              <g key={idx}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  className="trend-chart__grid-line"
                />
                <text
                  x={padding - 5}
                  y={y}
                  textAnchor="end"
                  className="trend-chart__grid-label"
                >
                  R$ {value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Área sob a linha */}
          <path
            d={areaPath}
            fill={isPositive ? 'rgba(239, 68, 68, 0.1)' : 'var(--income-soft)'}
            className="trend-chart__area"
          />

          {/* Linha principal */}
          <polyline
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={isPositive ? '#EF4444' : 'var(--color-income)'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="trend-chart__line"
          />

          {/* Pontos */}
          {points.map((point, idx) => (
            <g key={idx}>
              {/* Circle de fundo */}
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="var(--color-surface, #1E293B)"
                stroke={isPositive ? '#EF4444' : 'var(--color-income)'}
                strokeWidth="2"
              />
              {/* Valor ao passar mouse (via tooltip no CSS) */}
              <title>{`${data[idx].month}: R$ ${point.value.toFixed(2)}`}</title>
            </g>
          ))}

          {/* Labels do eixo X */}
          {data.map((item, idx) => {
            const x = padding + (idx / (data.length - 1)) * graphWidth;
            return (
              <text
                key={idx}
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="trend-chart__x-label"
              >
                {item.month}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Informações */}
      <div className="trend-chart__info">
        <div className="trend-chart__stat">
          <span className="trend-chart__label">Início:</span>
          <strong>R$ {values[0].toFixed(2)}</strong>
        </div>
        <div className="trend-chart__stat">
          <span className="trend-chart__label">Fim:</span>
          <strong>R$ {values[values.length - 1].toFixed(2)}</strong>
        </div>
        <div className={`trend-chart__stat trend-chart__stat--${isPositive ? 'increase' : 'decrease'}`}>
          <span className="trend-chart__label">Mudança:</span>
          <strong>
            {isPositive ? '📈' : '📉'} {percentChange}%
          </strong>
        </div>
      </div>
    </div>
  );
}

export default TrendChart;
