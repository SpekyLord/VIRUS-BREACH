import { QRCodeCanvas } from 'qrcode.react';

export default function QRCode({ url, size = 200 }) {
  return (
    <div className="cyber-card p-4 inline-block">
      <QRCodeCanvas
        value={url}
        size={size}
        bgColor="#0a0a0f"
        fgColor="#00ff41"
        level="H"
        className="border-2 border-cyber-green"
      />
    </div>
  );
}
