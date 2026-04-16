import Highcharts from 'highcharts/highstock';
import HighchartsAccessibility from 'highcharts/modules/accessibility';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsOfflineExporting from 'highcharts/modules/offline-exporting';
import HighchartsHighContrastDarkTheme from 'highcharts/themes/high-contrast-dark';
import HighchartsReact from 'highcharts-react-official';
import merge from 'lodash/merge';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useActualColorScheme } from '../../hooks/use-actual-color-scheme.ts';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

HighchartsAccessibility(Highcharts);
HighchartsExporting(Highcharts);
HighchartsOfflineExporting(Highcharts);

// Highcharts themes are distributed as Highcharts extensions
// The normal way to use them is to apply these extensions to the global Highcharts object
// However, themes work by overriding the default options, with no way to rollback
// To make theme switching work, we merge theme options into the local chart options instead
// This way we don't override the global defaults and can change themes without refreshing
// This function is a little workaround to be able to get the options a theme overrides
function getThemeOptions(theme: (highcharts: typeof Highcharts) => void): Highcharts.Options {
  const highchartsMock = {
    _modules: {
      'Core/Globals.js': {
        theme: null,
      },
      'Core/Defaults.js': {
        setOptions: () => {
          // Do nothing
        },
      },
    },
    win: {
      dispatchEvent: () => {},
    },
  };

  theme(highchartsMock as any);

  return highchartsMock._modules['Core/Globals.js'].theme! as Highcharts.Options;
}

interface ChartProps {
  title: string;
  options?: Highcharts.Options;
  series: Highcharts.SeriesOptionsType[];
  min?: number;
  max?: number;
}

export function Chart({ title, options, series, min, max }: ChartProps): ReactNode {
  const colorScheme = useActualColorScheme();
  const algorithm = useStore(state => state.algorithm);
  const timestamp = useStore(state => state.timestamp);
  const viewCenter = useStore(state => state.viewCenter);
  const ticksWindow = useStore(state => state.ticksWindow);

  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const prevViewCenter = useRef(viewCenter);

  const fullOptions = useMemo((): Highcharts.Options => {
    const themeOptions = colorScheme === 'light' ? {} : getThemeOptions(HighchartsHighContrastDarkTheme);

    const chartOptions: Highcharts.Options = {
      chart: {
        animation: false,
        height: 400,
        zooming: {
          type: false as any,
          mouseWheel: {
            enabled: true,
            type: 'xy',
          },
        },
        panning: {
          enabled: true,
          type: 'xy',
        },
        numberFormatter: formatNumber,
        events: {
          load() {
            Highcharts.addEvent(this.tooltip, 'headerFormatter', (e: any) => {
              if (e.isFooter) {
                return true;
              }

              let currentTimestamp = e.labelConfig.point.x;

              if (e.labelConfig.point.dataGroup) {
                const xData = e.labelConfig.series.xData;
                const lastTimestamp = xData[xData.length - 1];
                if (currentTimestamp + 100 * e.labelConfig.point.dataGroup.length >= lastTimestamp) {
                  currentTimestamp = lastTimestamp;
                }
              }

              e.text = `Timestamp ${formatNumber(currentTimestamp)}<br/>`;
              return false;
            });
          },
        },
      },
      title: {
        text: title,
      },
      credits: {
        href: 'javascript:window.open("https://www.highcharts.com/?credits", "_blank")',
      },
      plotOptions: {
        series: {
          dataGrouping: {
            approximation(this: any, values: number[]): number {
              const endIndex = this.dataGroupInfo.start + this.dataGroupInfo.length;
              if (endIndex < this.xData.length) {
                return values[0];
              } else {
                return values[values.length - 1];
              }
            },
            anchor: 'start',
            firstAnchor: 'firstPoint',
            lastAnchor: 'lastPoint',
            units: [['second', [1, 2, 5, 10]]],
          },
        },
      },
      xAxis: {
        type: 'datetime',
        ordinal: false,
        title: {
          text: 'Timestamp',
        },
        crosshair: {
          width: 1,
        },
        labels: {
          formatter: params => formatNumber(params.value as number),
        },
      },
      yAxis: {
        opposite: false,
        allowDecimals: false,
        min,
        max,
      },
      tooltip: {
        split: false,
        shared: true,
        outside: true,
      },
      legend: {
        enabled: true,
      },
      rangeSelector: {
        enabled: false,
      },
      navigator: {
        enabled: false,
      },
      scrollbar: {
        enabled: false,
      },
      series,
      ...options,
    };

    return merge(themeOptions, chartOptions);
  }, [colorScheme, title, options, series, min, max]);

  useEffect(() => {
    let rafId: number;

    if (chartRef.current && chartRef.current.chart) {
      const chart = chartRef.current.chart;

      const timestampStep = algorithm && algorithm.data.length > 1 
        ? algorithm.data[1].state.timestamp - algorithm.data[0].state.timestamp 
        : 100;

      if (ticksWindow > 0) {
        chart.xAxis[0].setExtremes(
          viewCenter - ticksWindow * timestampStep,
          viewCenter + ticksWindow * timestampStep,
          false, // defer redraw
          false  // no animation
        );
      } else {
        chart.xAxis[0].setExtremes(undefined, undefined, false, false);
      }

      if (Math.abs(viewCenter - prevViewCenter.current) > timestampStep) {
        chart.yAxis.forEach(y => y.setExtremes(undefined, undefined, false, false));
      }
      prevViewCenter.current = viewCenter;

      chart.xAxis[0].removePlotLine('timestamp-line');
      chart.xAxis[0].addPlotLine({
        id: 'timestamp-line',
        value: timestamp,
        color: 'red',
        dashStyle: 'Dash',
        width: 2,
        zIndex: 5
      });

      rafId = requestAnimationFrame(() => chart.redraw());
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [timestamp, viewCenter, ticksWindow, algorithm]);

  const chartComponent = useMemo(() => {
    return <HighchartsReact ref={chartRef} highcharts={Highcharts} constructorType={'stockChart'} options={fullOptions} />;
  }, [fullOptions]);

  return (
    <VisualizerCard p={0}>
      {chartComponent}
    </VisualizerCard>
  );
}
