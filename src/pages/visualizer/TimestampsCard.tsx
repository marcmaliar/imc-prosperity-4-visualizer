import { Group, Select, Slider, SliderProps, Text } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { ReactNode, useEffect, useMemo } from 'react';
import { AlgorithmDataRow } from '../../models.ts';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { TimestampDetail } from './TimestampDetail.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';

export function TimestampsCard(): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const timestamp = useStore(state => state.timestamp);
  const setTimestamp = useStore(state => state.setTimestamp);
  const ticksWindow = useStore(state => state.ticksWindow);
  const setTicksWindow = useStore(state => state.setTicksWindow);

  const rowsByTimestamp = useMemo(() => {
    const map: Record<number, AlgorithmDataRow> = {};
    for (const row of algorithm.data) {
      map[row.state.timestamp] = row;
    }
    return map;
  }, [algorithm.data]);

  const timestampMin = algorithm.data[0].state.timestamp;
  const timestampMax = algorithm.data[algorithm.data.length - 1].state.timestamp;
  const timestampStep = algorithm.data[1].state.timestamp - algorithm.data[0].state.timestamp;

  useEffect(() => {
    if (timestamp < timestampMin) {
      setTimestamp(timestampMin);
    } else if (timestamp > timestampMax) {
      setTimestamp(timestampMax);
    }
  }, [timestamp, timestampMin, timestampMax, setTimestamp]);

  const marks: SliderProps['marks'] = [];
  for (let i = timestampMin; i < timestampMax; i += (timestampMax + 100) / 4) {
    marks.push({
      value: i,
      label: formatNumber(i),
    });
  }

  useHotkeys([
    ['ArrowLeft', () => setTimestamp(timestamp === timestampMin ? timestamp : timestamp - timestampStep)],
    ['ArrowRight', () => setTimestamp(timestamp === timestampMax ? timestamp : timestamp + timestampStep)],
  ]);

  return (
    <VisualizerCard title="Timestamps">
      <Group align="flex-end" mb="lg">
        <Slider
          min={timestampMin}
          max={timestampMax}
          step={timestampStep}
          marks={marks}
          label={value => `Timestamp ${formatNumber(value)}`}
          value={timestamp}
          onChange={setTimestamp}
          flex={1}
        />
        <Select
          label="Context window (Ticks)"
          value={ticksWindow.toString()}
          onChange={value => setTicksWindow(parseInt(value || '50', 10))}
          data={[
            { value: '10', label: '± 10' },
            { value: '50', label: '± 50' },
            { value: '100', label: '± 100' },
            { value: '500', label: '± 500' },
            { value: '0', label: 'All' },
          ]}
          w={150}
        />
      </Group>

      {rowsByTimestamp[timestamp] ? (
        <TimestampDetail row={rowsByTimestamp[timestamp]} />
      ) : (
        <Text>No logs found for timestamp {formatNumber(timestamp)}</Text>
      )}
    </VisualizerCard>
  );
}
