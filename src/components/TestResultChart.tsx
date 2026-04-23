'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Rectangle } from 'recharts';

interface TestResultChartProps {
    testName: string;
    result: string;
    units: string;
    referenceRange: string;
}

export function TestResultChart({ testName, result, units, referenceRange }: TestResultChartProps) {
    // Parse reference range (e.g., "104.0 - 202.0" or "Less than 75.0" or "70-110")
    const parseReferenceRange = (range: string): { min: number, max: number } | null => {
        if (!range) return null;

        // Handle "Less than X" or "< X"
        const lessThanMatch = range.match(/(?:less\s+than|<)\s*([\d.]+)/i);
        if (lessThanMatch) {
            const maxVal = parseFloat(lessThanMatch[1]);
            return { min: 0, max: maxVal };
        }

        // Handle "Greater than X" or "> X"
        const greaterThanMatch = range.match(/(?:greater\s+than|>)\s*([\d.]+)/i);
        if (greaterThanMatch) {
            const minVal = parseFloat(greaterThanMatch[1]);
            return { min: minVal, max: minVal * 1.5 };
        }

        // Handle "X - Y" or "X-Y" or "X to Y" (improved regex)
        const rangeMatch = range.match(/([\d.]+)\s*[-–—to]+\s*([\d.]+)/i);
        if (rangeMatch) {
            return {
                min: parseFloat(rangeMatch[1]),
                max: parseFloat(rangeMatch[2]),
            };
        }

        // Handle "M: X-Y, F: A-B" format (gender-specific)
        const genderMatch = range.match(/([\d.]+)\s*-\s*([\d.]+)/);
        if (genderMatch) {
            return {
                min: parseFloat(genderMatch[1]),
                max: parseFloat(genderMatch[2]),
            };
        }

        return null;
    };

    const resultValue = parseFloat(result);
    const refRange = parseReferenceRange(referenceRange);

    // Skip chart if we can't parse the values
    if (isNaN(resultValue) || !refRange) {
        return null;
    }

    const { min: refMin, max: refMax } = refRange;

    // Determine if result is normal, high, or low
    const status = resultValue < refMin ? 'Low' : resultValue > refMax ? 'High' : 'Normal';
    const color = status === 'Normal' ? '#10b981' : status === 'High' ? '#ef4444' : '#f59e0b';

    // Create data for the chart - using start and end positions
    const chartData = [
        {
            name: 'Reference Range',
            start: refMin,
            end: refMax,
            value: refMax,
            fill: '#9ca3af',
            label: `${refMin} - ${refMax}`,
        },
        {
            name: 'Your Result',
            start: 0,
            end: resultValue,
            value: resultValue,
            fill: color,
            label: resultValue.toFixed(1),
        },
    ];

    // Calculate domain for better visualization
    const domainMin = Math.min(refMin, resultValue) * 0.8;
    const domainMax = Math.max(refMax, resultValue) * 1.2;

    // Custom bar shape that respects start position
    const CustomBar = (props: any) => {
        const { fill, x, y, width, height, payload } = props;

        if (payload.name === 'Reference Range') {
            // For reference range, calculate width based on start and end
            const xScale = width / (domainMax - domainMin);
            const startX = x + (payload.start - domainMin) * xScale;
            const barWidth = (payload.end - payload.start) * xScale;

            return (
                <Rectangle
                    x={startX}
                    y={y}
                    width={barWidth}
                    height={height}
                    fill={fill}
                    radius={[0, 4, 4, 0]}
                />
            );
        }

        // For result, draw normally
        return <Rectangle x={x} y={y} width={width} height={height} fill={fill} radius={[0, 4, 4, 0]} />;
    };

    return (
        <div className="my-4 p-4 bg-gray-50 rounded-lg print:bg-white">
            <h4 className="text-sm font-semibold mb-2">{testName} - Visual Comparison</h4>
            <ResponsiveContainer width="100%" height={150}>
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                    <XAxis type="number" domain={[domainMin, domainMax]} unit={units} />
                    <YAxis type="category" dataKey="name" width={90} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'white', border: '1px solid #d1d5db' }}
                        labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" shape={<CustomBar />}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                    {/* Reference range markers */}
                    <ReferenceLine
                        x={refMin}
                        stroke="#000000"
                        strokeWidth={2}
                        label={{
                            value: `${refMin}${units}`,
                            position: 'top',
                            fill: '#000000',
                            fontSize: 11,
                            fontWeight: 'bold'
                        }}
                    />
                    <ReferenceLine
                        x={refMax}
                        stroke="#000000"
                        strokeWidth={2}
                        label={{
                            value: `${refMax}${units}`,
                            position: 'top',
                            fill: '#000000',
                            fontSize: 11,
                            fontWeight: 'bold'
                        }}
                    />
                </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-center">
                <span className={`font-semibold ${color === '#10b981' ? 'text-green-600' : color === '#ef4444' ? 'text-red-600' : 'text-amber-600'}`}>
                    Status: {status}
                </span>
                {status !== 'Normal' && (
                    <span className="ml-2 text-gray-600">
                        ({resultValue < refMin ? `${(refMin - resultValue).toFixed(1)} below minimum` : `${(resultValue - refMax).toFixed(1)} above maximum`})
                    </span>
                )}
            </div>
        </div>
    );
}
