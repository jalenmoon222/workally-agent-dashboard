(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const palette = ['#167b77', '#467db1', '#e3a04b', '#d46b58', '#7a8a62', '#8a6ca8'];
  function el(tag, attrs, text) {
    const node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function base(target, title, height) {
    if (!target) return null;
    target.replaceChildren();
    const svg = el('svg', { viewBox: '0 0 640 ' + (height || 280), role: 'img', 'aria-label': title, preserveAspectRatio: 'xMidYMid meet' });
    svg.appendChild(el('title', {}, title)); target.appendChild(svg); return svg;
  }
  function empty(target, title) {
    const svg = base(target, title, 210); if (!svg) return;
    svg.appendChild(el('text', { x: 320, y: 104, 'text-anchor': 'middle', class: 'chart-empty' }, 'No reported responses in this sample'));
  }
  function tooltip(node, text) { node.appendChild(el('title', {}, text)); }
  function horizontal(target, rows, title, opts) {
    opts = opts || {}; rows = (rows || []).filter(function (row) { return Number.isFinite(Number(row.value)); }).slice(0, opts.limit || 9);
    if (!rows.length) return empty(target, title);
    const height = Math.max(220, 48 * rows.length + 36); const svg = base(target, title, height); if (!svg) return;
    const left = 185, plotW = 400, max = Math.max(1, ...rows.map(function (row) { return Number(row.value); }));
    rows.forEach(function (row, index) {
      const y = index * 48 + 20; const width = Math.max(2, Number(row.value) / max * plotW);
      svg.appendChild(el('text', { x: left - 12, y: y + 15, 'text-anchor': 'end', class: 'chart-label' }, row.label));
      const bar = el('rect', { x: left, y, width, height: 22, rx: 4, fill: row.color || palette[index % palette.length], class: 'chart-bar' });
      tooltip(bar, row.label + ': ' + (row.displayValue === undefined ? row.value : row.displayValue)); svg.appendChild(bar);
      svg.appendChild(el('text', { x: Math.min(left + width + 8, 620), y: y + 16, class: 'chart-value' }, row.displayValue === undefined ? String(row.value) : String(row.displayValue)));
    });
  }
  function vertical(target, rows, title, opts) {
    opts = opts || {}; rows = (rows || []).filter(function (row) { return Number.isFinite(Number(row.value)); });
    if (!rows.length) return empty(target, title);
    const svg = base(target, title, 280); if (!svg) return;
    const left = 44, top = 20, plotW = 565, plotH = 190, max = Math.max(1, ...rows.map(function (row) { return Number(row.value); }));
    [0, 0.5, 1].forEach(function (fraction) {
      const y = top + plotH - fraction * plotH;
      svg.appendChild(el('line', { x1: left, y1: y, x2: 620, y2: y, class: 'chart-grid' }));
    });
    const slot = plotW / rows.length; const barW = Math.min(42, slot * 0.62);
    rows.forEach(function (row, index) {
      const value = Number(row.value); const barH = value / max * (plotH - 12); const x = left + index * slot + (slot - barW) / 2; const y = top + plotH - barH;
      const bar = el('rect', { x, y, width: barW, height: Math.max(2, barH), rx: 4, fill: row.color || palette[index % palette.length], class: 'chart-bar' });
      tooltip(bar, row.label + ': ' + (row.displayValue === undefined ? value : row.displayValue)); svg.appendChild(bar);
      svg.appendChild(el('text', { x: x + barW / 2, y: Math.max(15, y - 6), 'text-anchor': 'middle', class: 'chart-value' }, row.displayValue === undefined ? String(value) : String(row.displayValue)));
      svg.appendChild(el('text', { x: x + barW / 2, y: top + plotH + 22, 'text-anchor': 'middle', class: 'chart-label' }, row.label.length > 12 ? row.label.slice(0, 11) + '…' : row.label));
    });
  }
  function donut(target, rows, title) {
    rows = (rows || []).filter(function (row) { return Number(row.value) > 0; });
    if (!rows.length) return empty(target, title);
    const svg = base(target, title, 270); if (!svg) return;
    const total = rows.reduce(function (sum, row) { return sum + Number(row.value); }, 0); let angle = -Math.PI / 2;
    const cx = 180, cy = 132, radius = 82, inner = 52;
    rows.forEach(function (row, index) {
      const slice = Number(row.value) / total * Math.PI * 2; const end = angle + slice;
      const x1 = cx + radius * Math.cos(angle), y1 = cy + radius * Math.sin(angle), x2 = cx + radius * Math.cos(end), y2 = cy + radius * Math.sin(end);
      const ix2 = cx + inner * Math.cos(end), iy2 = cy + inner * Math.sin(end), ix1 = cx + inner * Math.cos(angle), iy1 = cy + inner * Math.sin(angle);
      const path = el('path', { d: 'M ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + (slice > Math.PI ? 1 : 0) + ' 1 ' + x2 + ' ' + y2 + ' L ' + ix2 + ' ' + iy2 + ' A ' + inner + ' ' + inner + ' 0 ' + (slice > Math.PI ? 1 : 0) + ' 0 ' + ix1 + ' ' + iy1 + ' Z', fill: row.color || palette[index % palette.length], class: 'chart-bar' });
      tooltip(path, row.label + ': ' + row.value + ' (' + Math.round(Number(row.value) / total * 100) + '%)'); svg.appendChild(path); angle = end;
      const ly = 52 + index * 26; const legend = el('rect', { x: 330, y: ly - 10, width: 10, height: 10, rx: 2, fill: row.color || palette[index % palette.length] }); svg.appendChild(legend);
      svg.appendChild(el('text', { x: 348, y: ly, class: 'chart-label' }, row.label.length > 28 ? row.label.slice(0, 27) + '…' : row.label));
      svg.appendChild(el('text', { x: 602, y: ly, 'text-anchor': 'end', class: 'chart-value' }, String(row.value)));
    });
    svg.appendChild(el('text', { x: cx, y: cy - 3, 'text-anchor': 'middle', class: 'donut-total' }, String(total)));
    svg.appendChild(el('text', { x: cx, y: cy + 17, 'text-anchor': 'middle', class: 'chart-label' }, 'workers'));
  }
  function line(target, rows, title) {
    rows = (rows || []).filter(function (row) { return Number.isFinite(Number(row.value)); });
    if (!rows.length) return empty(target, title);
    const svg = base(target, title, 260); if (!svg) return;
    const left = 48, top = 20, width = 560, height = 172; const max = Math.max(1, ...rows.map(function (row) { return Number(row.value); }));
    [0, 0.5, 1].forEach(function (fraction) { const y = top + height - fraction * height; svg.appendChild(el('line', { x1: left, y1: y, x2: 615, y2: y, class: 'chart-grid' })); });
    const points = rows.map(function (row, index) { return { x: left + (rows.length === 1 ? width / 2 : index * width / (rows.length - 1)), y: top + height - Number(row.value) / max * (height - 10), row }; });
    svg.appendChild(el('polyline', { points: points.map(function (point) { return point.x + ',' + point.y; }).join(' '), fill: 'none', stroke: '#167b77', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    points.forEach(function (point) { const circle = el('circle', { cx: point.x, cy: point.y, r: 5, fill: '#fff', stroke: '#167b77', 'stroke-width': 3 }); tooltip(circle, point.row.label + ': ' + point.row.value); svg.appendChild(circle); svg.appendChild(el('text', { x: point.x, y: 224, 'text-anchor': 'middle', class: 'chart-label' }, point.row.label)); });
  }
  function heatmap(target, rows, columns, title) {
    if (!rows || !rows.length) return empty(target, title);
    const svg = base(target, title, Math.max(230, rows.length * 52 + 62)); if (!svg) return;
    const startX = 180, slotW = 108;
    columns.forEach(function (column, index) { svg.appendChild(el('text', { x: startX + index * slotW + slotW / 2, y: 25, 'text-anchor': 'middle', class: 'chart-label' }, column)); });
    rows.forEach(function (row, ri) {
      const y = 42 + ri * 48; svg.appendChild(el('text', { x: startX - 12, y: y + 23, 'text-anchor': 'end', class: 'chart-label' }, row.label));
      columns.forEach(function (column, ci) {
        const cell = row.values[column] || { percent: 0, count: 0, sample: 0 }; const value = Number(cell.percent) || 0;
        const fill = value > 65 ? '#146b67' : value > 45 ? '#3d9189' : value > 25 ? '#8bbab3' : value > 0 ? '#dcebe8' : '#f0f3f2';
        const rect = el('rect', { x: startX + ci * slotW + 4, y, width: slotW - 8, height: 36, rx: 4, fill });
        tooltip(rect, row.label + ', ' + column + ': ' + value + '% (' + cell.count + ' of ' + cell.sample + ')'); svg.appendChild(rect);
        svg.appendChild(el('text', { x: startX + ci * slotW + slotW / 2, y: y + 16, 'text-anchor': 'middle', class: value > 45 ? 'heat-light' : 'heat-dark' }, value + '%'));
        svg.appendChild(el('text', { x: startX + ci * slotW + slotW / 2, y: y + 30, 'text-anchor': 'middle', class: value > 45 ? 'heat-light small' : 'heat-dark small' }, 'n=' + cell.sample));
      });
    });
  }
  function stacked(target, rows, series, title) {
    if (!rows || !rows.length) return empty(target, title);
    const svg = base(target, title, 280); if (!svg) return;
    const left = 50, top = 18, plotH = 190, plotW = 560;
    const totals = rows.map(function (row) { return series.reduce(function (sum, key) { return sum + Number(row.values[key] || 0); }, 0); });
    const max = Math.max(1, ...totals); const slot = plotW / rows.length; const barW = Math.min(48, slot * 0.64);
    rows.forEach(function (row, index) {
      let yBase = top + plotH; const x = left + index * slot + (slot - barW) / 2;
      series.forEach(function (key, sIndex) {
        const value = Number(row.values[key] || 0); const height = value / max * plotH; yBase -= height;
        if (height > 0) { const rect = el('rect', { x, y: yBase, width: barW, height, fill: palette[sIndex % palette.length], class: 'chart-bar' }); tooltip(rect, row.label + ', ' + key + ': ' + value); svg.appendChild(rect); }
      });
      svg.appendChild(el('text', { x: x + barW / 2, y: top + plotH + 21, 'text-anchor': 'middle', class: 'chart-label' }, row.label));
    });
    series.forEach(function (key, index) { const x = 70 + index * 130; svg.appendChild(el('rect', { x, y: 239, width: 9, height: 9, rx: 2, fill: palette[index % palette.length] })); svg.appendChild(el('text', { x: x + 14, y: 248, class: 'chart-label' }, key)); });
  }
  window.WACharts = { horizontal, vertical, donut, line, heatmap, stacked, palette };
})();
