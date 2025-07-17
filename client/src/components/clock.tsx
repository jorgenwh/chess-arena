import { useEffect, useState } from 'react';

interface ClockProps {
    time: number; // Time in milliseconds
    isActive: boolean;
    color: 'white' | 'black';
}

const Clock = ({ time, isActive, color }: ClockProps) => {
    const [displayTime, setDisplayTime] = useState(time);

    useEffect(() => {
        setDisplayTime(time);
    }, [time]);

    const formatTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getClockStyle = () => {
        const baseStyle = "px-4 py-2 rounded-lg font-mono text-xl font-bold transition-all";
        const colorStyle = color === 'white' ? "bg-white/10 text-white border border-white/20" : "bg-black/20 text-gray-300 border border-white/10";
        const activeStyle = isActive ? "ring-1 ring-white/60 shadow-[0_0_20px_rgba(255,255,255,0.3)]" : "";
        const lowTimeStyle = displayTime < 10000 ? "!text-red-400 animate-pulse" : "";
        
        return `${baseStyle} ${colorStyle} ${activeStyle} ${lowTimeStyle}`;
    };

    return (
        <div className={getClockStyle()}>
            {formatTime(displayTime)}
        </div>
    );
};

export default Clock;