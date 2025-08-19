import React from "react";

export type TiltButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** maximum tilt in degrees */
  maxTilt?: number;
};

export default function TiltButton({
  className = "",
  onMouseMove,
  onMouseLeave,
  maxTilt = 4,
  children,
  ...rest
}: TiltButtonProps) {
  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rx = (-y * maxTilt).toFixed(2);
    const ry = (x * maxTilt).toFixed(2);
    e.currentTarget.style.setProperty("--rx", `${rx}deg`);
    e.currentTarget.style.setProperty("--ry", `${ry}deg`);
    onMouseMove?.(e);
  };

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
    onMouseLeave?.(e);
  };

  return (
    <button
      {...rest}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`tilt ${className}`}
    >
      {children}
    </button>
  );
}
