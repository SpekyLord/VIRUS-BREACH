export default function MatrixRain() {
  return (
    <>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-10">
        <div className="matrix-rain"></div>
      </div>
      <style>{`
        @keyframes matrix-fall {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .matrix-rain {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            90deg,
            transparent 0px,
            transparent 20px,
            rgba(0, 255, 65, 0.03) 20px,
            rgba(0, 255, 65, 0.03) 21px
          );
          animation: matrix-fall 15s linear infinite;
        }
      `}</style>
    </>
  );
}
