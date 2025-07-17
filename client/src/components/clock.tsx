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
        const colorStyle = color === 'white' ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-100";
        const activeStyle = isActive ? "ring-4 ring-blue-500 shadow-lg" : "";
        const lowTimeStyle = displayTime < 10000 ? "text-red-500" : "";
        
        return `${baseStyle} ${colorStyle} ${activeStyle} ${lowTimeStyle}`;
    };

    return (
        <div className={getClockStyle()}>
            {formatTime(displayTime)}
        </div>
    );
};

export default Clock;