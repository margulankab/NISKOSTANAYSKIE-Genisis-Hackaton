export function createArtwork() {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The illustration could not be created.');

  const sky = ctx.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, '#113f54');
  sky.addColorStop(0.54, '#5f9b9d');
  sky.addColorStop(1, '#f2c775');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 600);

  const sunlight = ctx.createRadialGradient(686, 205, 10, 686, 205, 320);
  sunlight.addColorStop(0, '#f7df92aa');
  sunlight.addColorStop(1, '#f7df9200');
  ctx.fillStyle = sunlight;
  ctx.fillRect(0, 0, 960, 600);

  function polygon(points: [number, number][], color: string) {
    ctx.beginPath();
    points.forEach(([x, y], index) => index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  polygon([[0, 461], [155, 429], [330, 478], [570, 410], [775, 448], [960, 382], [960, 600], [0, 600]], '#c99d66');
  polygon([[0, 521], [290, 473], [489, 544], [694, 465], [960, 504], [960, 600], [0, 600]], '#e3be80');
  polygon([[0, 566], [232, 530], [371, 562], [572, 518], [960, 557], [960, 600], [0, 600]], '#448d8e');

  function track(color: string, width: number, y: number) {
    ctx.beginPath();
    ctx.moveTo(454, 302 + y);
    ctx.bezierCurveTo(456, 479 + y, 543, 525 + y, 671, 536 + y);
    ctx.quadraticCurveTo(824, 550 + y, 1010, 510 + y);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  track('#164a48', 66, 11);
  track('#5dae46', 54, 0);
  track('#a6df64', 36, -6);
  track('#d7eda170', 5, -13);

  const capsule = ctx.createLinearGradient(361, 0, 509, 0);
  capsule.addColorStop(0, '#255e46');
  capsule.addColorStop(0.2, '#508e41');
  capsule.addColorStop(0.72, '#a6df66');
  capsule.addColorStop(1, '#4b883e');
  ctx.beginPath();
  ctx.roundRect(353, 44, 178, 304, [76, 76, 40, 40]);
  ctx.fillStyle = capsule;
  ctx.fill();

  const glass = ctx.createLinearGradient(388, 0, 495, 0);
  glass.addColorStop(0, '#163d44');
  glass.addColorStop(0.6, '#276e66');
  glass.addColorStop(1, '#a4d28a');
  ctx.beginPath();
  ctx.roundRect(380, 76, 122, 229, [55, 55, 31, 31]);
  ctx.fillStyle = glass;
  ctx.fill();
  polygon([[406, 112], [416, 101], [439, 286], [426, 283]], '#d7f4c055');
  polygon([[465, 96], [471, 105], [487, 253], [481, 272]], '#dcf8cc40');

  ctx.fillStyle = '#e2e8a2';
  ctx.fillRect(503, 167, 5, 42);
  ctx.fillRect(498, 165, 12, 5);
  ctx.fillRect(498, 207, 12, 5);
  ctx.fillStyle = '#b3dc66';
  ctx.fillRect(382, 307, 121, 9);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The illustration could not be saved.')), 'image/png');
  });
}
