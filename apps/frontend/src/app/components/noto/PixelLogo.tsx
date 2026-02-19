export function PixelLogo({ size = 32 }: { size?: number }) {
  // Pixel art pen - 16x16 grid
  const pixels = [
    // Pen tip and body as pixel coordinates [x, y]
    [11,1],[12,1],
    [10,2],[11,2],[12,2],[13,2],
    [9,3],[10,3],[11,3],[12,3],[13,3],
    [8,4],[9,4],[10,4],[11,4],[12,4],
    [7,5],[8,5],[9,5],[10,5],[11,5],
    [6,6],[7,6],[8,6],[9,6],[10,6],
    [5,7],[6,7],[7,7],[8,7],[9,7],
    [4,8],[5,8],[6,8],[7,8],[8,8],
    [3,9],[4,9],[5,9],[6,9],[7,9],
    [2,10],[3,10],[4,10],[5,10],[6,10],
    [1,11],[2,11],[3,11],[4,11],[5,11],
    [1,12],[2,12],[3,12],[4,12],
    [1,13],[2,13],[3,13],
    [1,14],[2,14],
  ];
  
  const tipPixels = [
    [1,14],[2,14],
    [1,13],[2,13],[3,13],
  ];

  const scale = size / 16;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      style={{ imageRendering: "pixelated" as any }}
      className="shrink-0"
    >
      {pixels.map(([x, y]) => {
        const isTip = tipPixels.some(([tx, ty]) => tx === x && ty === y);
        return (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={isTip ? "var(--primary)" : "currentColor"}
            opacity={isTip ? 0.8 : 1}
          />
        );
      })}
    </svg>
  );
}
