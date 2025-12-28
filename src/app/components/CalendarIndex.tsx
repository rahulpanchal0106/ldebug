'use client'

import { useState, useEffect } from 'react';
import { getCalendarData } from '@/src/actions/getLogs';

type CalendarIndexProps = {
    onDateSelect: (date: Date) => void;
    currentDate?: Date;
};

export default function CalendarIndex({ onDateSelect, currentDate }: CalendarIndexProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [calendarData, setCalendarData] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    useEffect(() => {
        loadCalendarData();
    }, [year, month]);

    const loadCalendarData = async () => {
        setLoading(true);
        try {
            const data = await getCalendarData(year, month);
            setCalendarData(data);
        } catch (error) {
            console.error('Failed to load calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth((prev) => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    const getDaysInMonth = () => {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (number | null)[] = [];
        
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    const getDateKey = (day: number) => {
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
    };

    const isToday = (day: number) => {
        if (!day) return false;
        const today = new Date();
        return (
            day === today.getDate() &&
            month === today.getMonth() + 1 &&
            year === today.getFullYear()
        );
    };

    const isSelected = (day: number) => {
        if (!day || !currentDate) return false;
        return (
            day === currentDate.getDate() &&
            month === currentDate.getMonth() + 1 &&
            year === currentDate.getFullYear()
        );
    };

    const handleDateClick = (day: number) => {
        if (!day) return;
        const date = new Date(year, month - 1, day);
        onDateSelect(date);
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const days = getDaysInMonth();
    const logCount = (day: number) => {
        if (!day) return 0;
        const dateKey = getDateKey(day);
        return calendarData[dateKey] || 0;
    };

    const getLogCountColor = (count: number) => {
        if (count === 0) return 'bg-gray-50 dark:bg-gray-700';
        if (count <= 2) return 'bg-blue-100 dark:bg-blue-900/30';
        if (count <= 5) return 'bg-blue-200 dark:bg-blue-800/40';
        return 'bg-blue-300 dark:bg-blue-700/50';
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                >
                    ←
                </button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {monthNames[month - 1]} {year}
                </h2>
                <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    →
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map((day) => (
                            <div key={day} className="text-center text-xs font-semibold text-gray-600 dark:text-gray-400 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => {
                            if (day === null) {
                                return <div key={`empty-${index}`} className="aspect-square" />;
                            }

                            const count = logCount(day);
                            const today = isToday(day);
                            const selected = isSelected(day);

                            return (
                                <button
                                    key={day}
                                    onClick={() => handleDateClick(day)}
                                    className={`
                                        aspect-square rounded-lg transition-all
                                        ${selected ? 'ring-2 ring-blue-600 dark:ring-blue-400 ring-offset-2' : ''}
                                        ${today ? 'font-bold' : ''}
                                        ${count > 0 ? `${getLogCountColor(count)} hover:bg-blue-400 dark:hover:bg-blue-600` : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}
                                        ${today ? 'border-2 border-blue-500 dark:border-blue-400' : ''}
                                        flex flex-col items-center justify-center
                                    `}
                                >
                                    <span className={`text-sm ${today ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {day}
                                    </span>
                                    {count > 0 && (
                                        <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/30 rounded"></div>
                            <span>1-2 logs</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-200 dark:bg-blue-800/40 rounded"></div>
                            <span>3-5 logs</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-300 dark:bg-blue-700/50 rounded"></div>
                            <span>5+ logs</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

